"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MoreVertical, Phone, Video, ArrowLeft, Image as ImageIcon, VolumeX, Menu, Info, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useAuthStore } from "@hooks/useAuthStore";
import { useChatStore } from "@hooks/useChatStore";
import { useUIStore } from "@hooks/useUIStore";
import { useCallStore } from "@hooks/useCallStore";
import { Avatar } from "@components/ui/Avatar";
import { Button } from "@components/ui/Button";
import api from "@lib/api";

const EMPTY_TYPING: string[] = [];

const formatLastSeen = (dateStr: string) => {
  if (!dateStr || dateStr === "offline") return "offline";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "offline";

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (isToday) {
      return `last seen today at ${timeStr}`;
    }
    if (isYesterday) {
      return `last seen yesterday at ${timeStr}`;
    }
    
    const dateStrFormatted = date.toLocaleDateString([], { month: "short", day: "numeric" });
    return `last seen on ${dateStrFormatted} at ${timeStr}`;
  } catch (e) {
    return "offline";
  }
};

interface ChatHeaderProps {
  chatId: string;
  onToggleProfile: () => void;
  isProfileOpen: boolean;
  isSearchOpen?: boolean;
  setIsSearchOpen?: (val: boolean) => void;
  searchQuery?: string;
  setSearchQuery?: (val: string) => void;
  searchMatchCount?: number;
  activeSearchMatch?: number;
  onSearchNavigate?: (direction: "up" | "down") => void;
}

