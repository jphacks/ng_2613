#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const supabaseDirectory = path.resolve(scriptDirectory, "..");
const seedDirectory = path.join(supabaseDirectory, "seed");
const migrationsDirectory = path.join(supabaseDirectory, "migrations");

const seedNamespace = "jphacks-2026-political-discussions-v1";
const disclosurePrefix = "【AI生成・架空サンプル】";
const sampleEmailDomain = "example.invalid";
const banDuration = "876000h";
const minimumBanYears = 90;
const pageSize = 1000;
const rowBatchSize = 200;

const sourceFiles = {
  sampleUsers: "sample_users.json",
  sampleStances: "sample_stances.json",
  sampleDiscussions: "sample_discussions.json",
  categories: "categories.json",
  questions: "questions.json",
};

const migrationFiles = [
  "20261024000000_create_discussion_schema.sql",
  "20261024010000_add_thread_reactions.sql",
  "20261024020000_change_votes_to_five_point_scale.sql",
  "20261024030000_add_reaction_vote_snapshot_and_aggregation.sql",
  "20261024040000_allow_unvoted_thread_reactions.sql",
  "20261024050000_grant_seed_permissions_to_service_role.sql",
];

function parseArguments(argumentsList) {
  const options = {
    apply: false,
    checkDb: false,
    periodCode: undefined,
    help: false,
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
      case "--dry-run":
        break;
      case "--check-db":
        options.checkDb = true;
        break;
      case "--apply":
        options.apply = true;
        options.checkDb = true;
        break;
      case "--period-code":
        options.periodCode = nextValue();
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
  # DBへ接続しない静的dry-run（既定）
  node supabase/scripts/seed-sample-discussions.mjs --dry-run

  # ローカルDBを読み取るdry-run
  node supabase/scripts/seed-sample-discussions.mjs --dry-run --check-db --period-code <code>

  # ローカルDBへの投入（Phase 3でのみ使用）
  node supabase/scripts/seed-sample-discussions.mjs --apply --period-code <code>

環境変数（--check-db / --apply のみ）:
  SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_LOCAL_URL（省略時 http://127.0.0.1:54321）

安全仕様:
  --apply を明示しない限り書き込みません。
  接続先はlocalhostまたはループバックアドレスだけを許可します。
`);
}

function validateOptions(options) {
  if (options.checkDb && !options.periodCode) {
    throw new Error("DB確認には --period-code が必要です。");
  }
  if (!options.checkDb && options.periodCode) {
    throw new Error("--period-code は --check-db または --apply と一緒に指定してください。");
  }
}

function resolveLocalUrl() {
  const rawUrl = process.env.SUPABASE_LOCAL_URL ?? "http://127.0.0.1:54321";
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error("SUPABASE_LOCAL_URL が正しいURLではありません。");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("ローカルSupabase URLはhttpまたはhttpsで指定してください。");
  }
  if (!["127.0.0.1", "localhost", "::1"].includes(parsedUrl.hostname)) {
    throw new Error("本番誤接続防止のため、localhostまたはループバックアドレス以外は使用できません。");
  }
  if (parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash) {
    throw new Error("SUPABASE_LOCAL_URLに認証情報・クエリ・フラグメントを含めないでください。");
  }
  return parsedUrl.toString().replace(/\/$/, "");
}

function assertObject(value, location) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${location} はオブジェクトである必要があります。`);
  }
  return value;
}

function assertArray(value, location) {
  if (!Array.isArray(value)) {
    throw new Error(`${location} は配列である必要があります。`);
  }
  return value;
}

function assertNonEmptyString(value, location) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${location} は空でない文字列である必要があります。`);
  }
  return value.trim();
}

function assertNullableStance(value, location) {
  if (value !== null && !["agree", "disagree"].includes(value)) {
    throw new Error(`${location} は agree、disagree、null のいずれかである必要があります。`);
  }
  return value;
}

function assertUnique(values, location) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`${location} が重複しています: ${value}`);
    }
    seen.add(value);
  }
}

function questionKey(question) {
  return [question.genre, question.middle_topic, question.topic, question.question].join("\u241f");
}

function stableUuid(key) {
  const bytes = createHash("sha256").update(`${seedNamespace}:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sampleEmail(sampleUserId) {
  return `${sampleUserId}@${sampleEmailDomain}`;
}

function databaseGender(gender) {
  if (gender === "ノンバイナリー") return "その他";
  if (gender === "回答しない") return null;
  return gender;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function readJsonWithHash(directory, fileName) {
  const filePath = path.join(directory, fileName);
  const bytes = await readFile(filePath);
  let data;
  try {
    data = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`${fileName} をJSONとして解析できません: ${error.message}`);
  }
  return { data, hash: sha256(bytes), filePath };
}

