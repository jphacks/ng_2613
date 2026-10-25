"use client";

import Image from "next/image";
import AppHeader from "./components/app-header";
import { DictionaryProvider } from "./components/dictionary";
import AppMenu from "./components/app-menu";
import { useDiscussionState } from "./hooks/use-discussion-state";
import DiscussionScreen from "./screens/discussion-screen";
import DailyThemeScreen from "./screens/daily-theme-screen";
import HomeScreen from "./screens/home-screen";
import LoginScreen from "./screens/login-screen";
import NewThreadScreen from "./screens/new-thread-screen";
import ProfileScreen from "./screens/profile-screen";
import RegisterScreen from "./screens/register-screen";
import SummaryScreen from "./screens/summary-screen";
import ThreadScreen from "./screens/thread-screen";
import TopicsScreen from "./screens/topics-screen";
import VideoScreen from "./screens/video-screen";
import VoteScreen from "./screens/vote-screen";

export default function DiscussionApp() {
  const state = useDiscussionState();
  const { screen, accountScreen, notice, menuOpen } = state;

  return <DictionaryProvider visible={state.authStatus === "authenticated" && !accountScreen}>
    <div className="app-layout">
    {/* 飾りのロゴ。button にするとホバー時の filter で乗算合成が切れ、白い背景が浮き出る */}
    <aside className="desktop-sidebar desktop-brand" aria-hidden="true">
      <div className="desktop-logo-button">
        <Image src="/rights-logo.png" alt="" width={186} height={190} className="desktop-logo" />
      </div>
    </aside>
    <main className={`app-shell screen-${screen}`}>
      {!accountScreen && screen !== "video" && screen !== "vote" && <AppHeader {...state} />}
      {notice && <p className="notice" role="status">{notice}</p>}
      {screen === "home" && <HomeScreen {...state} />}
      {screen === "daily-theme" && <DailyThemeScreen {...state} />}
      {screen === "topics" && <TopicsScreen {...state} />}
      {screen === "summary" && <SummaryScreen {...state} />}
      {screen === "discussion" && <DiscussionScreen {...state} />}
      {screen === "new-thread" && <NewThreadScreen {...state} />}
      {screen === "thread" && <ThreadScreen {...state} />}
      {screen === "video" && <VideoScreen {...state} />}
      {screen === "vote" && <VoteScreen {...state} />}
      {screen === "login" && <LoginScreen {...state} />}
      {screen === "register" && <RegisterScreen {...state} />}
      {screen === "profile" && <ProfileScreen {...state} />}
      {menuOpen && <div className="mobile-menu"><AppMenu {...state} /></div>}
    </main>
    <aside className="desktop-sidebar desktop-navigation" aria-label="サイドメニュー">
      <AppMenu {...state} persistent />
    </aside>
    </div>
  </DictionaryProvider>;
}