export function ChatHeader({
  chatId,
  onToggleProfile,
  isProfileOpen,
  isSearchOpen = false,
  setIsSearchOpen,
  searchQuery = "",
  setSearchQuery,
  searchMatchCount = 0,
  activeSearchMatch = 0,
  onSearchNavigate,
}: ChatHeaderProps) {
  const router = useRouter();

  
  const [mounted, setMounted] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const user = useAuthStore((state) => state.user);
  const chats = useChatStore((state) => state.chats);
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const onlineStatuses = useChatStore((state) => state.onlineStatuses);
  const typingStatuses = useChatStore((state) => state.typingStatuses[chatId] ?? EMPTY_TYPING);
  const setChats = useChatStore((state) => state.setChats);
  const setSelectedChatId = useChatStore((state) => state.setSelectedChatId);
  const initiateCall = useCallStore((state) => state.initiateCall);
  const initiateGroupCall = useCallStore((state) => state.initiateGroupCall);
  const callState = useCallStore((state) => state.callState);
  const isInCall = callState !== "idle";

  useEffect(() => {
    setMounted(true);
  }, []);


  const chat = chats.find((c) => c.id === chatId);
  if (!chat) return null;

  const getPartner = () => {
    if (chat.type === "DIRECT" && user) {
      const partner = chat.members.find((m) => m.userId !== user.id)?.user;
      return partner || { name: "Saved Messages", avatarUrl: null, id: "" };
    }
    return { name: chat.title || "Group Chat", avatarUrl: chat.photoUrl || "/logo.png", id: "" };
  };

  const partner = getPartner();
  const isOnline = chat.type === "DIRECT" && onlineStatuses[partner.id] === "online";

  const canDeleteForEveryone = chat.type === "DIRECT" || chat.createdBy === user?.id;

  const handleDeleteChat = () => {
    setShowDeleteModal(true);
  };

  const performDelete = async (mode: "me" | "everyone") => {
    try {
      await api.delete(`/chats/${chatId}?mode=${mode}`);
      setSelectedChatId(null);
      setShowDeleteModal(false);
      router.push("/chats");
    } catch (err) {
      console.error(`Failed to delete chat in mode ${mode}:`, err);
    }
  };

  return (
    <>
      <div className="surface-glass flex items-center justify-between px-4 h-[64px] border-b border-slate-200/70 dark:border-white/5 relative z-20 text-[#111b21] dark:text-[#e9edef] select-none shadow-sm shadow-slate-200/30 dark:shadow-none">
        <div className="flex-1 flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className={`p-2 sm:p-1.5 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 active:bg-zinc-300/50 dark:active:bg-zinc-600/40 text-[#54656f] dark:text-[#aebac1] hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer hidden md:block`}
            title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <Menu size={20} />
          </button>
          
          <button
            onClick={() => {
              if (isSearchOpen) {
                if (setIsSearchOpen) setIsSearchOpen(false);
                if (setSearchQuery) setSearchQuery("");
              } else {
                setSelectedChatId(null);
                router.push("/chats");
              }
            }}
            className={`p-2 sm:p-1.5 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 active:bg-zinc-300/50 dark:active:bg-zinc-600/40 text-[#54656f] dark:text-[#aebac1] hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer ${isSearchOpen ? "" : "md:hidden"}`}
          >
            <ArrowLeft size={20} />
          </button>

          {isSearchOpen ? (
            <div className="flex-1 max-w-lg relative select-text flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667781] dark:text-[#8696a0]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full pl-9 pr-8 py-1.5 rounded-full border border-[#e9edef]/20 dark:border-white/5 ios-glass-input text-base md:text-base text-zinc-900 dark:text-[#e9edef] placeholder-[#667781] dark:placeholder-[#8696a0] focus:outline-none"
                  autoFocus
                />
              </div>
              <span className="text-xs tabular-nums text-[#667781] dark:text-[#8696a0] whitespace-nowrap" aria-live="polite">
                {searchQuery.trim() ? `${searchMatchCount ? activeSearchMatch + 1 : 0}/${searchMatchCount}` : ""}
              </span>
              <div className="flex items-center">
                <button
                  onClick={() => onSearchNavigate?.("up")}
                  disabled={!searchMatchCount}
                  className="p-1 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  title="Previous match"
                  aria-label="Previous match"
                >
                  <ChevronUp size={17} />
                </button>
                <button
                  onClick={() => onSearchNavigate?.("down")}
                  disabled={!searchMatchCount}
                  className="p-1 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  title="Next match"
                  aria-label="Next match"
                >
                  <ChevronDown size={17} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 cursor-pointer" onClick={onToggleProfile}>
              <Avatar
                src={partner.avatarUrl}
                name={partner.name}
                size="md"
                showStatus={chat.type === "DIRECT"}
                isOnline={isOnline}
              />
              <div>
                <h4 className="text-base font-bold truncate max-w-[160px] sm:max-w-xs text-zinc-900 dark:text-zinc-100">
                  {partner.name}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {typingStatuses.length > 0 ? (
                    <span className="flex items-center gap-1.5 text-base font-semibold text-brand-primary">
                      <span className="flex gap-0.5 items-center">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </span>
                      typing...
                    </span>
                  ) : isOnline ? (
                    <span className="flex items-center gap-1.5 text-base font-bold text-zinc-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-pulse inline-block" />
                      Online
                    </span>
                  ) : (
                    <span className="text-base font-medium text-zinc-400 dark:text-zinc-500 first-letter:capitalize">
                      {chat.type === "DIRECT" 
                        ? formatLastSeen(onlineStatuses[partner.id]) 
                        : `${chat.members.length} members`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isSearchOpen && chat.type === "DIRECT" && partner.id && (
            <>
              <button
                onClick={() => initiateCall(partner.id, partner.name, partner.avatarUrl, "audio")}
                disabled={isInCall}
                className="p-2.5 sm:p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 active:bg-zinc-300/50 dark:active:bg-zinc-600/40 text-[#54656f] dark:text-[#aebac1] hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title={isInCall ? "Already in a call" : "Voice Call"}
              >
                <Phone size={18} />
              </button>
              <button
                onClick={() => initiateCall(partner.id, partner.name, partner.avatarUrl, "video")}
                disabled={isInCall}
                className="p-2.5 sm:p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 active:bg-zinc-300/50 dark:active:bg-zinc-600/40 text-[#54656f] dark:text-[#aebac1] hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer mr-1 disabled:opacity-30 disabled:cursor-not-allowed"
                title={isInCall ? "Already in a call" : "Video Call"}
              >
                <Video size={18} />
              </button>
            </>
          )}

          {!isSearchOpen && chat.type === "GROUP" && (
            <>
              <button
                onClick={() => initiateGroupCall(chat.id, partner.name, "audio")}
                className="p-2.5 sm:p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 active:bg-zinc-300/50 dark:active:bg-zinc-600/40 text-[#54656f] dark:text-[#aebac1] hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer"
                title="Group Voice Call"
              >
                <Phone size={18} />
              </button>
              <button
                onClick={() => initiateGroupCall(chat.id, partner.name, "video")}
                className="p-2.5 sm:p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 active:bg-zinc-300/50 dark:active:bg-zinc-600/40 text-[#54656f] dark:text-[#aebac1] hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer mr-1"
                title="Group Video Call"
              >
                <Video size={18} />
              </button>
            </>
          )}

          {!isSearchOpen && (
            <>
              <button
                onClick={() => setIsSearchOpen && setIsSearchOpen(true)}
                className="p-2.5 sm:p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 active:bg-zinc-300/50 dark:active:bg-zinc-600/40 text-[#54656f] dark:text-[#aebac1] hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer"
                title="Search Messages"
              >
                <Search size={18} />
              </button>
              <button
                onClick={onToggleProfile}
                className={`p-2.5 sm:p-2 rounded-full transition-all cursor-pointer ${
                  isProfileOpen
                    ? "bg-zinc-600/20 text-zinc-700 dark:text-zinc-500"
                    : "hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 active:bg-zinc-300/50 dark:active:bg-zinc-600/40 text-[#54656f] dark:text-[#aebac1] hover:text-zinc-950 dark:hover:text-white"
                }`}
                title="Contact details"
              >
                <Info size={18} />
              </button>
              <button
                onClick={handleDeleteChat}
                className="p-2.5 sm:p-2 rounded-full hover:bg-red-500/10 active:bg-red-500/20 text-[#54656f] dark:text-[#aebac1] hover:text-red-500 transition-all cursor-pointer"
                title="Delete Conversation"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 select-none">
          <div className="bg-white dark:bg-[#222e35] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-[#e9edef]/10 dark:border-[#222e35]/30 text-center space-y-5 transform scale-100 transition-transform">
            <div className="flex justify-center">
              <div className="p-3 bg-red-500/10 dark:bg-red-500/5 text-red-500 rounded-2xl">
                <Trash2 size={24} />
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Delete Conversation?</h3>
              <p className="text-base text-[#667781] dark:text-[#8696a0] leading-relaxed">
                Are you sure you want to delete this conversation? This action will only remove it from your side.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={() => performDelete("me")}
                className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white"
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                className="w-full py-2.5"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
