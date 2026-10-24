"use client";

import { DictionaryProvider } from "./components/dictionary";
import AppHeader from "./components/app-header";
import AppMenu from "./components/app-menu";
import { useDiscussionState } from "./hooks/use-discussion-state";
import HomeScreen from "./screens/home-screen";
import TopicsScreen from "./screens/topics-screen";
import SummaryScreen from "./screens/summary-screen";
import DiscussionScreen from "./screens/discussion-screen";
import ThreadScreen from "./screens/thread-screen";
import NewThreadScreen from "./screens/new-thread-screen";
import VideoScreen from "./screens/video-screen";
import VoteScreen from "./screens/vote-screen";
import LoginScreen from "./screens/login-screen";
import RegisterScreen from "./screens/register-screen";
import ProfileScreen from "./screens/profile-screen";

export default function DiscussionApp() {
 const state = useDiscussionState();
 const { screen, accountScreen, notice, menuOpen } = state;
 return (
  <DictionaryProvider>
  <div className="app-layout">
   <aside className="desktop-sidebar desktop-brand" aria-label="ロゴ">
    <button className="brand" onClick={() => state.navigate("home")}>アプリ名</button>
   </aside>
  <main className={`app-shell screen-${screen}`}>
   {!accountScreen && screen !== "video" && screen !== "vote" && <AppHeader {...state} />}
   {notice && <p className="notice" role="status">{notice}</p>}
   {screen === "home" && <HomeScreen {...state} />}
   {screen === "topics" && <TopicsScreen {...state} />}
   {screen === "summary" && <SummaryScreen {...state} />}
   {screen === "discussion" && <DiscussionScreen {...state} />}
   {screen === "thread" && <ThreadScreen {...state} />}
   {screen === "new-thread" && <NewThreadScreen navigate={state.navigate} profile={state.profile} />}
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
  </DictionaryProvider>
 );
}
