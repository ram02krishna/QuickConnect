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

const EMPTY_MESSAGES: any[] = [];

export default function ChatDetailPage({ params }: { params: Promise<{ chatId: string }> }) {
  const resolvedParams = use(params);
  const chatId = resolvedParams.chatId;
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const socket = useSocketStore((state) => state.socket);
  const isConnected = useSocketStore((state) => state.isConnected);
  
  const selectedChatId = useChatStore((state) => state.selectedChatId);
  const setSelectedChatId = useChatStore((state) => state.setSelectedChatId);
  const messages = useChatStore((state) => state.messages[chatId] ?? EMPTY_MESSAGES);
  const setMessages = useChatStore((state) => state.setMessages);
  const addMessage = useChatStore((state) => state.addMessage);

  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [loading, setLoading] = useState(() => {
    const cached = useChatStore.getState().messages[chatId];
    return !cached || cached.length === 0;
  });
  const [hasSetSelected, setHasSetSelected] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Reset loading status when chatId changes to support fast transitions if cache exists
  useEffect(() => {
    const cached = useChatStore.getState().messages[chatId];
    setLoading(!cached || cached.length === 0);
  }, [chatId]);

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

  // 2. Fetch Messages from REST API
  useEffect(() => {
    const fetchMessages = async () => {
      const cached = useChatStore.getState().messages[chatId];
      if (cached && cached.length > 0) {
        setLoading(false);
        return;
      }
      if (!cached || cached.length === 0) {
        setLoading(true);
      }
      try {
        const res = await api.get(`/messages/${chatId}`);
        const fetchedMessages = res.data.data.messages;
        setMessages(chatId, fetchedMessages);
        if (fetchedMessages.length < 30) {
          useChatStore.getState().setHasMoreMessages(chatId, false);
        } else {
          useChatStore.getState().setHasMoreMessages(chatId, true);
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setLoading(false);
      }
    };

    if (isConnected) {
      void fetchMessages();
    }
  }, [chatId, setMessages, isConnected]);

  // 3. Mark messages as read when chat is opened or new messages load in
  useEffect(() => {
    if (!socket || !isConnected || !user?.id || messages.length === 0) return;

    // Emit message:read for all messages from others that haven't been read by me yet
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