function findRecordedHash(sources, fileName, location) {
  const source = assertArray(sources, location).find((entry) => {
    const recordedName = entry.file ?? entry.file_name;
    return recordedName === fileName || recordedName === fileName.replace(".json", "(1).json");
  });
  if (!source) {
    throw new Error(`${location} に ${fileName} の記録がありません。`);
  }
  return assertNonEmptyString(source.sha256, `${location}.${fileName}.sha256`);
}

function assertRecordedHash(sources, fileName, actualHash, location) {
  const recordedHash = findRecordedHash(sources, fileName, location);
  if (recordedHash !== actualHash) {
    throw new Error(`${location} の ${fileName} SHA-256が一致しません。`);
  }
}

function validateCategories(categories, questions) {
  const categoryKeys = new Set();
  for (const [genreIndex, genre] of assertArray(categories, "categories.json").entries()) {
    const genreName = assertNonEmptyString(genre.name, `categories[${genreIndex}].name`);
    for (const [middleIndex, middle] of assertArray(
      genre.middle_topics,
      `categories[${genreIndex}].middle_topics`,
    ).entries()) {
      const middleName = assertNonEmptyString(
        middle.name,
        `categories[${genreIndex}].middle_topics[${middleIndex}].name`,
      );
      for (const [topicIndex, topicValue] of assertArray(
        middle.topics,
        `categories[${genreIndex}].middle_topics[${middleIndex}].topics`,
      ).entries()) {
        const topicName = assertNonEmptyString(
          topicValue,
          `categories[${genreIndex}].middle_topics[${middleIndex}].topics[${topicIndex}]`,
        );
        const key = `${genreName}\u241f${middleName}\u241f${topicName}`;
        if (categoryKeys.has(key)) {
          throw new Error(`categories.json の分類が重複しています: ${key}`);
        }
        categoryKeys.add(key);
      }
    }
  }

  for (const question of questions) {
    const key = `${question.genre}\u241f${question.middle_topic}\u241f${question.topic}`;
    if (!categoryKeys.has(key)) {
      throw new Error(`questions.json の分類先が存在しません: ${key}`);
    }
  }
}

