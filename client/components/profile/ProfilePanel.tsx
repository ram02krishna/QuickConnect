"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Image, FileText, Download, Plus, Trash2, Edit2, Check, Loader2, LogOut, Search, Play } from "lucide-react";
import { Avatar } from "@components/ui/Avatar";
import { Button } from "@components/ui/Button";
import { useChatStore } from "@hooks/useChatStore";
import { useAuthStore } from "@hooks/useAuthStore";
import api, { API_BASE_URL } from "@lib/api";

const EMPTY_MESSAGES: any[] = [];

interface ProfilePanelProps {
  onClose: () => void;
  chatId: string;
}

export function ProfilePanel({ onClose, chatId }: ProfilePanelProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const chats = useChatStore((state) => state.chats);
  const messages = useChatStore((state) => state.messages[chatId] ?? EMPTY_MESSAGES);
  const onlineStatuses = useChatStore((state) => state.onlineStatuses);

  // Find target chat
  const chat = chats.find((c) => c.id === chatId);

  // Tabs: members (groups only), media, files
  const [activeTab, setActiveTab] = useState<"members" | "media" | "files">(
    chat?.type === "GROUP" ? "members" : "media"
  );

  // Group editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  // Group member adding state
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Resolve partner details for DMs
  const getPartner = () => {
    if (chat?.type === "DIRECT" && user) {
      const partner = chat.members?.find((m: any) => m.userId !== user.id)?.user;
      return {
        name: partner?.name || "User",
        username: partner?.username || "user",
        avatarUrl: partner?.avatarUrl,
        bio: (partner as any)?.bio || "Hey there! I am using QuickConnect.",
        id: partner?.id || "",
        email: partner?.email || null,
      };
    }
    return {
      name: chat?.title || "Group Chat",
      username: `group-${chatId.slice(0, 6)}`,
      avatarUrl: chat?.photoUrl || "/logo.png",
      bio: "Group Chat with multiple participants",
      id: "",
      email: null,
    };
  };

  const partner = getPartner();
  const isOnline = chat?.type === "DIRECT" && onlineStatuses[partner.id] === "online";

  // Gather all attachments from messages in this chat
  const allAttachments = messages.flatMap((m: any) => m.attachments || []);
  const mediaFiles = allAttachments.filter(
    (att: any) =>
      att.fileType === "IMAGE" ||
      att.fileType === "VIDEO" ||
      att.mimeType?.startsWith("image/") ||
      att.mimeType?.startsWith("video/")
  );
  const documentFiles = allAttachments.filter(
    (att: any) =>
      att.fileType === "DOCUMENT" ||
      att.fileType === "FILE" ||
      (!att.mimeType?.startsWith("image/") &&
        !att.mimeType?.startsWith("video/") &&
        !att.mimeType?.startsWith("audio/"))
  );

  // Member search effect with debounce
  useEffect(() => {
    if (!memberSearchQuery.trim() || memberSearchQuery.length < 2) {
      setMemberSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearchingMembers(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(memberSearchQuery)}`);
        const users = res.data.data.users || [];
        const existingMemberIds = new Set(chat?.members.map((m: any) => m.userId));
        setMemberSearchResults(users.filter((u: any) => !existingMemberIds.has(u.id)));
      } catch (err) {
        console.error("Failed to search users:", err);
      } finally {
        setSearchingMembers(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [memberSearchQuery, chat?.members]);

  if (!chat) return null;

  const handleDownload = (url: string, filename: string) => {
    const downloadUrl = `${API_BASE_URL}/media/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(filename)}`;
    window.location.href = downloadUrl;
  };

  const isGroupManager = chat.createdBy === user?.id;

  const canRemoveMember = (member: any) => {
    if (member.userId === user?.id) return false;
    return chat.createdBy === user?.id;
  };

  // Group Info Edit
  const handleSaveTitle = async () => {
    if (!newTitle.trim() || newTitle === chat.title) {
      setIsEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      await api.patch(`/chats/${chat.id}`, { title: newTitle });
      useChatStore.getState().updateChat(chat.id, { title: newTitle });
      setIsEditingTitle(false);
    } catch (err) {
      console.error("Failed to save title:", err);
      alert("Failed to update group name.");
    } finally {
      setSavingTitle(false);
    }
  };

  // Member management actions
  const handleAddMember = async (targetUser: any) => {
    setActionInProgress(targetUser.id);
    try {
      await api.post(`/chats/${chat.id}/members`, { userId: targetUser.id });
      const newMemberObj = {
        id: `temp-${Date.now()}`,
        userId: targetUser.id,
        chatId: chat.id,
        createdAt: new Date().toISOString(),
        joinedAt: new Date().toISOString(),
        user: targetUser,
      };
      useChatStore.getState().updateChat(chat.id, {
        members: [...chat.members, newMemberObj],
      });
      setMemberSearchQuery("");
      setMemberSearchResults([]);
    } catch (err) {
      console.error("Failed to add member:", err);
      alert("Could not add user to the group.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    setActionInProgress(targetUserId);
    try {
      await api.delete(`/chats/${chat.id}/members/${targetUserId}`);
      useChatStore.getState().updateChat(chat.id, {
        members: chat.members.filter((m) => m.userId !== targetUserId),
      });
    } catch (err) {
      console.error("Failed to remove member:", err);
      alert("Could not remove member from the group.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
      await api.delete(`/chats/${chat.id}/leave`);
      useChatStore.getState().deleteChat(chat.id);
      onClose();
      router.push("/chats");
    } catch (err) {
      console.error("Failed to leave group:", err);
      alert("Failed to leave group.");
    }
  };

  return (
    <div className="w-full flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 select-none text-zinc-900 dark:text-zinc-100 relative z-20 overflow-hidden">
      {/* Header */}
      <div className="p-3.5 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">Contact Details</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Profile Info */}
      <div className="p-4 flex flex-col items-center text-center border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <Avatar
          src={partner.avatarUrl}
          name={partner.name}
          size="xl"
          showStatus={chat.type === "DIRECT"}
          isOnline={isOnline}
          className="mb-2 shadow-md h-20 w-20 text-3xl"
        />

        {isEditingTitle ? (
          <div className="flex items-center gap-1.5 mt-1 w-full max-w-xs">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-sky-500 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                else if (e.key === "Escape") setIsEditingTitle(false);
              }}
            />
            <button
              onClick={handleSaveTitle}
              disabled={savingTitle}
              className="p-1.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 cursor-pointer disabled:opacity-50"
            >
              {savingTitle ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 max-w-full">
            <h4 className="text-base sm:text-lg font-bold truncate text-zinc-900 dark:text-zinc-100">{partner.name}</h4>
            {chat.type === "GROUP" && isGroupManager && (
              <button
                onClick={() => {
                  setNewTitle(chat.title || "");
                  setIsEditingTitle(true);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                title="Edit Group Subject"
              >
                <Edit2 size={13} />
              </button>
            )}
          </div>
        )}

        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
          {chat.type === "DIRECT" ? `@${partner.username}` : `${chat.members.length} participants`}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 px-2 italic line-clamp-2 leading-relaxed">
          "{partner.bio}"
        </p>

        {chat.type === "DIRECT" && partner.email && (
          <div className="w-full mt-3 space-y-1">
            <div className="w-full flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Email Address</span>
              <span className="text-xs font-semibold truncate w-full text-zinc-800 dark:text-zinc-200 select-all">{partner.email}</span>
            </div>
          </div>
        )}
      </div>

      {/* Media / Files / Members Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold overflow-x-auto no-scrollbar bg-white dark:bg-zinc-900">
        {chat.type === "GROUP" && (
          <button
            onClick={() => setActiveTab("members")}
            className={`px-3.5 py-2.5 text-center border-b-2 flex-shrink-0 cursor-pointer transition-colors ${
              activeTab === "members"
                ? "border-sky-500 text-sky-600 dark:text-sky-400 font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            Members ({chat.members.length})
          </button>
        )}
        <button
          onClick={() => setActiveTab("media")}
          className={`px-3.5 py-2.5 text-center border-b-2 flex-shrink-0 cursor-pointer transition-colors ${
            activeTab === "media"
              ? "border-sky-500 text-sky-600 dark:text-sky-400 font-bold"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          Media ({mediaFiles.length})
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`px-3.5 py-2.5 text-center border-b-2 flex-shrink-0 cursor-pointer transition-colors ${
            activeTab === "files"
              ? "border-sky-500 text-sky-600 dark:text-sky-400 font-bold"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          Files ({documentFiles.length})
        </button>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-y-auto p-3.5 scrollbar-thin">
        {/* Members Tab */}
        {activeTab === "members" && chat.type === "GROUP" && (
          <div className="space-y-3">
            {/* Add member section */}
            {isGroupManager && (
              <div>
                {!showAddMember ? (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    <Plus size={14} className="stroke-[2.5px]" /> Add Member
                  </button>
                ) : (
                  <div className="space-y-2 border border-zinc-200 dark:border-zinc-800 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase">Search User</span>
                      <button
                        onClick={() => {
                          setShowAddMember(false);
                          setMemberSearchQuery("");
                        }}
                        className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        placeholder="Search username"
                        className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    {/* Member Add Search Results */}
                    {searchingMembers ? (
                      <div className="flex justify-center py-2"><Loader2 size={14} className="animate-spin text-sky-500" /></div>
                    ) : memberSearchQuery.trim().length >= 2 && memberSearchResults.length === 0 ? (
                      <p className="text-xs text-zinc-400 py-1 text-center">No users found</p>
                    ) : (
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                        {memberSearchResults.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => handleAddMember(u)}
                            className="flex items-center justify-between p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar src={u.avatarUrl} name={u.name} size="xs" />
                              <span className="text-xs font-semibold truncate text-zinc-800 dark:text-zinc-200">{u.name}</span>
                            </div>
                            <button
                              disabled={actionInProgress === u.id}
                              className="p-1 rounded bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-55"
                            >
                              {actionInProgress === u.id ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Members List */}
            <div className="space-y-2">
              {chat.members.map((member) => {
                const isMe = member.userId === user?.id;
                const canBeRemoved = canRemoveMember(member);
                const memberRole = member.userId === chat.createdBy ? "OWNER" : "MEMBER";

                return (
                  <div key={member.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar src={member.user.avatarUrl} name={member.user.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100">
                          {isMe ? "You" : member.user.name}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">@{member.user.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                        memberRole === "OWNER"
                          ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                      }`}>
                        {memberRole}
                      </span>
                      {canBeRemoved && (
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          disabled={actionInProgress === member.userId}
                          className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer disabled:opacity-50"
                          title="Remove from group"
                        >
                          {actionInProgress === member.userId ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Leave Group Action */}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLeaveGroup}
                className="w-full border-red-500/20 hover:border-red-500/40 text-red-500 hover:bg-red-500/10 flex items-center justify-center gap-1.5 font-semibold text-xs"
              >
                <LogOut size={13} /> Leave Group
              </Button>
            </div>
          </div>
        )}

        {/* Media Tab */}
        {activeTab === "media" && (
          mediaFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 text-zinc-400 dark:text-zinc-500">
              <Image size={24} className="mb-1.5 opacity-40" />
              <span className="text-xs font-medium">No media shared</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {mediaFiles.map((att) => {
                const isVid = att.mimeType?.startsWith("video/") || att.fileType === "VIDEO";
                return (
                  <div
                    key={att.id}
                    onClick={() => handleDownload(att.fileUrl, att.fileName)}
                    className="aspect-square rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 relative group cursor-pointer hover:border-sky-500 transition-colors"
                  >
                    {isVid ? (
                      <video src={att.fileUrl} className="h-full w-full object-cover pointer-events-none" />
                    ) : (
                      <img src={att.fileUrl} alt="media" className="h-full w-full object-cover" />
                    )}
                    {isVid && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <span className="p-1 rounded-full bg-black/60 text-white shadow-sm flex items-center justify-center">
                          <Play size={10} fill="currentColor" className="ml-0.5" />
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                      <Download size={14} className="text-white" />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Files Tab */}
        {activeTab === "files" && (
          documentFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 text-zinc-400 dark:text-zinc-500">
              <FileText size={24} className="mb-1.5 opacity-40" />
              <span className="text-xs font-medium">No documents shared</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {documentFiles.map((att) => (
                <div
                  key={att.id}
                  onClick={() => handleDownload(att.fileUrl, att.fileName)}
                  className="flex items-center gap-2.5 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-sky-600 dark:text-sky-400 flex-shrink-0">
                    <FileText size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate text-zinc-900 dark:text-zinc-100">{att.fileName}</p>
                    <p className="text-[11px] text-zinc-400">
                      {(att.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Download size={13} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex-shrink-0" />
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
