"use client";
import { useEffect, useState, type FormEvent } from "react";
import { screens, topics, type Screen } from "../lib/demo-data";
export function useDiscussionState() {
    const [screen, setScreen] = useState<Screen>("home");
    const [menuOpen, setMenuOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState(0);
    const [stance, setStance] = useState("賛成");
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<{
        text: string;
        stance: string;
    }[]>([]);
    const [vote, setVote] = useState<number | null>(null);
    const [notice, setNotice] = useState("");
    const [profile, setProfile] = useState({ phone: "", gender: "", year: "" });
    useEffect(() => {
        const syncScreen = () => {
            const hash = window.location.hash.slice(1);
            if (hash === "vote") setVote(null);
            setScreen(screens.includes(hash as Screen) ? hash as Screen : "home");
            setMenuOpen(false);
        };
        syncScreen();
        window.addEventListener("hashchange", syncScreen);
        return () => window.removeEventListener("hashchange", syncScreen);
    }, []);
    function navigate(next: Screen) {
        if (next === "vote") setVote(null);
        window.location.hash = next;
        setScreen(next);
        setMenuOpen(false);
        setNotice("");
        window.scrollTo(0, 0);
    }
    function submitAccount(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (screen === "profile") {
            const data = new FormData(event.currentTarget);
            setProfile({ phone: String(data.get("phone") ?? ""), gender: String(data.get("gender") ?? ""), year: String(data.get("year") ?? "") });
            setNotice("会員情報を画面内で変更しました（デモ）。");
        }
        else {
            navigate("home");
            setNotice(screen === "register" ? "登録内容を確認しました（デモ）。" : "入力内容を確認しました（デモ）。");
        }
    }
    const selectedTopic = topics[category];
    const accountScreen = screen === "login" || screen === "register" || screen === "profile";
    return { screen, menuOpen, setMenuOpen, search, setSearch, setCategory, stance, setStance, message, setMessage, messages, setMessages, vote, setVote, notice, setNotice, profile, navigate, submitAccount, selectedTopic, accountScreen };
}
export type DiscussionState = ReturnType<typeof useDiscussionState>;
