"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Catalog, CatalogTopic, TopicDetail } from "../lib/catalog/types";
import type { DailyTheme } from "../lib/daily-theme/types";
import { getPostAuthScreen } from "../lib/auth/auth-flow";
import { screens, type Screen } from "../lib/demo-data";
import type { FrameVoteDemographics, FrameVoteState, VoteValue } from "../lib/votes/types";
import type { PostStance, ThreadDetail, ThreadSummary } from "../lib/threads/types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";
export type DataStatus = "idle" | "loading" | "success" | "empty" | "unauthenticated" | "error";
// unavailable は DB に集計関数がまだ反映されていない状態
export type DemographicsState =
  | { status: "loading" | "unavailable" | "error" }
  | { status: "success"; data: FrameVoteDemographics };
type AccountProfile = {
  id: string;
  email: string;
  username: string;
  gender: string;
  year: string;
  birthDate: string;
  complete: boolean;
};
type ApiErrorBody = { error?: { code?: string; message?: string; fields?: Record<string, string> } };
type Selection = {
  genreId: string | null;
  middleTopicId: string | null;
  topicId: string | null;
  frameId: string | null;
  threadId: string | null;
};
export type SearchResult = CatalogTopic & {
  genreId: string;
  genreName: string;
  middleTopicId: string;
  middleTopicName: string;
};

class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function requestApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;
    const fieldMessage = errorBody?.error?.fields
      ? Object.values(errorBody.error.fields)[0]
      : undefined;
    throw new ApiRequestError(
      fieldMessage ?? errorBody?.error?.message ?? "通信に失敗しました。",
      response.status,
      errorBody?.error?.code,
    );
  }
  if (!body || typeof body !== "object" || !("data" in body)) {
    throw new ApiRequestError("サーバーから正しい応答を受信できませんでした。", 500);
  }
  return (body as { data: T }).data;
}

function parseLocationHash(): { screen: Screen; selection: Selection } {
  const [screenValue, query = ""] = window.location.hash.slice(1).split("?");
  const screen = screens.includes(screenValue as Screen) ? (screenValue as Screen) : "home";
  const params = new URLSearchParams(query);
  return {
    screen,
    selection: {
      genreId: params.get("genreId"),
      middleTopicId: params.get("middleTopicId"),
      topicId: params.get("topicId"),
      frameId: params.get("frameId"),
      threadId: params.get("threadId"),
    },
  };
}

function createHash(screen: Screen, selection: Selection) {
  const params = new URLSearchParams();
  if (selection.genreId) params.set("genreId", selection.genreId);
  if (selection.middleTopicId) params.set("middleTopicId", selection.middleTopicId);
  if (selection.topicId) params.set("topicId", selection.topicId);
  if (selection.frameId) params.set("frameId", selection.frameId);
  if (selection.threadId) params.set("threadId", selection.threadId);
  const query = params.toString();
  return `${screen}${query ? `?${query}` : ""}`;
}

