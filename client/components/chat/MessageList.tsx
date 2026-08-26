"use client";

import * as React from "react";
import { useEffect, useState, useMemo, useRef } from "react";
import { Virtuoso } from "react-virtuoso";
import { MessageBubble } from "./MessageBubble";
import { MessageCircleOff } from "lucide-react";
import { useChatStore } from "@hooks/useChatStore";

interface MessageListProps {
  chatId: string;
  messages: any[];
  searchQuery?: string;
  searchTargetId?: string;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  isLoading?: boolean;
  onRetry?: (message: any) => void;
}

export function MessageList({
  chatId,
  messages,
  searchQuery,
  searchTargetId,
  onLoadMore,
  loadingMore,
  isLoading = false,
  onRetry,
}: MessageListProps) {
  const virtuosoRef = useRef<any>(null);

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    
    return date.toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const filteredMessages = useMemo(() => {
    const query = searchQuery?.trim().toLocaleLowerCase();
    if (!query) return messages;

    return messages.filter((message) => {
      const messageText = message.content || "";
      const attachmentNames = (message.attachments || [])
        .map((attachment: any) => attachment.fileName || "")
        .join(" ");
      return `${messageText} ${attachmentNames}`.toLocaleLowerCase().includes(query);
    });
  }, [messages, searchQuery]);

  const items = useMemo(() => {
    const flatList: any[] = [];
    let currentDate = "";

    filteredMessages.forEach((msg) => {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== currentDate) {
        flatList.push({ type: "date", value: msgDate, id: `date-${msgDate}` });
        currentDate = msgDate;
      }
      flatList.push({ type: "message", value: msg, id: msg.id });
    });
    
    return flatList;
  }, [filteredMessages]);

  useEffect(() => {
    if (!searchTargetId) return;
    const targetIndex = items.findIndex((item) => item.type === "message" && item.value.id === searchTargetId);
    if (targetIndex >= 0) {
      virtuosoRef.current?.scrollToIndex({ index: targetIndex, align: "center", behavior: "smooth" });
    }
  }, [items, searchTargetId]);

  const currentChat = useChatStore((state: any) => state.chats.find((c: any) => c.id === chatId));
  const hasHistory = currentChat?.lastMessage != null;

  if (messages.length === 0) {
    if (isLoading && hasHistory) {
      return null;
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-2 p-6 select-none">
        <div className="bg-white dark:bg-zinc-900 px-8 py-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center relative overflow-hidden group">
          <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-600/10 rounded-full flex items-center justify-center mb-4">
            <MessageCircleOff size={32} className="text-zinc-600 dark:text-zinc-500" />
          </div>
          <p className="text-base font-bold text-[#111b21] dark:text-[#e9edef] mb-1.5">No messages yet</p>
          <p className="text-base text-[#667781] dark:text-[#8696a0] text-center max-w-[240px] leading-relaxed">
            Send a message below to start the conversation in real-time. Say hello! ??
          </p>
        </div>
      </div>
    );
  }

  if (messages.length > 0 && filteredMessages.length === 0 && searchQuery?.trim()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-2 p-6 select-none">
        <div className="bg-white dark:bg-zinc-900 px-6 py-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center">
          <p className="text-base font-bold text-[#111b21] dark:text-[#e9edef]">No matches found</p>
          <p className="text-base text-[#667781] dark:text-[#8696a0] text-center max-w-xs mt-1.5 leading-relaxed">
            No messages in this chat match your search query.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
      <div className="flex-1 h-full w-full absolute inset-0">
        <Virtuoso
          ref={virtuosoRef}
          style={{ height: "100%", width: "100%" }}
          data={items}
          firstItemIndex={0}
          initialTopMostItemIndex={items.length - 1}
          alignToBottom={true}
          followOutput={(isAtBottom: boolean) => isAtBottom ? "smooth" : false}
          startReached={onLoadMore}
          components={{
            Header: () => loadingMore ? (
              <div className="flex justify-center py-3 select-none">
                <span className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 bg-white/80 dark:bg-zinc-800/80 px-3 py-1.5 rounded-full shadow-xs border border-zinc-200 dark:border-white/5">
                  Loading previous messages...
                </span>
              </div>
            ) : <div style={{ height: "16px" }} />,
            Footer: () => <div style={{ height: "36px" }} className="w-full pointer-events-none" />
          }}
          itemContent={(index, item) => {
            if (item.type === "date") {
              return (
                <div className="flex justify-center my-3 select-none w-full">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-3 py-1 bg-white/90 dark:bg-zinc-800/90 rounded-full shadow-xs border border-zinc-200/80 dark:border-white/5 backdrop-blur-sm">
                    {formatDateHeader(item.value)}
                  </span>
                </div>
              );
            }

            return (
              <div className="px-3 sm:px-4 py-1.5 w-full">
                <MessageBubble
                  message={item.value}
                  searchQuery={searchQuery}
                  isActiveSearchMatch={item.value.id === searchTargetId}
                  onRetry={onRetry}
                />
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}

