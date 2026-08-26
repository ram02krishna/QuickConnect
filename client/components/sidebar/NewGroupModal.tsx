"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { X, Search, Loader2, Users, Check, Image as ImageIcon } from "lucide-react";
import imageCompression from "browser-image-compression";
import { Avatar } from "@components/ui/Avatar";
import { Button } from "@components/ui/Button";
import api from "@lib/api";

interface NewGroupModalProps {
  onClose: () => void;
  onGroupCreated: (chat: any) => void;
}

export function NewGroupModal({ onClose, onGroupCreated }: NewGroupModalProps) {
  const [title, setTitle] = useState("");
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [groupImagePreview, setGroupImagePreview] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers((users) => users.filter((user) => user.id !== userId));
  };

  useEffect(() => {
    if (!groupImage) {
      setGroupImagePreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(groupImage);
    setGroupImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [groupImage]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Image is too large. Maximum size is 10MB.");
      event.target.value = "";
      return;
    }
    setGroupImage(file);
  };

  const uploadGroupImage = async (file: File) => {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    });
    const normalizedFile = new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });

    const sigRes = await api.get("/media/signature?folder=chat-app/avatars");
    const { signature, timestamp, cloudName, apiKey, folder } = sigRes.data.data;

    const formData = new FormData();
    formData.append("file", normalizedFile);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("folder", folder);

    const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: "POST",
      body: formData,
    });

    if (!cloudinaryRes.ok) {
      throw new Error("Failed to upload group avatar");
    }

    const uploaded = await cloudinaryRes.json();
    return uploaded.secure_url as string;
  };

  // Debounced user search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data.data.users || []);
      } catch (err) {
        console.error("Search users failed:", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const toggleSelectUser = (user: any) => {
    if (selectedUsers.some((u) => u.id === user.id)) {
      removeSelectedUser(user.id);
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (selectedUsers.length < 1) {
      alert("Please select at least 1 member to form a group.");
      return;
    }

    setCreating(true);
    try {
      let photoUrl: string | undefined;
      if (groupImage) {
        photoUrl = await uploadGroupImage(groupImage);
      }

      const memberIds = selectedUsers.map((u) => u.id);
      const res = await api.post("/chats/group", {
        title: title.trim(),
        photoUrl: photoUrl || undefined,
        memberIds,
      });

      const newChat = res.data.data.chat;
      onGroupCreated(newChat);
      onClose();
    } catch (err: any) {
      console.error("Group creation error:", err);
      alert(err.response?.data?.message || "Failed to create group.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[88vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-sky-500">
            <Users size={20} />
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">Create Group</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col overflow-hidden pt-3.5 gap-3.5">
          
          {/* Group details */}
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Type group name here..."
                maxLength={80}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20"
              />
              <p className="text-right text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{title.length}/80</p>
            </div>
            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
                Group Photo (Optional)
              </label>
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
              >
                <Avatar src={groupImagePreview || "/logo.png"} name={title || "New group"} size="sm" />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 truncate">
                    {groupImage ? groupImage.name : "Choose group picture"}
                  </span>
                  <span className="block text-[10px] text-zinc-400">PNG, JPG or WEBP up to 10MB</span>
                </span>
                <ImageIcon size={16} className="text-zinc-400 flex-shrink-0" />
              </button>
            </div>
          </div>

          {/* Members Search & List */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                Add Members ({selectedUsers.length} selected)
              </label>
              {selectedUsers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedUsers([])}
                  className="text-xs font-semibold text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Selected Users Chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2 max-h-16 overflow-y-auto no-scrollbar py-0.5">
                {selectedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-semibold select-none"
                  >
                    <Avatar src={u.avatarUrl} name={u.name} size="xs" />
                    <span>{u.name.split(" ")[0]}</span>
                    <button
                      type="button"
                      onClick={() => removeSelectedUser(u.id)}
                      className="rounded-full hover:bg-sky-500/20 p-0.5 cursor-pointer"
                      aria-label={`Remove ${u.name}`}
                    >
                      <X size={10} className="stroke-[3px]" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="relative mb-2 flex-shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search username (min 2 chars)"
                className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-sky-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin pr-1">
              {searching ? (
                <div className="flex items-center justify-center py-5 text-zinc-400">
                  <Loader2 size={18} className="animate-spin text-sky-500" />
                </div>
              ) : searchQuery.trim().length >= 2 && searchResults.length === 0 ? (
                <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-5">No users found</p>
              ) : searchQuery.trim().length < 2 ? (
                <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-5">
                  Search for users to add them to the group
                </p>
              ) : (
                searchResults.map((u) => {
                  const isChecked = selectedUsers.some((su) => su.id === u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleSelectUser(u)}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-sky-500/10 border-sky-500/30 text-zinc-950 dark:text-white"
                          : "border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                      }`}
                    >
                      <Avatar src={u.avatarUrl} name={u.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold truncate">{u.name}</p>
                        <p className="text-[11px] text-zinc-400 truncate">@{u.username}</p>
                      </div>
                      <div
                        className={`h-4 w-4 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked
                            ? "bg-sky-500 border-sky-500 text-white"
                            : "border-zinc-300 dark:border-zinc-600"
                        }`}
                      >
                        {isChecked && <Check size={10} className="stroke-[3px]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2.5 border-t border-zinc-200 dark:border-zinc-800 flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1 rounded-xl text-xs"
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-xs"
              disabled={creating || !title.trim() || selectedUsers.length < 1}
            >
              {creating ? (
                <div className="flex items-center justify-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" />
                  Creating...
                </div>
              ) : (
                "Create Group"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
