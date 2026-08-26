"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Menu, Search, Users } from "lucide-react";
import { useUIStore } from "@hooks/useUIStore";

export default function ChatsPage() {
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const router = useRouter();
  return (
    <div className="chat-canvas flex-1 flex flex-col relative items-center justify-center p-6 sm:p-8 text-center overflow-hidden">
      {/* Sidebar Toggle for Desktop */}
      <button
        onClick={toggleSidebar}
        className="absolute top-4 left-4 p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 active:bg-zinc-300/50 dark:active:bg-zinc-600/40 text-[#54656f] dark:text-[#aebac1] hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer hidden md:block"
        title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        <Menu size={20} />
      </button>

      <div className="surface-glass max-w-md flex flex-col items-center select-none space-y-4 rounded-3xl border border-white/70 dark:border-white/10 px-8 py-9 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
        <img src="/logo.png" alt="QuickConnect logo" className="h-24 w-24 object-contain mb-1" />
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Welcome to QuickConnect</h1>
        </div>
        <p className="text-base leading-relaxed text-zinc-500 dark:text-zinc-400 max-w-sm">
          Pick a conversation, search for someone new, or create a group to start sharing ideas.
        </p>
        <div className="grid grid-cols-2 gap-2 w-full pt-2 text-left">
          <button type="button" onClick={() => { useUIStore.getState().setSidebarOpen(true); router.push("/chats?action=find-people"); }} className="rounded-xl bg-white/70 dark:bg-white/5 p-3 border border-zinc-100 dark:border-white/5 text-left transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md hover:shadow-sky-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"><Search className="mb-2 h-4 w-4 text-sky-600" /><p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Find people</p></button>
          <button type="button" onClick={() => router.push("/chats?action=create-group")} className="rounded-xl bg-white/70 dark:bg-white/5 p-3 border border-zinc-100 dark:border-white/5 text-left transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md hover:shadow-sky-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"><Users className="mb-2 h-4 w-4 text-sky-600" /><p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Start a group</p></button>
        </div>
        <div className="pt-4 flex items-center justify-center gap-1.5 text-sm text-zinc-400">
          <Lock size={12} />
          <span>Your conversations stay private</span>
        </div>
      </div>
    </div>
  );
}