export function useDiscussionState() {
  const [screen, setScreen] = useState<Screen>("home");
  const [selection, setSelection] = useState<Selection>({
    genreId: null,
    middleTopicId: null,
    topicId: null,
    frameId: null,
    threadId: null,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  // トップのタブ。「今日のテーマ」は別のコンテンツ（未実装）で、今ある分類はすべて「カテゴリー」に入る
  const [homeTab, setHomeTab] = useState<"today" | "category">("category");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [profile, setProfile] = useState<AccountProfile>({
    id: "",
    email: "",
    username: "",
    gender: "",
    year: "",
    birthDate: "",
    complete: false,
  });
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogStatus, setCatalogStatus] = useState<DataStatus>("idle");
  const [catalogError, setCatalogError] = useState("");
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [dailyTheme, setDailyTheme] = useState<DailyTheme | null>(null);
  const [dailyThemeStatus, setDailyThemeStatus] = useState<DataStatus>("idle");
  const [dailyThemeError, setDailyThemeError] = useState("");
  const [dailyThemeAttempt, setDailyThemeAttempt] = useState(0);
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null);
  const [topicStatus, setTopicStatus] = useState<DataStatus>("idle");
  const [topicError, setTopicError] = useState("");
  const [topicAttempt, setTopicAttempt] = useState(0);
  const [voteSubmittingFrameId, setVoteSubmittingFrameId] = useState<string | null>(null);
  const [voteErrors, setVoteErrors] = useState<Record<string, string>>({});
  const [demographics, setDemographics] = useState<Record<string, DemographicsState>>({});
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [threadsStatus, setThreadsStatus] = useState<DataStatus>("idle");
  const [threadsError, setThreadsError] = useState("");
  const [threadsAttempt, setThreadsAttempt] = useState(0);
  const [frameThreads, setFrameThreads] = useState<Record<string, ThreadSummary[]>>({});
  const [threadDetail, setThreadDetail] = useState<ThreadDetail | null>(null);
  const [threadDetailStatus, setThreadDetailStatus] = useState<DataStatus>("idle");
  const [threadDetailError, setThreadDetailError] = useState("");
  const [threadDetailAttempt, setThreadDetailAttempt] = useState(0);
  const [threadSubmitting, setThreadSubmitting] = useState(false);
  const [threadSubmitError, setThreadSubmitError] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentSubmitError, setCommentSubmitError] = useState("");

  useEffect(() => {
    const syncScreen = () => {
      const next = parseLocationHash();
      const url = new URL(window.location.href);
      const authError = url.searchParams.get("auth_error");
      setScreen(next.screen);
      setSelection(next.selection);
      setTopicDetail(null);
      setTopicStatus(next.selection.topicId ? "loading" : "idle");
      setTopicError("");
      setThreadsStatus(next.selection.frameId ? "loading" : "idle");
      setThreadsError("");
      setThreadDetail(null);
      setThreadDetailStatus(next.selection.threadId ? "loading" : "idle");
      setThreadDetailError("");
      // 取得の useEffect は id が変わったときだけ走る。
      // 同じ設問のまま画面が切り替わると id は変わらないため、
      // 上で loading に戻しただけでは取得されず読み込み中のまま止まる。
      // loading にするときは必ず取得も走らせる。
      setTopicAttempt((attempt) => attempt + 1);
      setThreadsAttempt((attempt) => attempt + 1);
      setThreadDetailAttempt((attempt) => attempt + 1);
      setMenuOpen(false);
      setAccountError(authError === "confirmation_failed"
        ? "認証リンクが無効または期限切れです。もう一度ログインしてください。"
        : "");
      if (authError) {
        url.searchParams.delete("auth_error");
        window.history.replaceState(
          window.history.state,
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
      }
    };
    syncScreen();
    window.addEventListener("hashchange", syncScreen);
    return () => window.removeEventListener("hashchange", syncScreen);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const session = await requestApi<{ authenticated: boolean }>("/api/auth/session");
        if (!active) return;
        if (!session.authenticated) {
          setAuthStatus("unauthenticated");
          if (window.location.hash.slice(1).startsWith("profile")) {
            window.location.hash = "login";
            setNotice("会員情報を確認するにはログインしてください。");
          }
          return;
        }

        setAuthStatus("authenticated");
        const loadedProfile = await requestApi<AccountProfile>("/api/profile");
        if (active) {
          setProfile(loadedProfile);
          if (!loadedProfile.complete) window.location.hash = "profile";
        }
      } catch (error) {
        if (!active) return;
        setAuthStatus("unauthenticated");
        setAccountError(error instanceof Error ? error.message : "ログイン状態を確認できませんでした。");
      }
    }

    void loadSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus === "unauthenticated") return;

    const controller = new AbortController();
    requestApi<Catalog>("/api/catalog", { signal: controller.signal })
      .then((result) => {
        setCatalog(result);
        setCatalogStatus(result.genres.length === 0 ? "empty" : "success");
        if (result.genres[0]) {
          setSelection((current) => current.genreId
            ? current
            : { ...current, genreId: result.genres[0].id });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiRequestError && error.status === 401) {
          setCatalogStatus("unauthenticated");
          return;
        }
        setCatalogStatus("error");
        setCatalogError(error instanceof Error ? error.message : "分類データを取得できませんでした。");
      });

    return () => controller.abort();
  }, [authStatus, catalogAttempt]);

  useEffect(() => {
    if (screen !== "daily-theme") return;
    if (authStatus === "loading") return;
    if (authStatus === "unauthenticated") {
      setDailyThemeStatus("unauthenticated");
      return;
    }

    const controller = new AbortController();
    setDailyThemeStatus("loading");
    setDailyThemeError("");
    requestApi<DailyTheme>("/api/daily-theme", { signal: controller.signal })
      .then((result) => {
        setDailyTheme(result);
        setDailyThemeStatus("success");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setDailyTheme(null);
        if (error instanceof ApiRequestError && error.status === 404) {
          setDailyThemeStatus("empty");
          return;
        }
        if (error instanceof ApiRequestError && error.status === 401) {
          setDailyThemeStatus("unauthenticated");
          return;
        }
        setDailyThemeStatus("error");
        setDailyThemeError(error instanceof Error ? error.message : "今日のテーマを取得できませんでした。");
      });

    return () => controller.abort();
  }, [authStatus, dailyThemeAttempt, screen]);

  useEffect(() => {
    if (!selection.topicId) return;
    if (authStatus === "loading") return;
    if (authStatus === "unauthenticated") return;

    const controller = new AbortController();
    requestApi<TopicDetail>(`/api/topics/${encodeURIComponent(selection.topicId)}`, {
      signal: controller.signal,
    })
      .then((result) => {
        setTopicDetail(result);
        setTopicStatus(result.periods.some((period) => period.frames.length > 0) ? "success" : "empty");
        setSelection((current) => ({
          ...current,
          genreId: result.middleTopic.genre.id,
          middleTopicId: result.middleTopic.id,
        }));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiRequestError && error.status === 401) {
          setTopicStatus("unauthenticated");
          return;
        }
        setTopicDetail(null);
        setTopicStatus("error");
        setTopicError(error instanceof Error ? error.message : "トピックを取得できませんでした。");
      });

    return () => controller.abort();
  }, [authStatus, selection.topicId, topicAttempt]);

  useEffect(() => {
    if (!selection.frameId || authStatus !== "authenticated") return;
    const controller = new AbortController();
    requestApi<ThreadSummary[]>(`/api/frames/${encodeURIComponent(selection.frameId)}/threads`, {
      signal: controller.signal,
    }).then((result) => {
      setThreads(result);
      setThreadsStatus(result.length > 0 ? "success" : "empty");
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setThreadsStatus(error instanceof ApiRequestError && error.status === 401 ? "unauthenticated" : "error");
      setThreadsError(error instanceof Error ? error.message : "スレッドを取得できませんでした。");
    });
    return () => controller.abort();
  }, [authStatus, selection.frameId, threadsAttempt]);

  // 設問カードの賛成・反対の意見一覧に使う。カードごとに設問が違うため、
  // トピック内の全設問ぶんのスレッドをまとめて取得する。
  const topicFrameIds = topicDetail?.periods
    .flatMap((period) => period.frames.map((frame) => frame.id))
    .join(",") ?? "";

  useEffect(() => {
    if (!topicFrameIds || authStatus !== "authenticated") return;
    const controller = new AbortController();
    Promise.all(topicFrameIds.split(",").map((frameId) =>
      requestApi<ThreadSummary[]>(`/api/frames/${encodeURIComponent(frameId)}/threads`, {
        signal: controller.signal,
      }).then((result) => [frameId, result] as const),
    )).then((entries) => {
      setFrameThreads(Object.fromEntries(entries));
    }).catch(() => {
      // カードの補助表示なので、取得できなくても画面は出す。
    });
    return () => controller.abort();
  }, [authStatus, topicFrameIds, threadsAttempt]);

  useEffect(() => {
    if (!selection.threadId || authStatus !== "authenticated") return;
    const controller = new AbortController();
    requestApi<ThreadDetail>(`/api/threads/${encodeURIComponent(selection.threadId)}`, {
      signal: controller.signal,
    }).then((result) => {
      setThreadDetail(result);
      setThreadDetailStatus("success");
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setThreadDetailStatus(error instanceof ApiRequestError && error.status === 401 ? "unauthenticated" : "error");
      setThreadDetailError(error instanceof Error ? error.message : "スレッドを取得できませんでした。");
    });
    return () => controller.abort();
  }, [authStatus, selection.threadId, threadDetailAttempt]);

  const genres = useMemo(() => catalog?.genres ?? [], [catalog]);
  const selectedGenre = genres.find((genre) => genre.id === selection.genreId) ?? genres[0] ?? null;
  const allMiddleTopics = genres.flatMap((genre) => genre.middleTopics);
  const selectedMiddleTopic =
    allMiddleTopics.find((middleTopic) => middleTopic.id === selection.middleTopicId) ?? null;
  const selectedFrame =
    topicDetail?.periods
      .flatMap((period) => period.frames)
      .find((frame) => frame.id === selection.frameId) ?? null;
  const selectedFrameNumber = selectedFrame && topicDetail
    ? topicDetail.periods.flatMap((period) => period.frames).indexOf(selectedFrame) + 1
    : 1;

  const searchResults = useMemo<SearchResult[]>(() => {
    const query = search.trim().toLocaleLowerCase("ja");
    if (!query) return [];

    return genres
      .flatMap((genre) =>
        genre.middleTopics.flatMap((middleTopic) =>
          middleTopic.topics.map((topic) => ({
            ...topic,
            genreId: genre.id,
            genreName: genre.name,
            middleTopicId: middleTopic.id,
            middleTopicName: middleTopic.name,
          })),
        ),
      )
      .filter((topic) =>
        `${topic.genreName} ${topic.middleTopicName} ${topic.name}`
          .toLocaleLowerCase("ja")
          .includes(query),
      )
      .slice(0, 20);
  }, [genres, search]);

  function setHash(nextScreen: Screen, nextSelection: Selection) {
    const nextHash = createHash(nextScreen, nextSelection);
    if (window.location.hash.slice(1) === nextHash) {
      setScreen(nextScreen);
      setSelection(nextSelection);
    } else {
      window.location.hash = nextHash;
    }
    setMenuOpen(false);
    setNotice("");
    setAccountError("");
    window.scrollTo(0, 0);
  }

  function navigate(next: Screen) {
    if (next === "home") setHomeTab("category");
    setHash(next, selection);
  }

  function selectGenre(genreId: string) {
    setSearch("");
    setHash("home", { genreId, middleTopicId: null, topicId: null, frameId: null, threadId: null });
  }

  function selectMiddleTopic(middleTopicId: string) {
    const parent = genres.find((genre) =>
      genre.middleTopics.some((middleTopic) => middleTopic.id === middleTopicId),
    );
    setSearch("");
    setHash("topics", {
      genreId: parent?.id ?? selection.genreId,
      middleTopicId,
      topicId: null,
      frameId: null,
      threadId: null,
    });
  }

  function selectTopic(topicId: string) {
    let genreId = selection.genreId;
    let middleTopicId = selection.middleTopicId;
    for (const genre of genres) {
      const middleTopic = genre.middleTopics.find((item) =>
        item.topics.some((topic) => topic.id === topicId),
      );
      if (middleTopic) {
        genreId = genre.id;
        middleTopicId = middleTopic.id;
        break;
      }
    }
    setSearch("");
    setTopicDetail(null);
    setTopicStatus("loading");
    setTopicError("");
    // 今いるトピックをもう一度選んだときは topicId もアドレスも変わらず、取得が走らないまま
    // 読み込み中で止まる。loading にするときは必ず取得も走らせる。
    setTopicAttempt((attempt) => attempt + 1);
    setHash("summary", { genreId, middleTopicId, topicId, frameId: null, threadId: null });
  }

  function selectFrame(frameId: string) {
    setHash("discussion", { ...selection, frameId, threadId: null });
  }

  function openDailyThemeDiscussion() {
    if (!dailyTheme) return;
    setTopicDetail(null);
    setTopicStatus("loading");
    setTopicError("");
    setHash("discussion", {
      genreId: dailyTheme.frame.genreId,
      middleTopicId: dailyTheme.frame.middleTopicId,
      topicId: dailyTheme.frame.topicId,
      frameId: dailyTheme.frame.id,
      threadId: null,
    });
  }

  function selectThread(threadId: string, frameId = selection.frameId) {
    setHash("thread", { ...selection, frameId, threadId });
  }

  async function createDiscussionThread(input: { title: string; body: string; stance: PostStance }) {
    if (!selection.frameId || threadSubmitting) return false;
    setThreadSubmitting(true);
    setThreadSubmitError("");
    try {
      const created = await requestApi<{ id: string }>(
        `/api/frames/${encodeURIComponent(selection.frameId)}/threads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      setThreadsAttempt((attempt) => attempt + 1);
      selectThread(created.id);
      return true;
    } catch (error) {
      setThreadSubmitError(error instanceof Error ? error.message : "スレッドを作成できませんでした。");
      return false;
    } finally {
      setThreadSubmitting(false);
    }
  }

  async function submitComment(input: { body: string; stance: PostStance | null }) {
    if (!selection.threadId || commentSubmitting) return false;
    setCommentSubmitting(true);
    setCommentSubmitError("");
    try {
      await requestApi<{ id: string }>(
        `/api/threads/${encodeURIComponent(selection.threadId)}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      setThreadDetailAttempt((attempt) => attempt + 1);
      return true;
    } catch (error) {
      setCommentSubmitError(error instanceof Error ? error.message : "コメントを投稿できませんでした。");
      return false;
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function submitVote(frameId: string, value: VoteValue) {
    if (voteSubmittingFrameId) return false;
    setVoteSubmittingFrameId(frameId);
    setVoteErrors((current) => ({ ...current, [frameId]: "" }));
    try {
      const voteState = await requestApi<FrameVoteState>(
        `/api/frames/${encodeURIComponent(frameId)}/vote`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        },
      );
      setTopicDetail((current) => current ? {
        ...current,
        periods: current.periods.map((period) => ({
          ...period,
          frames: period.frames.map((frame) =>
            frame.id === frameId ? { ...frame, vote: voteState } : frame,
          ),
        })),
      } : current);
      // 内訳が変わるので、次に開いたときに取り直す
      setDemographics((current) => {
        const next = { ...current };
        delete next[frameId];
        return next;
      });
      setDailyTheme((current) => current && current.frame.id === frameId ? {
        ...current,
        frame: { ...current.frame, vote: voteState },
      } : current);
      return true;
    } catch (error) {
      setVoteErrors((current) => ({
        ...current,
        [frameId]: error instanceof Error ? error.message : "投票に失敗しました。",
      }));
      return false;
    } finally {
      setVoteSubmittingFrameId(null);
    }
  }

  // 「もっと見る」を開いたときだけ取りに行く。設問カードが多くても一度に取りに行かないため。
  async function loadDemographics(frameId: string) {
    if (demographics[frameId]) return;
    setDemographics((current) => ({ ...current, [frameId]: { status: "loading" } }));
    try {
      const data = await requestApi<FrameVoteDemographics>(
        `/api/frames/${encodeURIComponent(frameId)}/demographics`,
      );
      setDemographics((current) => ({ ...current, [frameId]: { status: "success", data } }));
    } catch (error) {
      const status = error instanceof ApiRequestError && error.code === "DEMOGRAPHICS_UNAVAILABLE"
        ? "unavailable" as const
        : "error" as const;
      setDemographics((current) => ({ ...current, [frameId]: { status } }));
    }
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountSubmitting(true);
    setAccountError("");
    const formData = new FormData(event.currentTarget);

    try {
      if (screen === "profile") {
        const updatedProfile = await requestApi<AccountProfile>("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: String(formData.get("username") ?? ""),
            gender: String(formData.get("gender") ?? ""),
            birthDate: String(formData.get("birthDate") ?? ""),
          }),
        });
        setProfile(updatedProfile);
        setNotice("会員情報を更新しました。");
        if (!profile.complete && updatedProfile.complete) {
          setHash("home", { genreId: null, middleTopicId: null, topicId: null, frameId: null, threadId: null });
        }
        return;
      }

      const email = String(formData.get("email") ?? "");
      const password = String(formData.get("password") ?? "");
      const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");
      if (screen === "register" && password !== passwordConfirmation) {
        setAccountError("パスワードが一致しません。");
        return;
      }

      const result = await requestApi<{ authenticated: true; profile: AccountProfile }>(
        screen === "register" ? "/api/auth/sign-up" : "/api/auth/sign-in",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            ...(screen === "register" ? { passwordConfirmation } : {}),
          }),
        },
      );
      setProfile(result.profile);
      setAuthStatus("authenticated");
      // 登録直後のユーザー名は仮の名前なので、登録時だけは会員情報変更へ案内する。
      setHash(screen === "register" ? "profile" : getPostAuthScreen(result.profile), {
        genreId: null, middleTopicId: null, topicId: null, frameId: null, threadId: null,
      });
      setNotice(screen === "register"
        ? "登録しました。プロフィールを設定してください。"
        : result.profile.complete ? "ログインしました。" : "プロフィールを設定してください。");
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "処理に失敗しました。");
    } finally {
      setAccountSubmitting(false);
    }
  }

  async function signOut() {
    setAccountSubmitting(true);
    setAccountError("");
    try {
      await requestApi<{ authenticated: false }>("/api/auth/sign-out", { method: "POST" });
      setAuthStatus("unauthenticated");
      setProfile({ id: "", email: "", username: "", gender: "", year: "", birthDate: "", complete: false });
      setHash("home", { genreId: null, middleTopicId: null, topicId: null, frameId: null, threadId: null });
      setNotice("ログアウトしました。");
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "ログアウトに失敗しました。");
    } finally {
      setAccountSubmitting(false);
    }
  }

  const accountScreen = screen === "login" || screen === "register" || screen === "profile";

  return {
    screen, menuOpen, setMenuOpen, homeTab, setHomeTab, search, setSearch, notice, setNotice, profile, navigate, submitAccount,
    accountScreen, authStatus, accountSubmitting, accountError, signOut, genres,
    dailyTheme, dailyThemeStatus, dailyThemeError, openDailyThemeDiscussion,
    selectedGenre, selectedMiddleTopic, topicDetail, selectedFrame, selectedFrameNumber, frameThreads,
    catalogStatus: authStatus === "unauthenticated"
      ? "unauthenticated" as const
      : catalogStatus === "idle" ? "loading" as const : catalogStatus,
    catalogError,
    topicStatus: authStatus === "unauthenticated" && selection.topicId
      ? "unauthenticated" as const
      : topicStatus,
    topicError, searchResults, selectGenre, selectMiddleTopic, selectTopic, selectFrame,
    voteSubmittingFrameId, voteErrors, submitVote, demographics, loadDemographics,
    threads,
    threadsStatus: authStatus === "unauthenticated" && selection.frameId ? "unauthenticated" as const : threadsStatus,
    threadsError, threadDetail,
    threadDetailStatus: authStatus === "unauthenticated" && selection.threadId
      ? "unauthenticated" as const
      : threadDetailStatus,
    threadDetailError, threadSubmitting, threadSubmitError, commentSubmitting, commentSubmitError,
    selectThread, createDiscussionThread, submitComment,
    retryCatalog: () => {
      setCatalogStatus("loading");
      setCatalogError("");
      setCatalogAttempt((attempt) => attempt + 1);
    },
    retryDailyTheme: () => {
      setDailyThemeStatus("loading");
      setDailyThemeError("");
      setDailyThemeAttempt((attempt) => attempt + 1);
    },
    retryTopic: () => {
      setTopicStatus("loading");
      setTopicError("");
      setTopicAttempt((attempt) => attempt + 1);
    },
    retryThreads: () => {
      setThreadsStatus("loading");
      setThreadsError("");
      setThreadsAttempt((attempt) => attempt + 1);
    },
    retryThreadDetail: () => {
      setThreadDetailStatus("loading");
      setThreadDetailError("");
      setThreadDetailAttempt((attempt) => attempt + 1);
    },
  };
}

export type DiscussionState = ReturnType<typeof useDiscussionState>;
