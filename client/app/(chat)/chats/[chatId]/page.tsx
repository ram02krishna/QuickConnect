"use client";

import * as React from "react";
import { useEffect, useState, use, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@hooks/useChatStore";
import { useSocketStore } from "@hooks/useSocketStore";
import { useAuthStore } from "@hooks/useAuthStore";
import { ChatHeader } from "@components/chat/ChatHeader";
import { MessageList } from "@components/chat/MessageList";
import { MessageInput } from "@components/chat/MessageInput";
import { ProfilePanel } from "@components/profile/ProfilePanel";
import api from "@lib/api";
import { toast } from "sonner";

const EMPTY_MESSAGES: any[] = [];

export default function ChatDetailPage({ params }: { params: Promise<{ chatId: string }> }) {
  const resolvedParams = use(params);
  const chatId = resolvedParams.chatId;
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const socket = useSocketStore((state) => state.socket);
  const isConnected = useSocketStore((state) => state.isConnected);
  
  const selectedChatId = useChatStore((state) => state.selectedChatId);
  const setSelectedChatId = useChatStore((state) => state.setSelectedChatId);
  const messages = useChatStore((state) => state.messages[chatId] ?? EMPTY_MESSAGES);
  const setMessages = useChatStore((state) => state.setMessages);
  const addMessage = useChatStore((state) => state.addMessage);
  const upsertChat = useChatStore((state) => state.upsertChat);

  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [hasSetSelected, setHasSetSelected] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSearchMatch, setActiveSearchMatch] = useState(0);

  const searchMatches = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return [];
    return messages.filter((message) => {
      const attachmentNames = (message.attachments || [])
        .map((attachment: any) => attachment.fileName || "")
        .join(" ");
      return `${message.content || ""} ${attachmentNames}`.toLocaleLowerCase().includes(query);
    });
  }, [messages, searchQuery]);

  useEffect(() => {
    setActiveSearchMatch(0);
  }, [searchQuery]);

  const navigateSearch = useCallback((direction: "up" | "down") => {
    if (searchMatches.length === 0) return;
    setActiveSearchMatch((current) =>
      direction === "down"
        ? (current + 1) % searchMatches.length
        : (current - 1 + searchMatches.length) % searchMatches.length
    );
  }, [searchMatches.length]);

  // Redirect back to chats list if the selected chat ID gets cleared/deleted
  useEffect(() => {
    if (selectedChatId === chatId) {
      setHasSetSelected(true);
    } else if (hasSetSelected && selectedChatId === null) {
      router.push("/chats");
    }
  }, [selectedChatId, chatId, hasSetSelected, router]);

  // 1. Join Socket Room on Chat Load
  useEffect(() => {
    setSelectedChatId(chatId);

    if (socket && isConnected) {
      socket.emit("chat:join", { chatId });
    }

    return () => {
      if (socket) {
        socket.emit("chat:leave", { chatId });
        setSelectedChatId(null);
      }
    };
  }, [chatId, socket, isConnected, setSelectedChatId]);

  // 2. Strict Authentication & Membership Verification on Direct URL Open
  useEffect(() => {
    let isCancelled = false;

    const verifyAndLoadChat = async () => {
      const currentToken = useAuthStore.getState().token;
      if (!currentToken) {
        window.location.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      setLoading(true);
      try {
        // Step A: Verify chat existence and user membership with backend
        const chatRes = await api.get(`/chats/${chatId}`);
        if (isCancelled) return;
        
        const fetchedChat = chatRes.data.data.chat;
        upsertChat(fetchedChat);

        // Step B: Fetch messages for this verified chat
        const msgRes = await api.get(`/messages/${chatId}`);
        if (isCancelled) return;

        const fetchedMessages = msgRes.data.data.messages;
        setMessages(chatId, fetchedMessages);
        if (fetchedMessages.length < 30) {
          useChatStore.getState().setHasMoreMessages(chatId, false);
        } else {
          useChatStore.getState().setHasMoreMessages(chatId, true);
        }
      } catch (err: any) {
        if (isCancelled) return;
        console.error("Chat verification error:", err);
        
        if (err.response?.status === 401) {
          useAuthStore.getState().logout();
          window.location.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        } else if (err.response?.status === 403 || err.response?.status === 404) {
          setAccessDenied(true);
          toast.error("You are not authorized to access this conversation.");
          router.replace("/chats");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    void verifyAndLoadChat();

    return () => {
      isCancelled = true;
    };
  }, [chatId, upsertChat, setMessages, router]);

  // 3. Mark messages as read when chat is opened or new messages load in
  useEffect(() => {
    if (!socket || !isConnected || !user?.id || messages.length === 0) return;

    const unreadMessages = messages.filter(
      (m) =>
        m.senderId !== user.id &&
        !m.id.startsWith("temp-") &&
        !m.receipts?.some((r: any) => r.userId === user.id && r.readAt)
    );

    if (unreadMessages.length > 0) {
      socket.emit("message:read", {
        messageIds: unreadMessages.map((m) => m.id),
        chatId,
      });
    }
  }, [chatId, messages, user?.id, socket, isConnected]);

  const sendMyMessage = useCallback(async (
    content: string,
    type: string,
    replyToId?: string | null,
    attachments?: any[]
  ) => {
    const tempId = `temp-${Date.now()}`;
    const tempMsg: any = {
      id: tempId,
      chatId,
      senderId: user?.id || "",
      type,
      content,
      createdAt: new Date().toISOString(),
      sender: {
        id: user?.id || "",
        name: user?.name || "Me",
        username: user?.username || "me",
        avatarUrl: user?.avatarUrl || null,
      },
      attachments: attachments || [],
      isSending: true,
      receipts: [],
    };

    addMessage(chatId, tempMsg);

    try {
      const res = await api.post(`/messages/${chatId}`, {
        content,
        type,
        attachments,
      });

      const message = res.data.data.message;
      useChatStore.getState().resolveOptimisticMessage(chatId, tempId, message);
    } catch (err) {
      console.error("Error sending message:", err);
      useChatStore.getState().failOptimisticMessage(chatId, tempId);
    }
  }, [chatId, addMessage, user]);

  const handleRetryMessage = useCallback(async (msg: any) => {
    const tempId = msg.id;
    useChatStore.getState().retryOptimisticMessage(chatId, tempId);

    try {
      const res = await api.post(`/messages/${chatId}`, {
        content: msg.content,
        type: msg.type,
        attachments: msg.attachments || [],
      });
      const message = res.data.data.message;
      useChatStore.getState().resolveOptimisticMessage(chatId, tempId, message);
    } catch (err) {
      console.error("Error retrying message:", err);
      useChatStore.getState().failOptimisticMessage(chatId, tempId);
    }
  }, [chatId]);

  const loadOlderMessages = useCallback(async () => {
    if (loadingMore || messages.length === 0) return;
    const hasMore = useChatStore.getState().hasMoreMessages[chatId] !== false;
    if (!hasMore) return;

    const oldestId = messages[0].id;
    if (oldestId.startsWith("temp-")) return;

    setLoadingMore(true);
    try {
      const res = await api.get(`/messages/${chatId}?cursor=${oldestId}&limit=30`);
      const oldMessages = res.data.data.messages;
      if (oldMessages.length < 30) {
        useChatStore.getState().setHasMoreMessages(chatId, false);
      } else {
        useChatStore.getState().setHasMoreMessages(chatId, true);
      }
      useChatStore.getState().prependMessages(chatId, oldMessages);
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [chatId, messages, loadingMore]);

  if (accessDenied) {
    return (
      <div className="chat-canvas flex-1 flex flex-col items-center justify-center h-full text-zinc-500 gap-3 p-6 select-none">
        <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">Access Denied</p>
        <p className="text-xs text-zinc-500">You are not authorized to view this chat.</p>
      </div>
    );
  }

  return (
    <div className="chat-canvas flex-1 flex h-full min-w-0 text-zinc-900 dark:text-zinc-100 relative overflow-hidden">
      <div className="flex-1 flex flex-col h-full min-w-0 relative z-10 border-r border-zinc-200/70 dark:border-zinc-800 bg-transparent">
        
        <ChatHeader
          chatId={chatId}
          onToggleProfile={() => setShowProfilePanel(!showProfilePanel)}
          isProfileOpen={showProfilePanel}
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchMatchCount={searchMatches.length}
          activeSearchMatch={activeSearchMatch}
          onSearchNavigate={navigateSearch}
        />

        <MessageList
          chatId={chatId}
          messages={messages}
          searchQuery={searchQuery}
          searchTargetId={searchMatches[activeSearchMatch]?.id}
          onLoadMore={loadOlderMessages}
          loadingMore={loadingMore}
          isLoading={loading}
          onRetry={handleRetryMessage}
        />

        {/* Input Bar */}
        <MessageInput
          chatId={chatId}
          onSendMessage={sendMyMessage}
        />
      </div>

      {showProfilePanel && (
        <div className="absolute inset-0 sm:relative sm:w-80 flex-shrink-0 h-full border-l border-zinc-200 dark:border-zinc-800 z-30 shadow-md bg-white dark:bg-zinc-900">
          <ProfilePanel
            chatId={chatId}
            onClose={() => setShowProfilePanel(false)}
          />
        </div>
      )}
    </div>
  );
}
