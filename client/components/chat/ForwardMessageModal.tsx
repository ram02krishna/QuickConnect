"use client";

import * as React from "react";
import { useState } from "react";
import { X, Search, Forward, Loader2 } from "lucide-react";
import { Avatar } from "@components/ui/Avatar";
import { useAuthStore } from "@hooks/useAuthStore";
import { useChatStore } from "@hooks/useChatStore";

interface ForwardMessageModalProps {
  messageToForward: any;
  onClose: () => void;
  onForward: (chatId: string) => Promise<void>;
}

export function ForwardMessageModal({ messageToForward, onClose, onForward }: ForwardMessageModalProps) {
  const [search, setSearch] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  const chats = useChatStore((state) => state.chats);
  const user = useAuthStore((state) => state.user);
  
  // Filter out the chat where the message originated
  const filteredChats = chats
    .filter(c => c.id !== messageToForward?.chatId)
    .filter(c => c.title?.toLowerCase().includes(search.toLowerCase()) || 
      c.members?.some((m: any) => m.user?.name?.toLowerCase().includes(search.toLowerCase())));

  const handleForwardClick = async (chatId: string) => {
    setIsSending(true);
    try {
      await onForward(chatId);
      onClose();
    } catch (err) {
      console.error("Failed to forward:", err);
      setIsSending(false);
    }
  };

  const getChatName = (chat: any) => {
    if (chat.type === "GROUP") return chat.title || "Group Chat";
    const partner = chat.members?.find((m: any) => m.userId !== user?.id);
    return partner?.user?.name || "Saved Messages";
  };

  const getChatAvatar = (chat: any) => {
    if (chat.type === "GROUP") return chat.photoUrl || "/logo.png";
    const partner = chat.members?.find((m: any) => m.userId !== user?.id);
    return partner?.user?.avatarUrl;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111b21] rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-white/10">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Forward size={18} className="text-zinc-600" />
            Forward message to
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-3 border-b border-zinc-100 dark:border-white/5 bg-white dark:bg-[#182229]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search chats or contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#222e35] border border-zinc-200 dark:border-white/5 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-600/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[60vh]">
          {filteredChats.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 dark:text-zinc-400 text-base">
              No recent chats found to forward to.
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  disabled={isSending}
                  onClick={() => handleForwardClick(chat.id)}
                  className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-[#182229] transition-colors cursor-pointer border-b border-zinc-100 dark:border-white/5 last:border-0 text-left disabled:opacity-50"
                >
                  <Avatar src={getChatAvatar(chat)} name={getChatName(chat)} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {getChatName(chat)}
                    </p>
                  </div>
                  <div className="p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-600/10 text-zinc-600 flex-shrink-0">
                    <Forward size={14} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {isSending && (
          <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
            <Loader2 className="animate-spin text-zinc-600" size={32} />
          </div>
        )}

      </div>
    </div>
  );
}
