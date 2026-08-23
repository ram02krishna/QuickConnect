"use client";

import * as React from "react";
import { Lock, Menu } from "lucide-react";
import { useUIStore } from "@hooks/useUIStore";

export default function ChatsPage() {
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  return (
    <div className="flex-1 flex flex-col relative items-center justify-center p-8 text-center bg-transparent">
      {/* Sidebar Toggle for Desktop */}
      <button
        onClick={toggleSidebar}
        className="absolute top-4 left-4 p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 active:bg-zinc-300/50 dark:active:bg-zinc-600/40 text-[#54656f] dark:text-[#aebac1] hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer hidden md:block"
        title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        <Menu size={20} />
      </button>

      <div className="max-w-md flex flex-col items-center select-none space-y-4">
        <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 mb-2">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Welcome to QuickConnect
        </h1>
        <p className="text-base text-zinc-500 dark:text-zinc-400 max-w-sm">
          Select an existing conversation from the sidebar or start a new one to begin messaging.
        </p>

        <div className="pt-8 flex items-center justify-center gap-1.5 text-sm text-zinc-400">
          <Lock size={12} />
          <span>End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
}
