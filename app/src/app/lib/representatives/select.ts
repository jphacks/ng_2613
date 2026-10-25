// 設問カードに出す代表意見の選び方。
// 1. なるほど: 賛成側・反対側の両方から「なるほど」をもらっている意見を高くする
// 2. 観点: すでに選んだ意見と内容が似ているもの（同じ観点）は避ける（MMR）
// DB や外部 API には依存せず、渡された数値だけで選ぶ。

export type RepresentativeCandidate = {
  id: string;
  createdAt: string;
  // 賛成側（投票 4〜5）の人からのなるほど
  agreeReactions: number;
  // 反対側（投票 1〜2）の人からのなるほど
  disagreeReactions: number;
  // 文章の意味を表すベクトル。まだないときは null（似ているかの判定ができない）
  embedding: number[] | null;
};

export type SelectOptions = {
  count?: number;
  // 点数をどれだけ重視するか（1 に近いほど点数、0 に近いほど観点の違いを重視）
  scoreWeight?: number;
  // これ以上似ていたら同じ観点とみなして、ほかに候補があるうちは選ばない
  duplicateThreshold?: number;
};

// 合計に「少ないほうの側の数」を足す。片方の側からだけ5件より、両方から2件ずつのほうが高くなる
export function reactionScore(candidate: Pick<RepresentativeCandidate, "agreeReactions" | "disagreeReactions">) {
  const { agreeReactions: agree, disagreeReactions: disagree } = candidate;
  return agree + disagree + Math.min(agree, disagree);
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }
  return normA === 0 || normB === 0 ? 0 : dot / Math.sqrt(normA * normB);
}

// 選んだ意見のうち、一番似ているものとの類似度。ベクトルがなければ似ていないとみなす
function maxSimilarity(candidate: RepresentativeCandidate, selected: RepresentativeCandidate[]) {
  if (!candidate.embedding) return 0;
  return selected.reduce((max, item) => (
    item.embedding ? Math.max(max, cosineSimilarity(candidate.embedding!, item.embedding)) : max
  ), 0);
}

// 点数の高い順、同じなら新しい順
function byScoreThenNewest(a: RepresentativeCandidate, b: RepresentativeCandidate) {
  return reactionScore(b) - reactionScore(a) || b.createdAt.localeCompare(a.createdAt);
}

export function selectRepresentatives(candidates: RepresentativeCandidate[], options: SelectOptions = {}) {
  const { count = 3, scoreWeight = 0.7, duplicateThreshold = 0.9 } = options;
  const remaining = [...candidates].sort(byScoreThenNewest);
  const maxScore = Math.max(0, ...remaining.map(reactionScore));
  const selected: RepresentativeCandidate[] = [];

  while (selected.length < count && remaining.length > 0) {
    // 同じ観点とみなすほど似ているものは、ほかに候補があるうちは外す
    const distinct = remaining.filter((candidate) => maxSimilarity(candidate, selected) < duplicateThreshold);
    const pool = distinct.length > 0 ? distinct : remaining;
    let best = pool[0];
    let bestValue = -Infinity;
    for (const candidate of pool) {
      const score = maxScore === 0 ? 0 : reactionScore(candidate) / maxScore;
      const value = scoreWeight * score - (1 - scoreWeight) * maxSimilarity(candidate, selected);
      // 同じ値なら、並べ替え済みの順（点数→新しい順）で先のものを残す
      if (value > bestValue) {
        best = candidate;
        bestValue = value;
      }
    }
    selected.push(best);
    remaining.splice(remaining.indexOf(best), 1);
  }
  return selected.map((candidate) => candidate.id);
}
