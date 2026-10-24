#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const seedDirectory = path.resolve(scriptDirectory, "../seed");

function parseArguments(argumentsList) {
  const options = {
    target: "local",
    periodCode: undefined,
    createPeriod: false,
    periodStart: undefined,
    periodEnd: undefined,
    periodStatus: "active",
  };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    const nextValue = () => {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} の値がありません。`);
      }
      index += 1;
      return value;
    };

    switch (argument) {
      case "--target":
        options.target = nextValue();
        break;
      case "--period-code":
        options.periodCode = nextValue();
        break;
      case "--create-period":
        options.createPeriod = true;
        break;
      case "--period-start":
        options.periodStart = nextValue();
        break;
      case "--period-end":
        options.periodEnd = nextValue();
        break;
      case "--period-status":
        options.periodStatus = nextValue();
        break;
      case "--help":
        options.help = true;
        break;
      default:
        throw new Error(`不明な引数です: ${argument}`);
    }
  }

  return options;
}

function printUsage() {
  console.log(`使用方法:
  node supabase/scripts/seed-database.mjs --period-code <code>
  node supabase/scripts/seed-database.mjs --period-code <code> --create-period \\
    --period-start YYYY-MM-DD --period-end YYYY-MM-DD [--period-status active|closed]
  node supabase/scripts/seed-database.mjs --target remote --period-code <code>

環境変数:
  ローカル: SUPABASE_SERVICE_ROLE_KEY（SUPABASE_URL は省略時 http://127.0.0.1:54321）
  リモート: SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY
`);
}

function validateOptions(options) {
  if (!['local', 'remote'].includes(options.target)) {
    throw new Error("--target は local または remote を指定してください。");
  }
  if (!options.periodCode) {
    throw new Error("questions.json の登録先となる --period-code が必要です。");
  }
  if (!['active', 'closed'].includes(options.periodStatus)) {
    throw new Error("--period-status は active または closed を指定してください。");
  }

  if (options.createPeriod) {
    if (!options.periodStart || !options.periodEnd) {
      throw new Error("--create-period には --period-start と --period-end が必要です。");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(options.periodStart)
      || !/^\d{4}-\d{2}-\d{2}$/.test(options.periodEnd)
      || options.periodStart >= options.periodEnd) {
      throw new Error("期間は YYYY-MM-DD 形式で、開始日を終了日より前にしてください。");
    }
  } else if (options.periodStart || options.periodEnd) {
    throw new Error("期間の日付を指定する場合は --create-period も指定してください。");
  }
}

async function confirmRemote(url) {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("リモート投入は対話端末から実行し、明示的に確認する必要があります。");
  }

  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    console.log(`\n警告: リモートSupabase (${url}) にデータを投入します。`);
    const answer = await prompt.question("続行するには上記URLをそのまま入力してください: ");
    if (answer.trim() !== url) {
      throw new Error("確認内容が一致しないため、リモート投入を中止しました。");
    }
  } finally {
    prompt.close();
  }
}

function resolveDatabaseUrl(target) {
  if (target === "remote") {
    if (!process.env.SUPABASE_URL) {
      throw new Error("リモート投入には SUPABASE_URL が必要です。");
    }
    return process.env.SUPABASE_URL;
  }

  const localUrl = process.env.SUPABASE_LOCAL_URL ?? "http://127.0.0.1:54321";
  let parsedUrl;
  try {
    parsedUrl = new URL(localUrl);
  } catch {
    throw new Error("SUPABASE_LOCAL_URL が正しいURLではありません。");
  }
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsedUrl.hostname)) {
    throw new Error("ローカル投入先にはlocalhostまたはループバックアドレスだけを指定できます。");
  }
  return localUrl;
}

async function readJson(fileName) {
  const content = await readFile(path.join(seedDirectory, fileName), "utf8");
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`${fileName} をJSONとして解析できません: ${error.message}`);
  }
}

function assertNonEmptyString(value, location) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${location} は空でない文字列である必要があります。`);
  }
  return value.trim();
}

