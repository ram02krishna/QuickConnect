import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Download, FileText, Play, Loader2, AlertCircle, Check, CheckCheck, Clock, MoreHorizontal, Trash2, RotateCcw } from "lucide-react";
import { cn } from "@lib/utils";
import { useAuthStore } from "@hooks/useAuthStore";
import { useChatStore } from "@hooks/useChatStore";
import { Avatar } from "@components/ui/Avatar";
import api, { API_BASE_URL } from "@lib/api";
import { CustomAudioPlayer } from "./CustomAudioPlayer";
import { MediaLightbox } from "./MediaLightbox";

export interface MessageBubbleProps {
  message: any;
  searchQuery?: string;
  isActiveSearchMatch?: boolean;
  onRetry?: (message: any) => void;
}

export function MessageBubble({ message, searchQuery, isActiveSearchMatch = false, onRetry }: MessageBubbleProps) {
  const user = useAuthStore((state) => state.user);
  
  // Lightbox viewer states
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState("");
  const [lightboxType, setLightboxType] = useState<"IMAGE" | "VIDEO" | "PDF">("IMAGE");
  const [lightboxName, setLightboxName] = useState("");
  const [isDeleteMenuOpen, setIsDeleteMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDeleteMenuOpen) return;

    const closeMenu = (event: PointerEvent) => {
      if (!deleteMenuRef.current?.contains(event.target as Node)) {
        setIsDeleteMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [isDeleteMenuOpen]);

  const isSelf = message.senderId === user?.id;
  const isDeletedForEveryone = Boolean(message.deletedForEveryoneAt);
  const isMediaOnly = message.attachments && message.attachments.length > 0 &&
    message.attachments.some((att: any) => att.fileType === "IMAGE" || att.fileType === "VIDEO") &&
    (message.content === message.attachments[0]?.fileName || !message.content);

  const handleDownload = (url: string, filename: string) => {
    const downloadUrl = `${API_BASE_URL}/media/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(filename)}`;
    window.location.href = downloadUrl;
  };

  const chat = useChatStore((state) => state.chats.find(c => c.id === message.chatId));
  const otherMembersCount = chat ? Math.max(1, chat.members.length - 1) : 1;
  const receipts = message.receipts || [];
  
  const deliveredCount = receipts.filter((r: any) => r.deliveredAt || r.readAt).length;
  const readCount = receipts.filter((r: any) => r.readAt).length;
  
  const isRead = readCount >= otherMembersCount;
  const isDelivered = deliveredCount >= otherMembersCount;

  const handleDelete = async (scope: "me" | "everyone") => {
    if (scope === "everyone" && !window.confirm("Delete this message for everyone? This cannot be undone.")) return;

    setIsDeleting(true);
    try {
      await api.delete(`/messages/${message.chatId}/${message.id}`, { data: { scope } });
      if (scope === "me") {
        useChatStore.getState().removeMessageForMe(message.chatId, message.id);
      } else {
        useChatStore.getState().markMessageDeletedForEveryone(message.chatId, message.id);
      }
      setIsDeleteMenuOpen(false);
    } catch (error: any) {
      console.error("Failed to delete message:", error);
      alert(error.response?.data?.message || "Could not delete this message.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={cn(
        "flex gap-2.5 sm:gap-3 w-full max-w-2xl px-2 sm:px-4 py-1 transition-all relative group justify-start",
        isSelf ? "ml-auto flex-row-reverse pb-3" : "mr-auto flex-row pb-2"
      )}
    >

      <div className={cn("flex flex-col max-w-[88%] sm:max-w-[78%] md:max-w-[70%]", isSelf ? "items-end" : "items-start")}>
        {!isSelf && (
          <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 pl-2 mb-0.5">
            {message.sender.name}
          </span>
        )}

        <div
          className={cn(
            isMediaOnly
              ? "p-1 rounded-2xl relative border overflow-hidden"
              : "px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl relative border text-[14.5px] sm:text-[15px] leading-relaxed font-sans break-words whitespace-pre-wrap shadow-xs",
            isSelf
              ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white border-sky-500/60 rounded-tr-xs shadow-sky-500/10"
              : "bg-white/95 dark:bg-[#202c33] text-zinc-900 dark:text-zinc-100 border-zinc-200/80 dark:border-white/5 rounded-tl-xs",
            isDeletedForEveryone && "bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-white/10 italic",
            message.isSending && "opacity-70",
            message.hasFailed && "border-red-500/30 bg-red-50 text-red-500 dark:bg-red-900/10"
          )}
        >
          {!isDeletedForEveryone && !message.isSending && !message.id.startsWith("temp-") && (
              <div ref={deleteMenuRef} className="absolute right-1 top-1 z-50">
              <button
                type="button"
                onClick={() => setIsDeleteMenuOpen((open) => !open)}
                className="rounded-full bg-white/80 p-1 text-zinc-500 opacity-0 shadow-sm transition-opacity hover:text-zinc-900 group-hover:opacity-100 focus:opacity-100 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:text-white"
                aria-label="Message actions"
                title="Message actions"
              >
                <MoreHorizontal size={15} />
              </button>
              {isDeleteMenuOpen && (
                <div className={cn("absolute top-8 z-50 min-w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 text-left text-sm not-italic text-zinc-700 shadow-xl dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100", isSelf ? "right-0" : "left-0")}>
                  <button type="button" onClick={() => void handleDelete("me")} disabled={isDeleting} className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-white/10">
                    <Trash2 size={14} /> Delete for me
                  </button>
                  {isSelf && (
                    <button type="button" onClick={() => void handleDelete("everyone")} disabled={isDeleting} className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10">
                      <Trash2 size={14} /> Delete for everyone
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-2 mb-2 select-none">
              {message.attachments.map((att: any, attachmentIndex: number) => {
                const attachmentKey = att.id || `${message.id}-attachment-${attachmentIndex}`;
                const isImg = att.mimeType?.startsWith("image/") || att.fileType === "IMAGE";
                const isVid = att.mimeType?.startsWith("video/") || att.fileType === "VIDEO";
                const isAud = att.mimeType?.startsWith("audio/") || att.fileType === "AUDIO";

                if (isImg) {
                  return (
                    <div
                      key={attachmentKey}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxUrl(att.fileUrl);
                        setLightboxType("IMAGE");
                        setLightboxName(att.fileName);
                        setLightboxOpen(true);
                      }}
                      className={cn(
                        "relative rounded-xl overflow-hidden max-w-sm group cursor-pointer",
                        isMediaOnly ? "" : "border border-zinc-200/50 dark:border-white/5"
                      )}
                    >
                      <img src={att.fileUrl} alt={att.fileName} className="max-h-64 object-contain transition-transform duration-300 hover:scale-[1.02]" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDownload(att.fileUrl, att.fileName);
                        }}
                        className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/85 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center z-10"
                        title="Download image"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  );
                }

                if (isVid) {
                  return (
                    <div
                      key={attachmentKey}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxUrl(att.fileUrl);
                        setLightboxType("VIDEO");
                        setLightboxName(att.fileName);
                        setLightboxOpen(true);
                      }}
                      className={cn(
                        "relative rounded-xl overflow-hidden max-w-sm group cursor-pointer",
                        isMediaOnly ? "" : "border border-zinc-200/50 dark:border-white/5"
                      )}
                    >
                      <video src={att.fileUrl} className="max-h-64 object-contain pointer-events-none" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/35 transition-colors">
                        <span className="p-2.5 rounded-full bg-zinc-600 text-white shadow-lg flex items-center justify-center">
                          <Play size={16} fill="currentColor" className="ml-0.5" />
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDownload(att.fileUrl, att.fileName);
                        }}
                        className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/85 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center z-10"
                        title="Download video"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  );
                }

                if (isAud) {
                  return (
                    <div key={attachmentKey} className="flex flex-col gap-1.5 p-1 max-w-xs">
                      <CustomAudioPlayer
                        src={att.fileUrl}
                        isSelf={isSelf}
                        onDownload={() => handleDownload(att.fileUrl, att.fileName)}
                      />
                    </div>
                  );
                }

                const isPdf = att.mimeType === "application/pdf" || att.fileName.toLowerCase().endsWith(".pdf");

                return (
                  <div
                    key={attachmentKey}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPdf) {
                        setLightboxUrl(att.fileUrl);
                        setLightboxType("PDF");
                        setLightboxName(att.fileName);
                        setLightboxOpen(true);
                      } else {
                        handleDownload(att.fileUrl, att.fileName);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer max-w-xs select-none",
                      isSelf
                        ? "bg-black/10 hover:bg-black/15 border-white/10"
                        : "bg-black/5 dark:bg-black/15 border-zinc-250/20 dark:border-white/5 hover:bg-black/10 dark:hover:bg-black/25"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center h-9 w-9 rounded-lg flex-shrink-0 transition-colors",
                        isSelf
                          ? "bg-white/20 text-white"
                          : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-500"
                      )}
                    >
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs sm:text-sm font-semibold truncate", isSelf ? "text-white" : "text-zinc-800 dark:text-zinc-200")}>
                        {att.fileName}
                      </p>
                      <p className={cn("text-[11px] font-medium", isSelf ? "text-sky-100/90" : "text-zinc-500 dark:text-zinc-400")}>
                        {(att.fileSize / 1024).toFixed(1)} KB {isPdf && "• PDF"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(att.fileUrl, att.fileName);
                      }}
                      className={cn(
                        "p-1.5 rounded-full transition-colors flex-shrink-0",
                        isSelf
                          ? "hover:bg-white/10 text-white/80 hover:text-white"
                          : "hover:bg-zinc-250/50 dark:hover:bg-zinc-750/50 text-[#54656f] dark:text-[#aebac1] hover:text-zinc-950 dark:hover:text-white"
                      )}
                      title="Download file"
                    >
                      <Download size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {(!message.attachments || message.attachments.length === 0 || message.content !== message.attachments[0]?.fileName) &&
          message.type !== "AUDIO" && (
            <div className="flex flex-col gap-2">
              <p className="select-text">
                {(() => {
                  const text = message.content || "";
                  if (!searchQuery || !text || !isActiveSearchMatch) return text;
                  const parts = text.split(
                    new RegExp(`(${searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi")
                  );
                  return (
                    <span>
                      {parts.map((part: string, index: number) =>
                        part.toLowerCase() === searchQuery.toLowerCase() ? (
                          <mark
                            key={index}
                            className="bg-zinc-300 text-black px-0.5 rounded font-semibold animate-pulse-slow select-text"
                          >
                            {part}
                          </mark>
                        ) : (
                          part
                        )
                      )}
                    </span>
                  );
                })()}
              </p>
            </div>
          )}

          <div
            className={cn(
              "flex items-center justify-end gap-1 mt-1 text-xs select-none",
              isMediaOnly
                ? "absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-white border border-white/10 z-20"
                : isSelf
                ? "text-white/80"
                : "text-zinc-500 dark:text-zinc-400"
            )}
          >
            <span className="text-[10.5px] tabular-nums font-medium">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        {isSelf && (
          <>
            {message.hasFailed && onRetry ? (
              <button
                type="button"
                onClick={() => onRetry(message)}
                title="Tap to retry"
                className="absolute right-5 bottom-0 translate-y-1/2 flex items-center gap-1 rounded-full px-1.5 py-0.5 shadow-sm bg-red-500 text-white text-[10px] font-semibold cursor-pointer hover:bg-red-600 active:bg-red-700 transition-colors select-none"
              >
                <RotateCcw size={10} />
                <span>Retry</span>
              </button>
            ) : (
              <span className={cn("absolute right-5 bottom-0 translate-y-1/2 flex items-center rounded-full p-0.5 shadow-sm", isRead ? "text-green-700 bg-white" : (isMediaOnly ? "text-white/90 bg-black/60" : "text-white/70 bg-white/90"))}>
                {message.isSending ? (
                  <Clock size={12} />
                ) : message.hasFailed ? (
                  <AlertCircle size={12} className="text-red-400" />
                ) : isRead ? (
                  <CheckCheck size={15} />
                ) : isDelivered ? (
                  <CheckCheck size={15} />
                ) : (
                  <Check size={15} />
                )}
              </span>
            )}
          </>
        )}
      </div>

      {!isSelf ? (
        <Avatar src={message.sender.avatarUrl} name={message.sender.name} size="sm" className="mt-0.5 flex-shrink-0" />
      ) : (
        <div className="w-1 flex-shrink-0" />
      )}

      {lightboxOpen && (
        <MediaLightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          mediaUrl={lightboxUrl}
          mediaType={lightboxType}
          fileName={lightboxName}
        />
      )}
    </div>
  );
}
