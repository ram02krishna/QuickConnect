"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MoreVertical, Phone, Video, ArrowLeft, Image as ImageIcon, VolumeX, Menu, Info, Trash2, ChevronUp, ChevronDown, X } from "lucide-react";
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
  const deleteChat = useChatStore((state) => state.deleteChat);
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
      const partner = chat.members?.find((m: any) => m.userId !== user.id)?.user;
      return partner || { name: "Saved Messages", avatarUrl: null, id: "" };
    }
    return { name: chat.title || "Group Chat", avatarUrl: chat.photoUrl || "/logo.png", id: "" };
  };

  const partner = getPartner();
  const isOnline = chat.type === "DIRECT" && onlineStatuses[partner.id] === "online";

  const getTypingText = () => {
    if (typingStatuses.length === 0) return null;
    if (chat.type === "DIRECT") return "typing...";

    const otherTypers = typingStatuses.filter((id) => id !== user?.id);
    if (otherTypers.length === 0) return null;

    const names = otherTypers.map((id) => {
      const m = chat.members?.find((member: any) => member.userId === id);
      return m?.user?.name ? m.user.name.split(" ")[0] : "Someone";
    });

    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]}, ${names[1]} are typing...`;
    return `${names[0]} and ${names.length - 1} others are typing...`;
  };

  const typingText = getTypingText();

  const handleDeleteChat = () => {
    setShowDeleteModal(true);
  };

  const performDelete = async (mode: "me" | "everyone") => {
    try {
      await api.delete(`/chats/${chatId}?mode=${mode}`);
      deleteChat(chatId);
      setShowDeleteModal(false);
      router.push("/chats");
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  return (
    <>
      <header className="h-16 px-3 sm:px-4 border-b border-zinc-200/70 dark:border-white/5 flex items-center justify-between z-20 surface-glass text-zinc-900 dark:text-zinc-100 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <button
            onClick={() => router.push("/chats")}
            className="md:hidden p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Back to chat list"
          >
            <ArrowLeft size={18} />
          </button>

          {isSearchOpen ? (
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery?.(e.target.value)}
                  placeholder="Search in this chat..."
                  className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm rounded-full pl-9 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 border border-zinc-200 dark:border-zinc-700"
                  autoFocus
                />
                <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery?.("")}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs text-zinc-400 whitespace-nowrap min-w-[36px] text-center">
                  {searchMatchCount === 0 ? "0/0" : `${activeSearchMatch + 1}/${searchMatchCount}`}
                </span>
                <button
                  onClick={() => onSearchNavigate?.("up")}
                  disabled={searchMatchCount === 0}
                  className="p-1 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  title="Previous match"
                  aria-label="Previous match"
                >
                  <ChevronUp size={17} />
                </button>
                <button
                  onClick={() => onSearchNavigate?.("down")}
                  disabled={searchMatchCount === 0}
                  className="p-1 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  title="Next match"
                  aria-label="Next match"
                >
                  <ChevronDown size={17} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer min-w-0" onClick={onToggleProfile}>
              <Avatar
                src={partner.avatarUrl}
                name={partner.name}
                size="md"
                showStatus={chat.type === "DIRECT"}
                isOnline={isOnline}
              />
              <div className="min-w-0">
                <h4 className="text-sm sm:text-[15px] font-semibold truncate max-w-[130px] sm:max-w-xs text-zinc-900 dark:text-zinc-100">
                  {partner.name}
                </h4>
                <div className="flex items-center gap-1 mt-0.5">
                  {typingText ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400 truncate max-w-[160px] sm:max-w-xs">
                      <span className="flex gap-0.5 items-center flex-shrink-0">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </span>
                      <span className="truncate">{typingText}</span>
                    </span>
                  ) : isOnline ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                      Online
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 first-letter:capitalize truncate max-w-[140px] sm:max-w-none">
                      {chat.type === "DIRECT" 
                        ? formatLastSeen(onlineStatuses[partner.id]) 
                        : `${chat.members?.length || 0} members`}
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
      </header>

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
