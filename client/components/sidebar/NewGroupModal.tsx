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
    const uploadFile = new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });
    const sigRes = await api.get("/media/signature?folder=chat-app/general");
    const { signature, timestamp, cloudName, apiKey, folder } = sigRes.data.data;
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("folder", folder);
    const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: "POST",
      body: formData,
    });
    if (!cloudinaryRes.ok) throw new Error("Failed to upload group image");
    const uploadedFile = await cloudinaryRes.json();
    return uploadedFile.secure_url as string;
  };

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

  const toggleSelectUser = (user: any) => {
    if (selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (selectedUsers.length < 1) {
      alert("Please select at least 1 other member for the group.");
      return;
    }

    setCreating(true);
    try {
      const uploadedPhotoUrl = groupImage ? await uploadGroupImage(groupImage) : "";
      const res = await api.post("/chats/group", {
        title,
        photoUrl: uploadedPhotoUrl || undefined,
        memberIds: selectedUsers.map((u) => u.id),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none p-4">
      <div className="bg-white dark:bg-[#222e35] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-zinc-200/50 dark:border-white/5 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200/50 dark:border-white/5">
          <div className="flex items-center gap-2 text-zinc-600">
            <Users size={22} />
            <h3 className="text-lg font-bold text-zinc-900 dark:text-[#e9edef]">Create Group</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-white/5 text-[#54656f] dark:text-[#aebac1] hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col overflow-hidden pt-4 gap-4">
          
          {/* Group details */}
          <div className="space-y-3">
            <div>
              <label className="block text-base uppercase font-bold tracking-wider text-zinc-450 dark:text-zinc-500 mb-1.5">
                Group Subject *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Type group name here..."
                maxLength={80}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200/60 dark:border-white/5 ios-glass-input text-base sm:text-base text-zinc-900 dark:text-[#e9edef] placeholder-[#667781] dark:placeholder-[#8696a0] focus:outline-none"
              />
              <p className="text-right text-xs text-zinc-400 dark:text-zinc-500 mt-1">{title.length}/80</p>
            </div>
            <div>
              <label className="block text-base uppercase font-bold tracking-wider text-zinc-450 dark:text-zinc-500 mb-1.5">
                Group Photo (Optional)
              </label>
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-zinc-300 dark:border-white/15 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-white/5 cursor-pointer"
              >
                <Avatar src={groupImagePreview || "/logo.png"} name={title || "New group"} size="sm" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-zinc-700 dark:text-zinc-200 truncate">
                    {groupImage ? groupImage.name : "Choose from this computer"}
                  </span>
                  <span className="block text-xs text-zinc-400 dark:text-zinc-500">PNG, JPG or WEBP up to 10MB</span>
                </span>
                <ImageIcon size={17} className="text-zinc-400 flex-shrink-0" />
              </button>
            </div>
          </div>

          {/* Members Search & List */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-base uppercase font-bold tracking-wider text-zinc-450 dark:text-zinc-500">
                Add Members ({selectedUsers.length} selected)
              </label>
              {selectedUsers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedUsers([])}
                  className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Selected Users Chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 max-h-20 overflow-y-auto no-scrollbar py-0.5">
                {selectedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-600/10 text-blue-650 dark:text-zinc-500 border border-zinc-600/15 text-base font-semibold cursor-pointer hover:bg-zinc-600/20 transition-all select-none"
                  >
                    <Avatar src={u.avatarUrl} name={u.name} size="xs" />
                    <span>{u.name.split(" ")[0]}</span>
                    <button
                      type="button"
                      onClick={() => removeSelectedUser(u.id)}
                      className="rounded-full hover:bg-zinc-600/15 p-0.5 cursor-pointer"
                      aria-label={`Remove ${u.name}`}
                    >
                      <X size={10} className="stroke-[3px]" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="relative mb-3 flex-shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667781] dark:text-[#8696a0] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search username (min 2 chars)"
                className="w-full pl-9 pr-8 py-2.5 sm:py-2 rounded-xl border border-zinc-200/60 dark:border-white/5 ios-glass-input text-base sm:text-base text-zinc-800 dark:text-[#e9edef] placeholder-[#667781] dark:placeholder-[#8696a0] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667781] hover:text-zinc-950 transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
              {searching ? (
                <div className="flex items-center justify-center py-6 text-zinc-400">
                  <Loader2 size={20} className="animate-spin text-zinc-600" />
                </div>
              ) : searchQuery.trim().length >= 2 && searchResults.length === 0 ? (
                <p className="text-center text-base text-zinc-400 dark:text-zinc-500 py-6">No users found</p>
              ) : searchQuery.trim().length < 2 ? (
                <p className="text-center text-base text-zinc-450 dark:text-zinc-500 py-6">
                  Search for users to add them to the group
                </p>
              ) : (
                searchResults.map((u) => {
                  const isChecked = selectedUsers.some((su) => su.id === u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleSelectUser(u)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-zinc-600/10 border-zinc-600/20 text-zinc-950 dark:text-white"
                          : "border-transparent hover:bg-zinc-150 dark:hover:bg-white/5 text-zinc-800 dark:text-[#e9edef]"
                      }`}
                    >
                      <Avatar src={u.avatarUrl} name={u.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold truncate">{u.name}</p>
                        <p className="text-base text-zinc-450 truncate">@{u.username}</p>
                      </div>
                      <div
                        className={`h-4 w-4 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked
                            ? "bg-zinc-600 border-zinc-600 text-white"
                            : "border-zinc-350 dark:border-white/20"
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
          <div className="flex gap-2 pt-3 border-t border-zinc-200/50 dark:border-white/5 flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1 rounded-xl"
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl bg-zinc-600 hover:bg-zinc-700 text-white font-bold"
              disabled={creating || !title.trim() || selectedUsers.length < 1}
            >
              {creating ? (
                <div className="flex items-center justify-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" />
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
