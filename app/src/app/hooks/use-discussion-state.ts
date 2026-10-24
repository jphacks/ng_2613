"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Catalog, CatalogTopic, TopicDetail } from "../lib/catalog/types";
import { screens, type Screen } from "../lib/demo-data";
import type { FrameVoteState, VoteValue } from "../lib/votes/types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";
export type DataStatus = "idle" | "loading" | "success" | "empty" | "unauthenticated" | "error";
type AccountProfile = { phone: string; gender: string; year: string };
type ApiErrorBody = { error?: { code?: string; message?: string } };
type Selection = {
  genreId: string | null;
  middleTopicId: string | null;
  topicId: string | null;
  frameId: string | null;
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
    throw new ApiRequestError(
      errorBody?.error?.message ?? "通信に失敗しました。",
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
    },
  };
}

function createHash(screen: Screen, selection: Selection) {
  const params = new URLSearchParams();
  if (selection.genreId) params.set("genreId", selection.genreId);
  if (selection.middleTopicId) params.set("middleTopicId", selection.middleTopicId);
  if (selection.topicId) params.set("topicId", selection.topicId);
  if (selection.frameId) params.set("frameId", selection.frameId);
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
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [stance, setStance] = useState("賛成");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ text: string; stance: string }[]>([]);
  const [vote, setVote] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [profile, setProfile] = useState<AccountProfile>({ phone: "", gender: "", year: "" });
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [otpSent, setOtpSent] = useState(false);
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogStatus, setCatalogStatus] = useState<DataStatus>("idle");
  const [catalogError, setCatalogError] = useState("");
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null);
  const [topicStatus, setTopicStatus] = useState<DataStatus>("idle");
  const [topicError, setTopicError] = useState("");
  const [topicAttempt, setTopicAttempt] = useState(0);
  const [voteSubmittingFrameId, setVoteSubmittingFrameId] = useState<string | null>(null);
  const [voteErrors, setVoteErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const syncScreen = () => {
      const next = parseLocationHash();
      setScreen(next.screen);
      setSelection(next.selection);
      setTopicDetail(null);
      setTopicStatus(next.selection.topicId ? "loading" : "idle");
      setTopicError("");
      setMenuOpen(false);
      setOtpSent(false);
      setAccountError("");
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
        if (active) setProfile(loadedProfile);
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

  const genres = useMemo(() => catalog?.genres ?? [], [catalog]);
  const selectedGenre = genres.find((genre) => genre.id === selection.genreId) ?? genres[0] ?? null;
  const allMiddleTopics = genres.flatMap((genre) => genre.middleTopics);
  const selectedMiddleTopic =
    allMiddleTopics.find((middleTopic) => middleTopic.id === selection.middleTopicId) ?? null;
  const selectedFrame =
    topicDetail?.periods
      .flatMap((period) => period.frames)
      .find((frame) => frame.id === selection.frameId) ?? null;

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
    setHash(next, selection);
  }

  function selectGenre(genreId: string) {
    setSearch("");
    setHash("home", { genreId, middleTopicId: null, topicId: null, frameId: null });
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
    setHash("summary", { genreId, middleTopicId, topicId, frameId: null });
  }

  function selectFrame(frameId: string) {
    setHash("discussion", { ...selection, frameId });
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
            gender: String(formData.get("gender") ?? ""),
            year: String(formData.get("year") ?? ""),
          }),
        });
        setProfile(updatedProfile);
        setNotice("会員情報を更新しました。");
        return;
      }

      const flow = screen === "register" ? "sign-up" : "sign-in";
      const phone = String(formData.get("phone") ?? "");
      if (!otpSent) {
        const result = await requestApi<{ phone: string }>("/api/auth/otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, flow }),
        });
        setProfile((current) => ({ ...current, phone: result.phone }));
        setOtpSent(true);
        setNotice("SMSで認証コードを送信しました。6桁のコードを入力してください。");
        return;
      }

      const result = await requestApi<{ authenticated: true; profile: AccountProfile }>(
        "/api/auth/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone,
            token: String(formData.get("token") ?? ""),
            flow,
            ...(flow === "sign-up"
              ? {
                  gender: String(formData.get("gender") ?? ""),
                  year: String(formData.get("year") ?? ""),
                }
              : {}),
          }),
        },
      );
      setProfile(result.profile);
      setAuthStatus("authenticated");
      setHash("home", { genreId: null, middleTopicId: null, topicId: null, frameId: null });
      setNotice(flow === "sign-up" ? "登録とログインが完了しました。" : "ログインしました。");
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
      setProfile({ phone: "", gender: "", year: "" });
      setHash("home", { genreId: null, middleTopicId: null, topicId: null, frameId: null });
      setNotice("ログアウトしました。");
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "ログアウトに失敗しました。");
    } finally {
      setAccountSubmitting(false);
    }
  }

  const accountScreen = screen === "login" || screen === "register" || screen === "profile";

  return {
    screen, menuOpen, setMenuOpen, search, setSearch, stance, setStance, message, setMessage,
    messages, setMessages, vote, setVote, notice, setNotice, profile, navigate, submitAccount,
    accountScreen, authStatus, otpSent, accountSubmitting, accountError, signOut, genres,
    selectedGenre, selectedMiddleTopic, topicDetail, selectedFrame,
    catalogStatus: authStatus === "unauthenticated"
      ? "unauthenticated" as const
      : catalogStatus === "idle" ? "loading" as const : catalogStatus,
    catalogError,
    topicStatus: authStatus === "unauthenticated" && selection.topicId
      ? "unauthenticated" as const
      : topicStatus,
    topicError, searchResults, selectGenre, selectMiddleTopic, selectTopic, selectFrame,
    voteSubmittingFrameId, voteErrors, submitVote,
    retryCatalog: () => {
      setCatalogStatus("loading");
      setCatalogError("");
      setCatalogAttempt((attempt) => attempt + 1);
    },
    retryTopic: () => {
      setTopicStatus("loading");
      setTopicError("");
      setTopicAttempt((attempt) => attempt + 1);
    },
  };
}

export type DiscussionState = ReturnType<typeof useDiscussionState>;
