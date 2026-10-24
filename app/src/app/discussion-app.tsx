"use client";

import AppHeader from "./components/app-header";
import AppMenu from "./components/app-menu";
import { useDiscussionState } from "./hooks/use-discussion-state";
import HomeScreen from "./screens/home-screen";
import TopicsScreen from "./screens/topics-screen";
import SummaryScreen from "./screens/summary-screen";
import DiscussionScreen from "./screens/discussion-screen";
import ThreadScreen from "./screens/thread-screen";
import LoginScreen from "./screens/login-screen";
import RegisterScreen from "./screens/register-screen";
import ProfileScreen from "./screens/profile-screen";
import DataState from "./components/data-state";

export default function DiscussionApp() {
 const state = useDiscussionState();
 const { screen, accountScreen, notice, menuOpen } = state;
 return (
  <main className={`app-shell screen-${screen}`}>
   {!accountScreen && <AppHeader {...state} />}
   {notice && <p className="notice" role="status">{notice}</p>}
   {screen === "home" && <HomeScreen {...state} />}
   {screen === "topics" && <TopicsScreen {...state} />}
   {screen === "summary" && <SummaryScreen {...state} />}
   {screen === "discussion" && <DiscussionScreen {...state} />}
   {screen === "thread" && <ThreadScreen {...state} />}
   {(screen === "video" || screen === "vote") && <DataState
    status="empty"
    emptyMessage="この機能は現在準備中です。"
   />}
   {screen === "login" && <LoginScreen {...state} />}
   {screen === "register" && <RegisterScreen {...state} />}
   {screen === "profile" && <ProfileScreen {...state} />}
   {menuOpen && <AppMenu {...state} />}
  </main>
 );
}
