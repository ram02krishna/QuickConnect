"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Menu, Search, Users } from "lucide-react";
import { useUIStore } from "@hooks/useUIStore";

export default function ChatsPage() {
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const router = useRouter();

  return (
    <div className="chat-canvas flex-1 flex flex-col relative items-center justify-center p-4 sm:p-6 text-center overflow-hidden select-none">
      {/* Sidebar Toggle for Desktop */}
      <button
        onClick={toggleSidebar}
        className="absolute top-4 left-4 p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 active:bg-zinc-300/50 dark:active:bg-zinc-600/40 text-[#54656f] dark:text-[#aebac1] hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer hidden md:block"
        title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        <Menu size={20} />
      </button>

      {/* Main Welcome Card */}
      <div className="surface-glass max-w-sm sm:max-w-md w-full flex flex-col items-center select-none space-y-4 rounded-3xl border border-zinc-200/80 dark:border-white/10 p-6 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-black/30 backdrop-blur-xl">
        <div className="relative">
          <img
            src="/logo.png"
            alt="QuickConnect logo"
            className="h-14 w-14 sm:h-16 sm:w-16 object-contain drop-shadow-md rounded-2xl"
          />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Welcome to QuickConnect
          </h1>
          <p className="text-xs sm:text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 max-w-xs sm:max-w-sm mx-auto">
            Pick a conversation, search for someone new, or create a group to start sharing ideas.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
          <button
            type="button"
            onClick={() => {
              useUIStore.getState().setSidebarOpen(true);
              router.push("/chats?action=find-people");
            }}
            className="flex flex-col items-start p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-white/5 border border-zinc-200/70 dark:border-white/5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/50 hover:shadow-md hover:shadow-sky-500/10 focus:outline-none cursor-pointer group"
          >
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Search size={16} />
            </div>
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Find people</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Search contacts</p>
          </button>

          <button
            type="button"
            onClick={() => router.push("/chats?action=create-group")}
            className="flex flex-col items-start p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-white/5 border border-zinc-200/70 dark:border-white/5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/50 hover:shadow-md hover:shadow-emerald-500/10 focus:outline-none cursor-pointer group"
          >
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Users size={16} />
            </div>
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Start a group</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Team discussion</p>
          </button>
        </div>

        {/* Security Footer */}
        <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-zinc-400 font-medium">
          <Lock size={12} className="text-zinc-400" />
          <span>Your conversations stay private</span>
        </div>
      </div>
    </div>
  );
}