function stableUuid(key) {
  const bytes = createHash("sha256").update(`discussion-seed:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

class SupabaseRestClient {
  constructor(url, serviceRoleKey) {
    this.restUrl = `${url.replace(/\/$/, "")}/rest/v1`;
    this.headers = {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    };
  }

  async request(table, { method = "GET", filters = {}, body, select = "id" } = {}) {
    const url = new URL(`${this.restUrl}/${table}`);
    if (select) {
      url.searchParams.set("select", select);
    }
    for (const [column, value] of Object.entries(filters)) {
      url.searchParams.set(column, `eq.${value}`);
    }

    const requestHeaders = { ...this.headers };
    if (method === "POST") {
      requestHeaders.Prefer = "return=representation";
    }
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const responseText = await response.text();
    let responseBody = null;
    if (responseText) {
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        throw new Error(`${table}への${method}でJSON以外の応答を受信しました (${response.status})。`);
      }
    }

    if (!response.ok) {
      const detail = responseBody?.message ?? responseBody?.hint ?? response.statusText;
      throw new Error(`${table}への${method}が失敗しました (${response.status}): ${detail}`);
    }
    return responseBody;
  }

  async findRows(table, filters, select = "id") {
    return this.request(table, { filters, select });
  }

  async insertRow(table, row) {
    return this.request(table, { method: "POST", body: row, select: "*" });
  }
}

async function ensureRow(client, table, filters, row, stats) {
  const existingRows = await client.findRows(table, filters);
  if (existingRows.length > 1) {
    throw new Error(`${table} に同じ論理キーの行が複数あります: ${JSON.stringify(filters)}`);
  }
  if (existingRows.length === 1) {
    stats.existing += 1;
    return existingRows[0];
  }

  try {
    const insertedRows = await client.insertRow(table, row);
    stats.inserted += 1;
    return insertedRows[0];
  } catch (error) {
    // Deterministic primary keys make a concurrent identical seed safe. Re-read
    // the logical key before surfacing the insert error.
    const rowsAfterConflict = await client.findRows(table, filters);
    if (rowsAfterConflict.length === 1) {
      stats.existing += 1;
      return rowsAfterConflict[0];
    }
    throw error;
  }
}

function newStats(input = 0) {
  return { input, inserted: 0, existing: 0, skipped: 0 };
}

async function loadCategories(client, categories, report) {
  if (!Array.isArray(categories)) {
    throw new Error("categories.json のルートは配列である必要があります。");
  }

  report.genres.input = categories.length;
  for (const [genreIndex, rawGenre] of categories.entries()) {
    const genreName = assertNonEmptyString(rawGenre.name, `categories[${genreIndex}].name`);
    if (!Array.isArray(rawGenre.middle_topics)) {
      throw new Error(`categories[${genreIndex}].middle_topics は配列である必要があります。`);
    }
    const genre = await ensureRow(
      client,
      "genres",
      { name: genreName },
      { id: stableUuid(`genre:${genreName}`), name: genreName, sort_order: genreIndex + 1 },
      report.genres,
    );

    for (const [middleIndex, rawMiddleTopic] of rawGenre.middle_topics.entries()) {
      report.middleTopics.input += 1;
      const middleName = assertNonEmptyString(
        rawMiddleTopic.name,
        `categories[${genreIndex}].middle_topics[${middleIndex}].name`,
      );
      if (!Array.isArray(rawMiddleTopic.topics)) {
        throw new Error(`middle topic ${middleName} の topics は配列である必要があります。`);
      }
      const middleTopic = await ensureRow(
        client,
        "middle_topics",
        { genre_id: genre.id, name: middleName },
        {
          id: stableUuid(`middle-topic:${genreName}:${middleName}`),
          genre_id: genre.id,
          name: middleName,
          sort_order: middleIndex + 1,
        },
        report.middleTopics,
      );

      for (const [topicIndex, rawTopic] of rawMiddleTopic.topics.entries()) {
        report.topics.input += 1;
        const topicName = assertNonEmptyString(
          rawTopic,
          `categories[${genreIndex}].middle_topics[${middleIndex}].topics[${topicIndex}]`,
        );
        await ensureRow(
          client,
          "topics",
          { middle_topic_id: middleTopic.id, name: topicName },
          {
            id: stableUuid(`topic:${genreName}:${middleName}:${topicName}`),
            middle_topic_id: middleTopic.id,
            name: topicName,
            sort_order: topicIndex + 1,
          },
          report.topics,
        );
      }
    }
  }
}

async function resolvePeriod(client, options, report) {
  const periods = await client.findRows(
    "periods",
    { code: options.periodCode },
    "id,code,start_date,end_date,status",
  );
  if (periods.length > 1) {
    throw new Error(`期間コード ${options.periodCode} が重複しています。`);
  }
  if (periods.length === 1) {
    report.periods.input = 1;
    report.periods.existing = 1;
    return periods[0];
  }
  if (!options.createPeriod) {
    throw new Error(
      `期間 ${options.periodCode} が存在しません。既存の期間を指定するか、明示的な日付と --create-period を指定してください。`,
    );
  }

  report.periods.input = 1;
  return ensureRow(
    client,
    "periods",
    { code: options.periodCode },
    {
      id: stableUuid(`period:${options.periodCode}`),
      code: options.periodCode,
      start_date: options.periodStart,
      end_date: options.periodEnd,
      status: options.periodStatus,
    },
    report.periods,
  );
}

async function findTopic(client, genreName, middleName, topicName) {
  const genres = await client.findRows("genres", { name: genreName });
  if (genres.length !== 1) return null;
  const middleTopics = await client.findRows(
    "middle_topics",
    { genre_id: genres[0].id, name: middleName },
  );
  if (middleTopics.length !== 1) return null;
  const topics = await client.findRows(
    "topics",
    { middle_topic_id: middleTopics[0].id, name: topicName },
  );
  return topics.length === 1 ? topics[0] : null;
}

async function loadQuestions(client, questions, period, report) {
  if (!Array.isArray(questions)) {
    throw new Error("questions.json のルートは配列である必要があります。");
  }
  report.frames.input = questions.length;
  const orderByTopic = new Map();

  for (const [index, rawQuestion] of questions.entries()) {
    const genreName = assertNonEmptyString(rawQuestion.genre, `questions[${index}].genre`);
    const middleName = assertNonEmptyString(rawQuestion.middle_topic, `questions[${index}].middle_topic`);
    const topicName = assertNonEmptyString(rawQuestion.topic, `questions[${index}].topic`);
    const question = assertNonEmptyString(rawQuestion.question, `questions[${index}].question`);
    const topic = await findTopic(client, genreName, middleName, topicName);
    if (!topic) {
      throw new Error(`questions[${index}] の分類先が見つかりません: ${genreName} / ${middleName} / ${topicName}`);
    }
    const topicOrder = (orderByTopic.get(topic.id) ?? 0) + 1;
    orderByTopic.set(topic.id, topicOrder);
    await ensureRow(
      client,
      "frames",
      { topic_id: topic.id, period_id: period.id, type: "question", question },
      {
        id: stableUuid(`frame:${period.code}:${genreName}:${middleName}:${topicName}:${question}`),
        topic_id: topic.id,
        period_id: period.id,
        type: "question",
        question,
        sort_order: topicOrder,
      },
      report.frames,
    );
  }
}

async function loadGlossary(client, entries, report) {
  if (!Array.isArray(entries)) {
    throw new Error("glossary.json のルートは配列である必要があります。");
  }
  report.glossary.input = entries.length;
  for (const [index, entry] of entries.entries()) {
    const term = assertNonEmptyString(entry.term, `glossary[${index}].term`);
    const definition = assertNonEmptyString(entry.description, `glossary[${index}].description`);
    await ensureRow(
      client,
      "glossary",
      { term },
      { id: stableUuid(`glossary:${term}`), term, definition },
      report.glossary,
    );
  }
  report.unsupported.push(`glossary.json: category は格納先カラムがないため ${entries.length} 件すべてで未登録`);
}

async function loadModerationRules(client, moderationData, report) {
  if (!moderationData || !Array.isArray(moderationData.rules)) {
    throw new Error("moderation-rules.json.rules は配列である必要があります。");
  }
  report.bannedWords.input = moderationData.rules.length;
  for (const [index, rule] of moderationData.rules.entries()) {
    if (rule.level !== "block" || rule.match_type !== "word") {
      report.bannedWords.skipped += 1;
      continue;
    }
    const word = assertNonEmptyString(rule.pattern, `moderation-rules.rules[${index}].pattern`);
    await ensureRow(
      client,
      "banned_words",
      { word },
      { id: stableUuid(`banned-word:${word}`), word },
      report.bannedWords,
    );
  }

  report.unsupported.push(
    `moderation-rules.json: level/category/match_type/suggestion/note の格納先がないため、block + word の ${report.bannedWords.inserted + report.bannedWords.existing} 件だけを banned_words.word に登録`,
  );
  report.unsupported.push(
    `moderation-rules.json: warn または context の ${report.bannedWords.skipped} 件、allowlist_examples ${moderationData.allowlist_examples?.length ?? 0} 件、normalization_notes ${moderationData.normalization_notes?.length ?? 0} 件は未登録`,
  );
}

function reportTopicLinks(topicLinks, report) {
  if (!Array.isArray(topicLinks)) {
    throw new Error("topic-links.json のルートは配列である必要があります。");
  }
  report.topicLinks.input = topicLinks.length;
  report.topicLinks.skipped = topicLinks.length;
  report.unsupported.push(
    `topic-links.json: topics と表示用分類を関連付けるテーブルが既存migrationにないため ${topicLinks.length} 件すべて未登録`,
  );
}

function printReport(report) {
  console.log("\n投入結果");
  console.table(Object.entries(report)
    .filter(([, value]) => value && typeof value === "object" && "inserted" in value)
    .map(([name, value]) => ({ dataset: name, ...value })));

  console.log("\n現行スキーマで表現できない項目");
  for (const message of report.unsupported) {
    console.log(`- ${message}`);
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }
  validateOptions(options);

  const url = resolveDatabaseUrl(options.target);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY が設定されていません。");
  }
  if (options.target === "remote") {
    await confirmRemote(url);
  }

  const [categories, questions, glossary, moderationRules, topicLinks] = await Promise.all([
    readJson("categories.json"),
    readJson("questions.json"),
    readJson("glossary.json"),
    readJson("moderation-rules.json"),
    readJson("topic-links.json"),
  ]);
  const report = {
    genres: newStats(),
    middleTopics: newStats(),
    topics: newStats(),
    periods: newStats(),
    frames: newStats(),
    glossary: newStats(),
    bannedWords: newStats(),
    topicLinks: newStats(),
    unsupported: [],
  };
  const client = new SupabaseRestClient(url, serviceRoleKey);

  console.log(`投入先: ${options.target} (${url})`);
  await loadCategories(client, categories, report);
  const period = await resolvePeriod(client, options, report);
  await loadQuestions(client, questions, period, report);
  await loadGlossary(client, glossary, report);
  await loadModerationRules(client, moderationRules, report);
  reportTopicLinks(topicLinks, report);
  printReport(report);
}

main().catch((error) => {
  console.error(`\nエラー: ${error.message}`);
  process.exitCode = 1;
});