function validateStaticData(data) {
  const sampleUsers = assertArray(data.sampleUsers.users, "sample_users.json.users");
  if (sampleUsers.length !== 10) {
    throw new Error(`サンプルユーザーは10人必要です（実数: ${sampleUsers.length}）。`);
  }
  const sampleUserIds = sampleUsers.map((user, index) =>
    assertNonEmptyString(user.sample_user_id, `sample_users.users[${index}].sample_user_id`));
  assertUnique(sampleUserIds, "sample_user_id");
  const sampleUserIdSet = new Set(sampleUserIds);

  for (const [index, user] of sampleUsers.entries()) {
    const profile = assertObject(user.db_profile, `sample_users.users[${index}].db_profile`);
    assertNonEmptyString(profile.username, `sample_users.users[${index}].db_profile.username`);
    assertNonEmptyString(profile.birth_date, `sample_users.users[${index}].db_profile.birth_date`);
    assertNonEmptyString(profile.gender, `sample_users.users[${index}].db_profile.gender`);
  }
  assertUnique(sampleUsers.map((user) => user.db_profile.username), "username");

  const questions = assertArray(data.questions, "questions.json");
  if (questions.length !== 168) {
    throw new Error(`質問数は168件必要です（実数: ${questions.length}）。`);
  }
  for (const [index, question] of questions.entries()) {
    for (const field of ["genre", "middle_topic", "topic", "question"]) {
      assertNonEmptyString(question[field], `questions[${index}].${field}`);
    }
  }
  const questionKeys = questions.map(questionKey);
  assertUnique(questionKeys, "questions.json の質問");
  const questionKeySet = new Set(questionKeys);
  validateCategories(data.categories, questions);

  const stanceQuestions = assertArray(data.sampleStances.questions, "sample_stances.json.questions");
  if (stanceQuestions.length !== questions.length) {
    throw new Error("sample_stances.json の質問数が questions.json と一致しません。");
  }
  const stanceQuestionIds = stanceQuestions.map((question, index) =>
    assertNonEmptyString(question.question_id, `sample_stances.questions[${index}].question_id`));
  assertUnique(stanceQuestionIds, "sample_stances.question_id");
  assertUnique(stanceQuestions.map(questionKey), "sample_stances.json の質問");
  const stanceQuestionIdSet = new Set(stanceQuestionIds);
  for (const stanceQuestion of stanceQuestions) {
    if (!questionKeySet.has(questionKey(stanceQuestion))) {
      throw new Error(`sample_stances.json に未知の質問があります: ${stanceQuestion.question_id}`);
    }
  }

  const stances = assertArray(data.sampleStances.stances, "sample_stances.json.stances");
  if (stances.length !== questions.length * sampleUsers.length) {
    throw new Error(`政策判断は${questions.length * sampleUsers.length}件必要です（実数: ${stances.length}）。`);
  }
  const stancePairs = [];
  for (const [index, stance] of stances.entries()) {
    if (!stanceQuestionIdSet.has(stance.question_id)) {
      throw new Error(`sample_stances.stances[${index}] が未知の質問を参照しています。`);
    }
    if (!sampleUserIdSet.has(stance.sample_user_id)) {
      throw new Error(`sample_stances.stances[${index}] が未知のユーザーを参照しています。`);
    }
    if (!Number.isInteger(stance.stance_value) || stance.stance_value < 1 || stance.stance_value > 5) {
      throw new Error(`sample_stances.stances[${index}].stance_value が1〜5ではありません。`);
    }
    stancePairs.push(`${stance.question_id}\u241f${stance.sample_user_id}`);
  }
  assertUnique(stancePairs, "政策判断の質問・ユーザー組合せ");

  const discussionAuthors = assertArray(
    data.sampleDiscussions.authors,
    "sample_discussions.json.authors",
  ).map((author, index) =>
    assertNonEmptyString(author.sample_user_id, `sample_discussions.authors[${index}].sample_user_id`));
  assertUnique(discussionAuthors, "sample_discussions.authors.sample_user_id");
  if (discussionAuthors.length !== sampleUserIds.length
    || discussionAuthors.some((author) => !sampleUserIdSet.has(author))) {
    throw new Error("sample_discussions.json.authors が sample_users.json と一致しません。");
  }

  const discussionQuestions = assertArray(
    data.sampleDiscussions.questions,
    "sample_discussions.json.questions",
  );
  if (discussionQuestions.length !== questions.length) {
    throw new Error("sample_discussions.json の質問数が questions.json と一致しません。");
  }
  assertUnique(
    discussionQuestions.map((question) => question.question_id),
    "sample_discussions.question_id",
  );
  assertUnique(
    discussionQuestions.map(questionKey),
    "sample_discussions.json の質問",
  );

  const threadIds = [];
  const commentIds = [];
  const threads = [];
  const comments = [];
  const semanticBlockers = [];

  for (const [questionIndex, discussionQuestion] of discussionQuestions.entries()) {
    if (!questionKeySet.has(questionKey(discussionQuestion))) {
      throw new Error(`sample_discussions.questions[${questionIndex}] に未知の質問があります。`);
    }
    if (!stanceQuestionIdSet.has(discussionQuestion.question_id)) {
      throw new Error(`sample_discussions.questions[${questionIndex}] のquestion_idが未知です。`);
    }
    const questionThreads = assertArray(
      discussionQuestion.threads,
      `sample_discussions.questions[${questionIndex}].threads`,
    );
    if (questionThreads.length !== 3) {
      throw new Error(`${discussionQuestion.question_id} のスレッド数が3件ではありません。`);
    }

    for (const [threadIndex, thread] of questionThreads.entries()) {
      const threadLocation = `sample_discussions.questions[${questionIndex}].threads[${threadIndex}]`;
      const sampleThreadId = assertNonEmptyString(thread.sample_thread_id, `${threadLocation}.sample_thread_id`);
      const author = assertNonEmptyString(thread.author, `${threadLocation}.author`);
      if (!sampleUserIdSet.has(author)) {
        throw new Error(`${threadLocation} が未知のユーザーを参照しています。`);
      }
      if (thread.type !== "user") {
        throw new Error(`${threadLocation}.type は user である必要があります。`);
      }
      if (!["agree", "disagree"].includes(thread.stance)) {
        throw new Error(`${threadLocation}.stance は agree または disagree である必要があります。`);
      }
      if (thread.video_id !== null) {
        throw new Error(`${threadLocation}.video_id は null である必要があります。`);
      }
      assertNonEmptyString(thread.title, `${threadLocation}.title`);
      const body = assertNonEmptyString(thread.body, `${threadLocation}.body`);
      if (!body.startsWith(disclosurePrefix)) {
        throw new Error(`${threadLocation}.body にAI生成表示がありません。`);
      }
      threadIds.push(sampleThreadId);
      threads.push({ discussionQuestion, thread });

      const sourceStanceValue = thread.generation_only?.source_stance_value;
      const importStatus = thread.generation_only?.import_status;
      const explicitlyUndecided = /賛否はまだ保留|判断を保留|まだ賛否は決めていません/.test(body);
      if (importStatus === "requires_stance_semantics_review"
        || (sourceStanceValue === 3 && explicitlyUndecided)) {
        semanticBlockers.push({
          questionId: discussionQuestion.question_id,
          question: discussionQuestion.question,
          sampleThreadId,
          author,
          stance: thread.stance,
          sourceStanceValue,
          reason: "本文が明確に賛否を保留しており、二値stanceを投稿者の賛否として解釈できません。",
        });
      }

      const threadComments = assertArray(thread.comments, `${threadLocation}.comments`);
      if (threadComments.length !== 3) {
        throw new Error(`${sampleThreadId} のコメント数が3件ではありません。`);
      }
      for (const [commentIndex, comment] of threadComments.entries()) {
        const commentLocation = `${threadLocation}.comments[${commentIndex}]`;
        const sampleCommentId = assertNonEmptyString(
          comment.sample_comment_id,
          `${commentLocation}.sample_comment_id`,
        );
        if (comment.thread_ref !== sampleThreadId) {
          throw new Error(`${commentLocation}.thread_ref が親スレッドと一致しません。`);
        }
        if (!sampleUserIdSet.has(comment.author)) {
          throw new Error(`${commentLocation} が未知のユーザーを参照しています。`);
        }
        assertNullableStance(comment.stance, `${commentLocation}.stance`);
        const commentBody = assertNonEmptyString(comment.body, `${commentLocation}.body`);
        if (!commentBody.startsWith(disclosurePrefix)) {
          throw new Error(`${commentLocation}.body にAI生成表示がありません。`);
        }
        commentIds.push(sampleCommentId);
        comments.push({ discussionQuestion, thread, comment });
      }
    }
  }

  assertUnique(threadIds, "sample_thread_id");
  assertUnique(commentIds, "sample_comment_id");
  if (threads.length !== 504 || comments.length !== 1512) {
    throw new Error(`投稿件数が想定と異なります（threads=${threads.length}, comments=${comments.length}）。`);
  }

  return {
    sampleUsers,
    sampleUserIds,
    questions,
    discussionQuestions,
    threads,
    comments,
    semanticBlockers,
  };
}

