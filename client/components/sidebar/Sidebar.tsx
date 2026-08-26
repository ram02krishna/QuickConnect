"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, LogOut, UserPlus, MessageCircle, X, CircleDot, ChevronLeft, Plus, Users, Camera, Video, Mic, FileText, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuthStore } from "@hooks/useAuthStore";
import { useChatStore } from "@hooks/useChatStore";
import { useSocketStore } from "@hooks/useSocketStore";
import { useUIStore } from "@hooks/useUIStore";
import { Avatar } from "@components/ui/Avatar";
import { Input } from "@components/ui/Input";
import api from "@lib/api";
import { NewGroupModal } from "./NewGroupModal";
import { cn } from "@lib/utils";

const ChatItem = React.memo(function ChatItem({
  chat,
  partner,
  isSelected,
  isOnline,
  isTyping,
  preview,
  onClick,
  formatTime
}: {
  chat: any;
  partner: any;
  isSelected: boolean;
  isOnline: boolean;
  isTyping: boolean;
  preview: any;
  onClick: (id: string) => void;
  formatTime: (dateStr: string) => string;
}) {
  const firstName = (name: any) => {
    if (!name || typeof name !== "string") return "";
    return name.split(" ")[0];
  };

  return (
    <div
      onClick={() => onClick(chat.id)}
      className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-all duration-150 rounded-xl select-none ${
        isSelected
          ? "bg-sky-50 dark:bg-zinc-800/90 text-zinc-950 dark:text-white"
          : "hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200"
      }`}
    >
      <div className="flex-shrink-0">
        <Avatar
          src={partner.avatarUrl}
          name={partner.name}
          size="md"
          showStatus={chat.type === "DIRECT"}
          isOnline={isOnline}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <p className="text-[14.5px] sm:text-[15px] font-semibold truncate text-zinc-900 dark:text-zinc-100 flex items-center">
            {chat.type === "DIRECT" ? firstName(partner.name) : (chat.title || "Group Chat")}
            {chat.isPinned && (
              <span className="text-xs text-zinc-500 ml-1.5" title="Pinned Chat">📌</span>
            )}
          </p>
          {chat.lastMessage && (
            <span className={cn("text-[11px] sm:text-xs font-medium flex-shrink-0 tabular-nums", preview?.isUnread ? "text-sky-600 dark:text-sky-400 font-semibold" : "text-zinc-400 dark:text-zinc-500")}>
              {formatTime(chat.lastMessage.createdAt)}
            </span>
          )}
        </div>

        <p className="text-[12.5px] sm:text-[13px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 flex items-center">
          {isTyping ? (
            <span className="text-sky-600 dark:text-sky-400 font-medium flex items-center gap-1">
              <span className="flex gap-0.5 items-center">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </span>
              typing...
            </span>
          ) : preview ? (
            <>
              {preview.isMe && (
                <span className={`font-semibold select-none mr-1 text-[11px] flex-shrink-0 ${
                  preview.isRead ? "text-sky-500" : "text-zinc-400 dark:text-zinc-500"
                }`}>✓✓</span>
              )}
              <span className="flex items-center gap-1 truncate max-w-full">
                {preview.type === "IMAGE" && <Camera size={13} className="text-zinc-400 flex-shrink-0" />}
                {preview.type === "VIDEO" && <Video size={13} className="text-zinc-400 flex-shrink-0" />}
                {preview.type === "AUDIO" && <Mic size={13} className="text-zinc-400 flex-shrink-0" />}
                {preview.type === "FILE" && <FileText size={13} className="text-zinc-400 flex-shrink-0" />}
                <span className="truncate">{preview.content}</span>
              </span>
            </>
          ) : (
            <span className="italic text-zinc-400 text-xs">No messages yet</span>
          )}
        </p>
      </div>
      {preview?.isUnread && (
        <div className="flex flex-col justify-center items-end ml-1.5 flex-shrink-0">
          <span className="bg-sky-500 text-white text-[10.5px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-xs">
            new
          </span>
        </div>
      )}
    </div>
  );
});

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { resolvedTheme, setTheme } = useTheme();
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);

  const user = useAuthStore((state) => state.user);
  const logoutStore = useAuthStore((state) => state.logout);
  const disconnectSocket = useSocketStore((state) => state.disconnectSocket);

  const chats = useChatStore((state) => state.chats);
  const selectedChatId = useChatStore((state) => state.selectedChatId);
  const setSelectedChatId = useChatStore((state) => state.setSelectedChatId);
  const upsertChat = useChatStore((state) => state.upsertChat);
  const onlineStatuses = useChatStore((state) => state.onlineStatuses);
  const typingStatuses = useChatStore((state) => state.typingStatuses);
  const loadingChats = useChatStore((state) => state.isChatsLoading);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "groups">("all");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "find-people") {
      setSidebarOpen(true);
      const focusSearch = () => searchInputRef.current?.focus();
      requestAnimationFrame(focusSearch);
      const focusTimer = window.setTimeout(focusSearch, 120);
      return () => window.clearTimeout(focusTimer);
    }
    if (action === "create-group") {
      setShowGroupModal(true);
    }
  }, [searchParams, setSidebarOpen]);

  // Removed handleTogglePin and handleToggleArchive

  const chatsToShow = useMemo(() => {
    return chats
      .filter((chat) => {
        if (filterTab === "groups") return chat.type === "GROUP";
        return true;
      })
      .sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.updatedAt;
        const bTime = b.lastMessage?.createdAt || b.updatedAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
  }, [chats, filterTab]);

  // Trigger search when query is typed
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data.data.users);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      disconnectSocket();
      logoutStore();
      useChatStore.getState().clearStore();
      router.push("/login");
    }
  };

  const startChatWithUser = async (targetUserId: string) => {
    try {
      const res = await api.post("/chats/direct", { targetUserId });
      const chat = res.data.data.chat;
      const targetStatuses = res.data.data.onlineStatuses;

      upsertChat(chat);
      if (targetStatuses) {
        useChatStore.getState().setOnlineStatuses(targetStatuses);
      }
      setSearchQuery("");
      setSearchResults([]);

      setSelectedChatId(chat.id);

      // Pre-fetch messages instantly to eliminate the loading delay on the chat page
      const cached = useChatStore.getState().messages[chat.id];
      if (!cached || cached.length === 0) {
        api.get(`/messages/${chat.id}`).then(res => {
          const fetchedMessages = res.data.data.messages;
          useChatStore.getState().setMessages(chat.id, fetchedMessages);
          if (fetchedMessages.length < 30) {
            useChatStore.getState().setHasMoreMessages(chat.id, false);
          } else {
            useChatStore.getState().setHasMoreMessages(chat.id, true);
          }
        }).catch(err => console.error("Prefetch failed:", err));
      }

      router.push(`/chats/${chat.id}`);
    } catch (err) {
      console.error("Error creating direct chat:", err);
    }
  };

  const getChatPartner = (chat: any) => {
    if (chat.type === "DIRECT" && user) {
      const partner = chat.members?.find((m: any) => m.userId !== user.id)?.user;
      return partner || { name: "Saved Messages", avatarUrl: null, id: "" };
    }
    return { name: chat.title || "Group Chat", avatarUrl: chat.photoUrl || "/logo.png", id: "" };
  };

  // Returns only the first word of a name
  const firstName = (name: any) => {
    if (!name || typeof name !== "string") return "";
    return name.split(" ")[0];
  };

  const getLastMessagePreview = (chat: any) => {
    if (!chat.lastMessage) return null;
    const senderId = chat.lastMessage.sender?.id || chat.lastMessage.senderId;
    const isMe = senderId === user?.id && chat.lastMessage.type !== "SYSTEM";
    const isRead = chat.lastMessage.reads && chat.lastMessage.reads.length > 0;
    const isReadByMe = chat.lastMessage.reads && chat.lastMessage.reads.some((r: any) => r.userId === user?.id);
    const isUnread = !isMe && !isReadByMe;
    const type = chat.lastMessage.type;
    
    let content = chat.lastMessage.content;
    if (type === "IMAGE") content = "Photo";
    if (type === "VIDEO") content = "Video";
    if (type === "AUDIO") content = "Voice message";
    if (type === "FILE" && (!content || content.startsWith("voice-message-") || content.startsWith("file-"))) content = "Document";

    return { isMe, isRead, isUnread, type, content };
  };

  const formatTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }, []);

  const handleChatClick = useCallback((chatId: string) => {
    setSelectedChatId(chatId);

    // Pre-fetch messages instantly to eliminate the loading delay on the chat page
    const cached = useChatStore.getState().messages[chatId];
    if (!cached || cached.length === 0) {
      api.get(`/messages/${chatId}`).then(res => {
        const fetchedMessages = res.data.data.messages;
        useChatStore.getState().setMessages(chatId, fetchedMessages);
        if (fetchedMessages.length < 30) {
          useChatStore.getState().setHasMoreMessages(chatId, false);
        } else {
          useChatStore.getState().setHasMoreMessages(chatId, true);
        }
      }).catch(err => console.error("Prefetch failed:", err));
    }

    router.push(`/chats/${chatId}`);
  }, [router, setSelectedChatId]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 relative select-none text-zinc-900 dark:text-zinc-100 overflow-hidden">
      {/* Sidebar Header */}
        <div className="px-4 h-[60px] flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative z-10">
          {/* User info */}
          <div
            className="flex items-center gap-3 cursor-pointer group rounded-xl p-2 -ml-2 transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => router.push("/profile")}
          >
            <div className="relative">
              <Avatar src={user?.avatarUrl} name={user?.name} size="sm" />
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white dark:ring-zinc-900" />
            </div>
            <div className="hidden sm:flex flex-col justify-center">
              <p className="text-base font-bold leading-tight truncate max-w-[140px] text-zinc-900 dark:text-zinc-100 transition-colors group-hover:text-brand-primary">
                {user?.name ? firstName(user.name) : ""}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-tight mt-0.5">
                @{user?.username}
              </p>
            </div>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-all cursor-pointer"
              title={resolvedTheme === "dark" ? "Use light theme" : "Use dark theme"}
              aria-label={resolvedTheme === "dark" ? "Use light theme" : "Use dark theme"}
            >
              {resolvedTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              onClick={() => setShowGroupModal(true)}
              className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-all cursor-pointer"
              title="New Group"
            >
              <Users size={20} />
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all cursor-pointer"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

      {/* Search Section */}
      <div className="px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800/80 relative z-10">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchParams.get("action") === "find-people" ? "Search people by name or @username" : "Search or start new chat"}
            autoFocus={searchParams.get("action") === "find-people"}
            className="w-full pl-9 pr-8 py-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer p-0.5 rounded-full"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-3.5 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 relative z-10">
        {[
          { id: "all", label: "All" },
          { id: "groups", label: "Groups" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id as any)}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-150 cursor-pointer select-none ${
              filterTab === tab.id
                ? "bg-sky-500 text-white shadow-xs"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-4 relative z-10 scrollbar-thin">
        {/* Search Results */}
        <React.Fragment>
          {searchQuery.trim().length >= 2 && (
            <div className="mb-2 mt-1.5">
              <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 px-2.5 mb-1.5 uppercase tracking-wider">
                Search Results
              </p>
              {searching ? (
                <div className="space-y-1.5 px-1">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <div className="skeleton h-8 w-8 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="skeleton h-3 w-24 rounded" />
                        <div className="skeleton h-2.5 w-16 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 px-3 py-1.5">No users found</p>
              ) : (
                <div className="space-y-0.5">
                  {searchResults.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => startChatWithUser(u.id)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 cursor-pointer transition-all duration-150 group"
                    >
                      <Avatar src={u.avatarUrl} name={u.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-zinc-800 dark:text-zinc-200">{u.name}</p>
                        <p className="text-xs text-zinc-400 truncate">@{u.username}</p>
                      </div>
                      <UserPlus size={15} className="text-sky-500 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 mt-2 mb-1" />
            </div>
          )}
        </React.Fragment>

        {/* Recent Chats Label */}
        <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 px-2.5 mb-1 mt-2.5 uppercase tracking-wider">
          {filterTab === "all" && "Recent Chats"}
          {filterTab === "groups" && "Groups"}
        </p>

        {/* Chat List */}
        {loadingChats ? (
          <div className="space-y-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3.5 py-3 rounded-xl animate-pulse">
                <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-800 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-2.5 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : chatsToShow.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-4">
            <div className="relative mb-3">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-zinc-100 dark:bg-zinc-800/50">
                <img src="/logo.png" alt="QuickConnect Logo" className="w-9 h-9 object-contain opacity-70" />
              </div>
            </div>
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              No chats yet
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 leading-relaxed max-w-[200px]">
              {filterTab === "all" ? "Search for a username above to start chatting!" : "Your filters returned 0 items."}
            </p>
          </div>
        ) : (
            <div className="space-y-1">
              {chatsToShow.map((chat) => {
                const partner = getChatPartner(chat);
                const isSelected = selectedChatId === chat.id;
                const isOnline = chat.type === "DIRECT" && onlineStatuses[partner.id] === "online";
                const preview = getLastMessagePreview(chat);
                const typers = typingStatuses[chat.id] || [];
                const isTyping = typers.length > 0;

                return (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    partner={partner}
                    isSelected={isSelected}
                    isOnline={isOnline}
                    isTyping={isTyping}
                    preview={preview}
                    onClick={handleChatClick}
                    formatTime={formatTime}
                  />
                );
              })}
            </div>
          )}
      </div>

      {/* Group Creator Modal */}
      {showGroupModal && (
        <NewGroupModal
          onClose={() => setShowGroupModal(false)}
          onGroupCreated={(chat) => {
            upsertChat(chat);
            setSelectedChatId(chat.id);
            router.push(`/chats/${chat.id}`);
          }}
        />
      )}

    </div>
  );
}
