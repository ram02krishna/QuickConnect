"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Send, Smile, Paperclip, X, Loader2, Mic, Trash2 } from "lucide-react";
import { useSocketStore } from "@hooks/useSocketStore";
import { useAuthStore } from "@hooks/useAuthStore";
import { useChatStore } from "@hooks/useChatStore";
import api from "@lib/api";

interface MessageInputProps {
  chatId: string;
  onSendMessage: (content: string, type: string, replyToId?: string | null, attachments?: any[]) => Promise<void>;
  replyingTo?: any | null;
  onCancelReply?: () => void;
}

export function MessageInput({ chatId, onSendMessage, replyingTo, onCancelReply }: MessageInputProps) {
  const socket = useSocketStore((state) => state.socket);
  const user = useAuthStore((state) => state.user);
  const chat = useChatStore((state) => state.chats.find(c => c.id === chatId));

  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isBlockedByMe = false;
  const cannotMessage = false;

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const draftKey = `quickconnect:draft:${chatId}`;

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(draftKey);
    setText(savedDraft || "");
  }, [draftKey]);

  useEffect(() => {
    const saveDraft = window.setTimeout(() => {
      if (text.trim()) {
        window.localStorage.setItem(draftKey, text);
      } else {
        window.localStorage.removeItem(draftKey);
      }
    }, 250);

    return () => window.clearTimeout(saveDraft);
  }, [draftKey, text]);

  const emojis = ["😀", "😂", "😍", "👍", "🔥", "🎉", "👏", "❤️", "🙌", "🙏", "😮", "😢", "🌟", "💡", "🚀", "✨", "💯", "✅"];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);

    if (!socket || !user) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing:start", { chatId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("typing:stop", { chatId });
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current && socket) {
        socket.emit("typing:stop", { chatId });
        isTypingRef.current = false;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [chatId, socket]);

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      if (isTypingRef.current && socket) {
        socket.emit("typing:stop", { chatId });
        isTypingRef.current = false;
      }

      const content = text;
      setText("");
      window.localStorage.removeItem(draftKey);

      await onSendMessage(content, "TEXT", replyingTo?.id || null);
      if (replyingTo && onCancelReply) onCancelReply();
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    let msgType = "FILE";
    if (file.type.startsWith("image/")) msgType = "IMAGE";
    else if (file.type.startsWith("video/")) msgType = "VIDEO";
    else if (file.type.startsWith("audio/")) msgType = "AUDIO";

    const maxSize = msgType === "IMAGE" ? 10 * 1024 * 1024 : msgType === "VIDEO" ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
    
    if (file.size > maxSize) {
      alert(`File is too large. Maximum size is ${maxSize / 1024 / 1024}MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    
    // Check if the file is an image and compress it
    if (file.type.startsWith("image/")) {
      try {
        const imageCompression = (await import("browser-image-compression")).default;
        const options = {
          maxSizeMB: 1, // compress down to 1MB
          maxWidthOrHeight: 1920, // max 1080p resolution
          useWebWorker: true
        };
        file = await imageCompression(file, options);
      } catch (err) {
        console.error("Compression error:", err);
      }
    }

    try {
      // 1. Get signature from our backend
      const sigRes = await api.get(`/media/signature?folder=chat-app/${chatId || "general"}`);
      const { signature, timestamp, cloudName, apiKey, folder } = sigRes.data.data;

      // 2. Upload directly to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", folder);

      const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });

      if (!cloudinaryRes.ok) {
        throw new Error("Failed to upload to Cloudinary");
      }

      const uploadedFile = await cloudinaryRes.json();

      let msgType = "FILE";
      if (file.type.startsWith("image/")) msgType = "IMAGE";
      else if (file.type.startsWith("video/")) msgType = "VIDEO";
      else if (file.type.startsWith("audio/")) msgType = "AUDIO";

      const attachment = {
        fileName: file.name,
        fileType: msgType,
        fileSize: file.size,
        fileUrl: uploadedFile.secure_url,
        mimeType: file.type,
        thumbUrl: msgType === "IMAGE" || msgType === "VIDEO" 
          ? uploadedFile.secure_url.replace("/upload/", "/upload/c_fill,h_300,w_300/") 
          : null,
      };

      await onSendMessage(file.name, msgType, replyingTo?.id || null, [attachment]);
      if (replyingTo && onCancelReply) onCancelReply();
    } catch (err: any) {
      console.error("File upload error:", err);
      alert(err.message || err.response?.data?.message || "File upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── Voice Recording Handlers ──────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size < 1000) {
          // Discard empty or very short recordings
          console.warn("Discarding too short audio recording.");
          return;
        }

        const file = new File([audioBlob], `voice-message-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        await uploadAudioFile(file);

        // Stop all tracks on the stream to release the mic
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing mic:", err);
      alert("Could not access microphone. Please check your browser permissions.");
    }
  };

  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      cleanupRecording();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Override onstop to just stop stream and discard
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current.stop();
      cleanupRecording();
    }
  };

  const cleanupRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordingTime(0);
  };

  const uploadAudioFile = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      alert("Audio file is too large. Maximum size is 50MB.");
      return;
    }

    setUploading(true);

    try {
      // 1. Get signature from our backend
      const sigRes = await api.get(`/media/signature?folder=chat-app/${chatId || "general"}`);
      const { signature, timestamp, cloudName, apiKey, folder } = sigRes.data.data;

      // 2. Upload directly to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", folder);

      const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });

      if (!cloudinaryRes.ok) {
        throw new Error("Failed to upload to Cloudinary");
      }

      const uploadedFile = await cloudinaryRes.json();

      const attachment = {
        fileName: file.name,
        fileType: "AUDIO",
        fileSize: file.size,
        fileUrl: uploadedFile.secure_url,
        mimeType: file.type,
        thumbUrl: null,
      };

      await onSendMessage("Voice Message", "AUDIO", replyingTo?.id || null, [attachment]);
      if (replyingTo && onCancelReply) onCancelReply();
    } catch (err: any) {
      console.error("Audio message upload error:", err);
      alert(err.message || err.response?.data?.message || "Failed to upload audio message.");
    } finally {
      setUploading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isBlockedByMe) {
    return (
      <div className="p-4 bg-zinc-100 dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#222e35]/30">
        <div className="flex flex-col items-center justify-center p-3 text-center">
          <p className="text-base font-semibold text-zinc-900 dark:text-[#e9edef]">You blocked this contact</p>
          <p className="text-base text-zinc-500 dark:text-[#8696a0] mt-1">Tap to unblock and send a message.</p>
        </div>
      </div>
    );
  }

  if (cannotMessage) {
    return (
      <div className="p-4 bg-zinc-100 dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#222e35]/30 flex items-center justify-center">
        <p className="text-base text-[#8696a0] font-medium bg-[#111b21]/5 dark:bg-white/5 py-2 px-4 rounded-xl">
          Only admins can send messages
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="surface-glass p-3 border-t border-slate-200/70 dark:border-white/5 relative z-20 text-zinc-900 dark:text-zinc-100 select-none">

      {replyingTo && (
        <div className="flex items-center justify-between p-2.5 mb-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-base">
          <div className="flex items-start gap-2 border-l-4 border-blue-500 pl-2.5 py-0.5">
            <div>
              <p className="font-bold text-blue-600 dark:text-blue-400">
                Replying to {replyingTo.sender.name}
              </p>
              <p className="text-[#667781] dark:text-[#8696a0] truncate max-w-[200px] sm:max-w-md mt-0.5">
                {replyingTo.content}
              </p>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1.5 sm:p-1 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 active:bg-zinc-300/50 dark:active:bg-zinc-600/40 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {isRecording ? (
        <div className="flex items-center gap-2 relative">
          <div className="flex-1 flex items-center justify-between bg-zinc-150 dark:bg-[#1f2c34] px-4 py-2.5 rounded-xl border border-zinc-200/40 dark:border-white/5">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse inline-block" />
              <span className="text-base font-bold text-red-500 uppercase tracking-wider">Recording</span>
              <span className="text-base font-semibold text-zinc-650 dark:text-zinc-300 ml-1">
                {formatDuration(recordingTime)}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-2 sm:p-1.5 rounded-full hover:bg-red-500/10 active:bg-red-500/20 text-red-500 transition-colors cursor-pointer flex items-center justify-center"
                title="Discard recording"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={stopAndSendRecording}
                disabled={uploading}
                className="p-2.5 sm:p-2 rounded-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50"
                title="Send voice message"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSendText} className="flex items-center gap-2 relative">

          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={uploading}
              className={`p-2.5 sm:p-2 rounded-full transition-all cursor-pointer ${showEmojiPicker
                  ? "bg-zinc-200/60 dark:bg-zinc-700/50 text-blue-500 dark:text-blue-400"
                  : "hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 active:bg-zinc-300/50 dark:active:bg-zinc-600/40 text-[#54656f] dark:text-[#aebac1]"
                }`}
              title="Emojis"
            >
              <Smile size={19} />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-14 left-0 p-3 bg-white dark:bg-[#1f2c34] border border-zinc-200/80 dark:border-white/10 rounded-2xl shadow-2xl z-20 grid grid-cols-6 gap-2 w-56 max-w-[calc(100vw-32px)]">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className="hover:scale-125 transition-transform text-xl cursor-pointer p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2 sm:p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 active:bg-zinc-300/50 dark:active:bg-zinc-600/40 text-zinc-500 dark:text-zinc-400 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex-shrink-0"
            title="Attach"
          >
            {uploading ? <Loader2 size={19} className="animate-spin text-sky-500" /> : <Paperclip size={19} />}
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={text}
              onChange={handleInputChange}
              placeholder={uploading ? "Uploading file..." : "Type a message..."}
              disabled={uploading}
              className="w-full px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white/90 dark:bg-black/20 shadow-xs text-sm sm:text-[15px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all disabled:opacity-50"
            />
          </div>

          {text.trim() || uploading ? (
            <button
              type="submit"
              disabled={!text.trim() || uploading}
              className="p-2 sm:p-2 rounded-full bg-sky-500 hover:bg-sky-600 active:scale-95 text-white transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center flex-shrink-0 shadow-xs"
            >
              <Send size={17} />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="p-2.5 sm:p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-[#2a3942] active:bg-zinc-300/50 dark:active:bg-zinc-600/40 text-[#54656f] dark:text-[#aebac1] hover:text-blue-500 transition-all cursor-pointer flex items-center justify-center flex-shrink-0"
              title="Record voice message"
            >
              <Mic size={19} className="text-blue-500 dark:text-blue-400" />
            </button>
          )}
        </form>
      )}
    </div>
    </div>
  );
}
