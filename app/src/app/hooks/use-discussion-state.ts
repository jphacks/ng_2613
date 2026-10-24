"use client";

import { useEffect, useState, type FormEvent } from "react";
import { screens, topics, type Screen } from "../lib/demo-data";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";
type AccountProfile = { phone: string; gender: string; year: string };
type ApiErrorBody = { error?: { message?: string } };

async function requestApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;
    throw new Error(errorBody?.error?.message ?? "通信に失敗しました。");
  }
  if (!body || typeof body !== "object" || !("data" in body)) {
    throw new Error("サーバーから正しい応答を受信できませんでした。");
  }
  return (body as { data: T }).data;
}

export function useDiscussionState() {
  const [screen, setScreen] = useState<Screen>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(0);
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

  useEffect(() => {
    const syncScreen = () => {
      const hash = window.location.hash.slice(1);
      setScreen(screens.includes(hash as Screen) ? (hash as Screen) : "home");
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
          if (window.location.hash.slice(1) === "profile") {
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

  function navigate(next: Screen) {
    window.location.hash = next;
    setScreen(next);
    setMenuOpen(false);
    setNotice("");
    setOtpSent(false);
    setAccountError("");
    window.scrollTo(0, 0);
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
      navigate("home");
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
      navigate("home");
      setNotice("ログアウトしました。");
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "ログアウトに失敗しました。");
    } finally {
      setAccountSubmitting(false);
    }
  }

  const selectedTopic = topics[category];
  const accountScreen = screen === "login" || screen === "register" || screen === "profile";

  return {
    screen, menuOpen, setMenuOpen, search, setSearch, setCategory, stance, setStance,
    message, setMessage, messages, setMessages, vote, setVote, notice, setNotice,
    profile, navigate, submitAccount, selectedTopic, accountScreen, authStatus,
    otpSent, accountSubmitting, accountError, signOut,
  };
}

export type DiscussionState = ReturnType<typeof useDiscussionState>;