async function loadAndValidateFiles() {
  const [sampleUsersFile, sampleStancesFile, sampleDiscussionsFile, categoriesFile, questionsFile]
    = await Promise.all([
      readJsonWithHash(seedDirectory, sourceFiles.sampleUsers),
      readJsonWithHash(seedDirectory, sourceFiles.sampleStances),
      readJsonWithHash(seedDirectory, sourceFiles.sampleDiscussions),
      readJsonWithHash(seedDirectory, sourceFiles.categories),
      readJsonWithHash(seedDirectory, sourceFiles.questions),
    ]);

  assertRecordedHash(
    sampleStancesFile.data.sources,
    sourceFiles.sampleUsers,
    sampleUsersFile.hash,
    "sample_stances.json.sources",
  );
  assertRecordedHash(
    sampleStancesFile.data.sources,
    sourceFiles.categories,
    categoriesFile.hash,
    "sample_stances.json.sources",
  );
  assertRecordedHash(
    sampleStancesFile.data.sources,
    sourceFiles.questions,
    questionsFile.hash,
    "sample_stances.json.sources",
  );

  const discussionSources = sampleDiscussionsFile.data.sources;
  assertRecordedHash(
    discussionSources,
    sourceFiles.sampleUsers,
    sampleUsersFile.hash,
    "sample_discussions.json.sources",
  );
  assertRecordedHash(
    discussionSources,
    sourceFiles.sampleStances,
    sampleStancesFile.hash,
    "sample_discussions.json.sources",
  );
  assertRecordedHash(
    discussionSources,
    sourceFiles.categories,
    categoriesFile.hash,
    "sample_discussions.json.sources",
  );
  assertRecordedHash(
    discussionSources,
    sourceFiles.questions,
    questionsFile.hash,
    "sample_discussions.json.sources",
  );

  for (const [index, migrationFile] of migrationFiles.entries()) {
    const migrationBytes = await readFile(path.join(migrationsDirectory, migrationFile));
    const recordedSource = discussionSources.find((source) =>
      source.file_name === `${String(index + 1).padStart(2, "0")}-${migrationFile}`);
    if (!recordedSource || recordedSource.sha256 !== sha256(migrationBytes)) {
      throw new Error(`sample_discussions.json.sources の ${migrationFile} SHA-256が一致しません。`);
    }
  }

  const data = {
    sampleUsers: sampleUsersFile.data,
    sampleStances: sampleStancesFile.data,
    sampleDiscussions: sampleDiscussionsFile.data,
    categories: categoriesFile.data,
    questions: questionsFile.data,
  };
  const validated = validateStaticData(data);
  return {
    ...validated,
    hashes: {
      sampleUsers: sampleUsersFile.hash,
      sampleStances: sampleStancesFile.hash,
      sampleDiscussions: sampleDiscussionsFile.hash,
      categories: categoriesFile.hash,
      questions: questionsFile.hash,
    },
  };
}

class ApiClient {
  constructor(baseUrl, serviceRoleKey) {
    this.baseUrl = baseUrl;
    this.headers = {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    };
  }

