// 意見の文章を Gemini で意味のベクトルにする。代表意見の「観点が重ならないか」の判定に使う。
// 1件の意見につき一度だけ作って保存し、表示のたびには呼ばない前提。
const defaultModel = "gemini-embedding-001";
// 保存するベクトルの長さ。短くして保存量と計算を抑える（公式が勧める値のうち一番小さいもの）
export const embeddingDimensions = 768;
// 1回のリクエストでまとめて送る件数の上限
const batchSize = 100;
const timeoutMs = 20_000;
// 長い本文は先頭だけを使う
const textLength = 1000;

export class EmbeddingError extends Error {
  readonly kind: "not_configured" | "busy" | "unknown";

  constructor(kind: "not_configured" | "busy" | "unknown", message: string) {
    super(message);
    this.kind = kind;
  }
}

export function embeddingModel() {
  return process.env.GEMINI_EMBEDDING_MODEL || defaultModel;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// 意見のタイトルと本文から、比べるための文章を作る
export function embeddingText(thread: { title: string; body: string }) {
  return `${thread.title}\n${thread.body}`.slice(0, textLength);
}

async function embedBatch(texts: string[], apiKey: string, model: string) {
  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:batchEmbedContents`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${model}`,
          content: { parts: [{ text }] },
          taskType: "SEMANTIC_SIMILARITY",
          outputDimensionality: embeddingDimensions,
        })),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new EmbeddingError("unknown", "埋め込みAPIに接続できませんでした。");
  }
  if (response.status === 429) throw new EmbeddingError("busy", "埋め込みAPIが混み合っています。");
  if (!response.ok) {
    // キーや内部の情報は返さず、状態コードだけをサーバーのログに残す
    console.error(`Gemini embedding API error: ${response.status}`);
    throw new EmbeddingError("unknown", "埋め込みを作れませんでした。");
  }
  const body: unknown = await response.json().catch(() => null);
  const embeddings = isRecord(body) && Array.isArray(body.embeddings) ? body.embeddings : [];
  const vectors = embeddings.map((item) => (
    isRecord(item) && Array.isArray(item.values) && item.values.every((value) => typeof value === "number")
      ? item.values as number[]
      : null
  ));
  if (vectors.length !== texts.length || vectors.some((vector) => vector === null)) {
    throw new EmbeddingError("unknown", "埋め込みの結果を読み取れませんでした。");
  }
  return vectors as number[][];
}

// 渡した順に、同じ数のベクトルを返す
export async function embedTexts(texts: string[]) {
  if (texts.length === 0) return [];
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new EmbeddingError("not_configured", "埋め込みAPIの設定がまだ完了していません。");
  const model = embeddingModel();
  const vectors: number[][] = [];
  for (let start = 0; start < texts.length; start += batchSize) {
    vectors.push(...await embedBatch(texts.slice(start, start + batchSize), apiKey, model));
  }
  return vectors;
}