  async request(url, options = {}) {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: { ...this.headers, ...(options.headers ?? {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const responseText = await response.text();
    let responseBody = null;
    if (responseText) {
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        throw new Error(`APIがJSON以外を返しました (${response.status})。`);
      }
    }
    if (!response.ok) {
      const detail = responseBody?.message
        ?? responseBody?.msg
        ?? responseBody?.error_description
        ?? responseBody?.hint
        ?? response.statusText;
      throw new Error(`APIリクエストが失敗しました (${response.status}): ${detail}`);
    }
    return { body: responseBody, headers: response.headers };
  }

  async listUsers() {
    const users = [];
    for (let page = 1; ; page += 1) {
      const url = new URL(`${this.baseUrl}/auth/v1/admin/users`);
      url.searchParams.set("page", String(page));
      url.searchParams.set("per_page", String(pageSize));
      const response = await this.request(url);
      const pageUsers = response.body?.users;
      if (!Array.isArray(pageUsers)) {
        throw new Error("Auth Admin APIのユーザー一覧形式が想定と異なります。");
      }
      users.push(...pageUsers);
      if (pageUsers.length < pageSize) break;
    }
    return users;
  }

  async createUser(attributes) {
    const response = await this.request(`${this.baseUrl}/auth/v1/admin/users`, {
      method: "POST",
      body: attributes,
    });
    return response.body?.user ?? response.body;
  }

  async updateUser(userId, attributes) {
    const response = await this.request(`${this.baseUrl}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      body: attributes,
    });
    return response.body?.user ?? response.body;
  }

  async select(table, select, filters = {}) {
    const url = new URL(`${this.baseUrl}/rest/v1/${table}`);
    url.searchParams.set("select", select);
    for (const [column, filter] of Object.entries(filters)) {
      url.searchParams.set(column, filter);
    }
    const response = await this.request(url);
    if (!Array.isArray(response.body)) {
      throw new Error(`${table} の応答が配列ではありません。`);
    }
    return response.body;
  }

  async insert(table, rows) {
    if (rows.length === 0) return [];
    const url = new URL(`${this.baseUrl}/rest/v1/${table}`);
    url.searchParams.set("select", "*");
    const response = await this.request(url, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: rows,
    });
    return response.body;
  }

  async update(table, filters, values) {
    const url = new URL(`${this.baseUrl}/rest/v1/${table}`);
    url.searchParams.set("select", "*");
    for (const [column, filter] of Object.entries(filters)) {
      url.searchParams.set(column, filter);
    }
    const response = await this.request(url, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: values,
    });
    return response.body;
  }
}

function isSampleAuthUser(user, sampleUserId) {
  return user.app_metadata?.sample_seed_namespace === seedNamespace
    && user.app_metadata?.sample_user_id === sampleUserId;
}

function assertSecureSampleAuthUser(user, sampleUserId) {
  if (!isSampleAuthUser(user, sampleUserId)) {
    throw new Error(`${sampleUserId} のAuth app_metadataが一致しません。`);
  }
  if (user.email !== sampleEmail(sampleUserId)) {
    throw new Error(`${sampleUserId} のAuthメール識別子が想定と異なります。`);
  }
  if (user.last_sign_in_at) {
    throw new Error(`${sampleUserId} にはサインイン履歴があるため、安全上再利用できません。`);
  }
  if (typeof user.id !== "string" || user.id === "") {
    throw new Error(`${sampleUserId} のAuth UUIDが取得できません。`);
  }
}

function hasLongBan(user) {
  if (!user.banned_until) return false;
  const bannedUntil = Date.parse(user.banned_until);
  if (!Number.isFinite(bannedUntil)) return false;
  const minimum = Date.now() + minimumBanYears * 365.25 * 24 * 60 * 60 * 1000;
  return bannedUntil >= minimum;
}

function indexSampleAuthUsers(allUsers, expectedSampleUserIds) {
  const expectedSet = new Set(expectedSampleUserIds);
  const bySampleId = new Map();
  const byEmail = new Map(allUsers.map((user) => [user.email, user]));

  for (const user of allUsers) {
    if (user.app_metadata?.sample_seed_namespace !== seedNamespace) continue;
    const sampleUserId = user.app_metadata?.sample_user_id;
    if (typeof sampleUserId !== "string" || !expectedSet.has(sampleUserId)) {
      throw new Error("seed名前空間内に未知のサンプルAuthユーザーがあります。自動変更せず停止します。");
    }
    if (bySampleId.has(sampleUserId)) {
      throw new Error(`${sampleUserId} に対応するAuthユーザーが複数あります。`);
    }
    bySampleId.set(sampleUserId, user);
  }

  for (const sampleUserId of expectedSampleUserIds) {
    const emailOwner = byEmail.get(sampleEmail(sampleUserId));
    if (emailOwner && !isSampleAuthUser(emailOwner, sampleUserId)) {
      throw new Error(`${sampleUserId} 用の予約メール識別子が別ユーザーに使われています。`);
    }
  }
  return bySampleId;
}

function chunk(values, size = rowBatchSize) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function selectByIds(client, table, select, ids) {
  const rows = [];
  for (const idChunk of chunk(ids)) {
    rows.push(...await client.select(table, select, { id: `in.(${idChunk.join(",")})` }));
  }
  return rows;
}

async function resolveFrames(client, periodCode, discussionQuestions) {
  const [periods, genres, middleTopics, topics] = await Promise.all([
    client.select("periods", "id,code", { code: `eq.${periodCode}` }),
    client.select("genres", "id,name"),
    client.select("middle_topics", "id,genre_id,name"),
    client.select("topics", "id,middle_topic_id,name"),
  ]);
  if (periods.length !== 1) {
    throw new Error(`期間 ${periodCode} は1件である必要があります（実数: ${periods.length}）。`);
  }
  const period = periods[0];
  const frames = await client.select(
    "frames",
    "id,topic_id,period_id,type,question",
    { period_id: `eq.${period.id}`, type: "eq.question" },
  );
  const frameByQuestionId = new Map();

  for (const question of discussionQuestions) {
    const genreCandidates = genres.filter((genre) => genre.name === question.genre);
    if (genreCandidates.length !== 1) {
      throw new Error(`${question.question_id}: genre候補が${genreCandidates.length}件です。`);
    }
    const middleCandidates = middleTopics.filter((middle) =>
      middle.genre_id === genreCandidates[0].id && middle.name === question.middle_topic);
    if (middleCandidates.length !== 1) {
      throw new Error(`${question.question_id}: middle_topic候補が${middleCandidates.length}件です。`);
    }
    const topicCandidates = topics.filter((topic) =>
      topic.middle_topic_id === middleCandidates[0].id && topic.name === question.topic);
    if (topicCandidates.length !== 1) {
      throw new Error(`${question.question_id}: topic候補が${topicCandidates.length}件です。`);
    }
    const frameCandidates = frames.filter((frame) =>
      frame.topic_id === topicCandidates[0].id && frame.question === question.question);
    if (frameCandidates.length !== 1) {
      throw new Error(`${question.question_id}: frame候補が${frameCandidates.length}件です。`);
    }
    frameByQuestionId.set(question.question_id, frameCandidates[0].id);
  }
  return frameByQuestionId;
}

function expectedProfile(sampleUser, authUserId) {
  return {
    id: authUserId,
    username: sampleUser.db_profile.username,
    birth_date: sampleUser.db_profile.birth_date,
    gender: databaseGender(sampleUser.db_profile.gender),
  };
}

function expectedThreadRow(entry, userIdBySampleId, frameByQuestionId) {
  return {
    id: stableUuid(`thread:${entry.thread.sample_thread_id}`),
    frame_id: frameByQuestionId.get(entry.discussionQuestion.question_id),
    type: entry.thread.type,
    user_id: userIdBySampleId.get(entry.thread.author),
    stance: entry.thread.stance,
    title: entry.thread.title,
    body: entry.thread.body,
    video_id: null,
  };
}

function expectedCommentRow(entry, userIdBySampleId) {
  return {
    id: stableUuid(`comment:${entry.comment.sample_comment_id}`),
    thread_id: stableUuid(`thread:${entry.comment.thread_ref}`),
    user_id: userIdBySampleId.get(entry.comment.author),
    stance: entry.comment.stance,
    body: entry.comment.body,
  };
}

function rowDifferences(actual, expected, fields) {
  return fields.filter((field) => actual[field] !== expected[field]);
}

function compareRows(actualRows, expectedRows, fields, table) {
  const actualById = new Map(actualRows.map((row) => [row.id, row]));
  const missing = [];
  const existing = [];
  const conflicts = [];
  for (const expected of expectedRows) {
    const actual = actualById.get(expected.id);
    if (!actual) {
      missing.push(expected);
      continue;
    }
    const differences = rowDifferences(actual, expected, fields);
    if (differences.length > 0) {
      conflicts.push({ table, id: expected.id, differences });
    } else {
      existing.push(expected);
    }
  }
  return { missing, existing, conflicts };
}

async function inspectDatabase(client, validated) {
  const allAuthUsers = await client.listUsers();
  const authBySampleId = indexSampleAuthUsers(allAuthUsers, validated.sampleUserIds);
  const userIdBySampleId = new Map();
  const authToCreate = [];
  const authToReban = [];
  for (const sampleUser of validated.sampleUsers) {
    const sampleUserId = sampleUser.sample_user_id;
    const authUser = authBySampleId.get(sampleUserId);
    if (!authUser) {
      authToCreate.push(sampleUser);
      continue;
    }
    assertSecureSampleAuthUser(authUser, sampleUserId);
    if (!hasLongBan(authUser)) authToReban.push(authUser);
    userIdBySampleId.set(sampleUserId, authUser.id);
  }
  return { allAuthUsers, authBySampleId, userIdBySampleId, authToCreate, authToReban };
}

async function createMissingAuthUsers(client, authState) {
  for (const sampleUser of authState.authToCreate) {
    const sampleUserId = sampleUser.sample_user_id;
    const created = await client.createUser({
      email: sampleEmail(sampleUserId),
      email_confirm: false,
      ban_duration: banDuration,
      app_metadata: {
        sample_seed_namespace: seedNamespace,
        sample_user_id: sampleUserId,
        is_sample: true,
      },
      user_metadata: { username: sampleUser.db_profile.username },
    });
    assertSecureSampleAuthUser(created, sampleUserId);
    if (!hasLongBan(created)) {
      throw new Error(`${sampleUserId} の長期BANを確認できません。`);
    }
    authState.userIdBySampleId.set(sampleUserId, created.id);
  }

  for (const authUser of authState.authToReban) {
    const updated = await client.updateUser(authUser.id, { ban_duration: banDuration });
    assertSecureSampleAuthUser(updated, authUser.app_metadata.sample_user_id);
    if (!hasLongBan(updated)) {
      throw new Error(`${authUser.app_metadata.sample_user_id} の長期BAN更新を確認できません。`);
    }
  }
}

async function inspectProfiles(client, sampleUsers, userIdBySampleId) {
  const expected = sampleUsers
    .filter((sampleUser) => userIdBySampleId.has(sampleUser.sample_user_id))
    .map((sampleUser) => expectedProfile(sampleUser, userIdBySampleId.get(sampleUser.sample_user_id)));
  const actual = expected.length === 0
    ? []
    : await selectByIds(client, "users", "id,username,birth_date,gender,role,deleted_at", expected.map((row) => row.id));
  const actualById = new Map(actual.map((row) => [row.id, row]));
  const missing = [];
  const matching = [];
  const update = [];
  for (const expectedRow of expected) {
    const actualRow = actualById.get(expectedRow.id);
    if (!actualRow) {
      missing.push(expectedRow);
      continue;
    }
    if (actualRow.role !== "user" || actualRow.deleted_at !== null) {
      throw new Error(`public.users ${actualRow.id} は通常の有効sample profileではありません。`);
    }
    const differences = rowDifferences(actualRow, expectedRow, ["username", "birth_date", "gender"]);
    if (differences.length === 0) matching.push(expectedRow);
    else update.push({ expected: expectedRow, differences });
  }
  return { expected, missing, matching, update };
}

async function ensureProfiles(client, profileState) {
  if (profileState.missing.length > 0) {
    await client.insert("users", profileState.missing);
  }
  for (const item of profileState.update) {
    const updated = await client.update(
      "users",
      { id: `eq.${item.expected.id}` },
      {
        username: item.expected.username,
        birth_date: item.expected.birth_date,
        gender: item.expected.gender,
      },
    );
    if (!Array.isArray(updated) || updated.length !== 1) {
      throw new Error(`public.users ${item.expected.id} の更新結果を確認できません。`);
    }
  }
}

async function inspectPosts(client, validated, frameByQuestionId, userIdBySampleId) {
  const missingAuthors = validated.sampleUserIds.filter((id) => !userIdBySampleId.has(id));
  const expectedThreadIds = validated.threads.map((entry) => stableUuid(`thread:${entry.thread.sample_thread_id}`));
  const expectedCommentIds = validated.comments.map((entry) => stableUuid(`comment:${entry.comment.sample_comment_id}`));
  const [actualThreads, actualComments] = await Promise.all([
    selectByIds(
      client,
      "threads",
      "id,frame_id,type,user_id,stance,title,body,video_id",
      expectedThreadIds,
    ),
    selectByIds(client, "comments", "id,thread_id,user_id,stance,body", expectedCommentIds),
  ]);

  if (missingAuthors.length > 0 && (actualThreads.length > 0 || actualComments.length > 0)) {
    throw new Error("対応するSample Authユーザーがない状態で決定的投稿UUIDが使用されています。");
  }
  if (missingAuthors.length > 0) {
    return {
      deferred: true,
      threadState: { missing: [], existing: [], conflicts: [] },
      commentState: { missing: [], existing: [], conflicts: [] },
    };
  }

  const expectedThreads = validated.threads.map((entry) =>
    expectedThreadRow(entry, userIdBySampleId, frameByQuestionId));
  const expectedComments = validated.comments.map((entry) =>
    expectedCommentRow(entry, userIdBySampleId));
  return {
    deferred: false,
    threadState: compareRows(
      actualThreads,
      expectedThreads,
      ["frame_id", "type", "user_id", "stance", "title", "body", "video_id"],
      "threads",
    ),
    commentState: compareRows(
      actualComments,
      expectedComments,
      ["thread_id", "user_id", "stance", "body"],
      "comments",
    ),
  };
}

function assertNoPostConflicts(postState) {
  const conflicts = [...postState.threadState.conflicts, ...postState.commentState.conflicts];
  if (conflicts.length > 0) {
    const first = conflicts[0];
    throw new Error(`${first.table} ${first.id} に異なるデータがあります: ${first.differences.join(", ")}`);
  }
}

async function insertPosts(client, threadState, commentState) {
  for (const rows of chunk(threadState.missing, 50)) {
    await client.insert("threads", rows);
  }
  for (const rows of chunk(commentState.missing, 100)) {
    await client.insert("comments", rows);
  }
}

function printStaticReport(validated) {
  console.log("\n静的dry-run");
  console.table([
    { dataset: "users", count: validated.sampleUsers.length },
    { dataset: "questions", count: validated.questions.length },
    { dataset: "threads", count: validated.threads.length },
    { dataset: "comments", count: validated.comments.length },
    { dataset: "semantic_blockers", count: validated.semanticBlockers.length },
  ]);
  console.log("\nSHA-256（ファイル全体のバイト列）");
  for (const [name, hash] of Object.entries(validated.hashes)) {
    console.log(`- ${name}: ${hash}`);
  }
  if (validated.semanticBlockers.length > 0) {
    console.log("\n自動投入を停止する意味上の不整合");
    for (const blocker of validated.semanticBlockers) {
      console.log(`- ${blocker.sampleThreadId}: ${blocker.reason}`);
    }
  }
}

function printDatabaseReport(authState, profileState, postState) {
  console.log("\nローカルDB dry-run");
  console.table([
    { item: "Auth既存", count: authState.userIdBySampleId.size },
    { item: "Auth作成予定", count: authState.authToCreate.length },
    { item: "Auth BAN更新予定", count: authState.authToReban.length },
    { item: "profile既存一致", count: profileState.matching.length },
    { item: "profile作成予定", count: profileState.missing.length + authState.authToCreate.length },
    { item: "profile更新予定", count: profileState.update.length },
    { item: "threads既存一致", count: postState.threadState.existing.length },
    { item: "threads登録予定", count: postState.deferred ? 504 : postState.threadState.missing.length },
    { item: "comments既存一致", count: postState.commentState.existing.length },
    { item: "comments登録予定", count: postState.deferred ? 1512 : postState.commentState.missing.length },
  ]);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }
  validateOptions(options);

  const validated = await loadAndValidateFiles();
  printStaticReport(validated);

  if (!options.checkDb) {
    console.log("\nDB未接続: frames、権限、既存データとの重複は未確認です。");
    console.log(validated.semanticBlockers.length > 0 ? "判定: BLOCKED" : "判定: STATIC READY");
    return;
  }

  if (options.apply && validated.semanticBlockers.length > 0) {
    throw new Error("意味上の不整合が残っているため、DBへ接続せず書き込みを中止しました。データの承認または修正が必要です。");
  }

  const localUrl = resolveLocalUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY が設定されていません。");
  }
  console.log(`\n接続先（ローカル限定）: ${localUrl}`);
  const client = new ApiClient(localUrl, serviceRoleKey);
  const frameByQuestionId = await resolveFrames(client, options.periodCode, validated.discussionQuestions);
  const authState = await inspectDatabase(client, validated);
  const profileState = await inspectProfiles(client, validated.sampleUsers, authState.userIdBySampleId);
  const postState = await inspectPosts(client, validated, frameByQuestionId, authState.userIdBySampleId);
  assertNoPostConflicts(postState);
  printDatabaseReport(authState, profileState, postState);

  if (!options.apply) {
    console.log(validated.semanticBlockers.length > 0 ? "判定: BLOCKED" : "判定: DB READY");
    return;
  }
  await createMissingAuthUsers(client, authState);
  const completeProfileState = await inspectProfiles(
    client,
    validated.sampleUsers,
    authState.userIdBySampleId,
  );
  await ensureProfiles(client, completeProfileState);

  const finalPostState = await inspectPosts(
    client,
    validated,
    frameByQuestionId,
    authState.userIdBySampleId,
  );
  assertNoPostConflicts(finalPostState);
  await insertPosts(client, finalPostState.threadState, finalPostState.commentState);

  console.log("\n投入完了");
  console.table([
    { item: "Auth作成", count: authState.authToCreate.length },
    { item: "threads登録", count: finalPostState.threadState.missing.length },
    { item: "comments登録", count: finalPostState.commentState.missing.length },
  ]);
}

main().catch((error) => {
  console.error(`\nエラー: ${error.message}`);
  process.exitCode = 1;
});
