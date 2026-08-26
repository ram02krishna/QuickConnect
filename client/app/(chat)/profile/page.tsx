"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Save,
  BadgeCheck,
  Copy,
  CheckCircle2,
  MessageCircle,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "@hooks/useAuthStore";
import imageCompression from "browser-image-compression";
import { Avatar } from "@components/ui/Avatar";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";
import api from "@lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState((user as any)?.bio || "");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    let isActive = true;
    const loadProfile = async () => {
      try {
        const res = await api.get("/users/me");
        const profile = res.data.data.user;
        if (!isActive) return;
        updateUser(profile);
        setName(profile.name || "");
        setUsername(profile.username || "");
        setBio(profile.bio || "");
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };
    void loadProfile();
    return () => {
      isActive = false;
    };
  }, [updateUser]);

  const copyHandle = async () => {
    if (!user?.username) return;
    try {
      await navigator.clipboard.writeText(`@${user.username}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy your profile handle.");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await api.patch("/users/me", {
        name,
        username,
        bio,
      });

      updateUser(res.data.data.user);
      setName(res.data.data.user.name);
      setUsername(res.data.data.user.username);
      setBio(res.data.data.user.bio || "");
      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from your current password.");
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      setPasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      setPasswordError(err.response?.data?.message || "Failed to change password. Please verify your current password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Image is too large. Maximum size is 10MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setError("");
    setSuccess("");
    setUploading(true);

    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      const compressedImageFile = new File([compressedFile], file.name, {
        type: compressedFile.type,
        lastModified: Date.now(),
      });

      // 1. Get signature for avatars
      const sigRes = await api.get(`/media/signature?folder=chat-app/avatars`);
      const { signature, timestamp, cloudName, apiKey, folder } = sigRes.data.data;

      // 2. Upload directly to Cloudinary
      const formData = new FormData();
      formData.append("file", compressedImageFile);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", folder);

      const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });

      if (!cloudinaryRes.ok) {
        throw new Error("Failed to upload avatar to Cloudinary");
      }

      const uploadedFile = await cloudinaryRes.json();

      // 3. Update the avatar URL in our backend
      await api.patch("/media/avatar", {
        avatarUrl: uploadedFile.secure_url,
      });

      updateUser({ avatarUrl: uploadedFile.secure_url });
      setSuccess("Profile picture updated successfully!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || err.response?.data?.message || "Failed to upload avatar.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="chat-canvas flex-1 flex flex-col h-full text-zinc-900 dark:text-zinc-100 select-none overflow-y-auto transition-colors duration-300">
      {/* Header */}
      <div className="surface-glass p-4 flex items-center justify-between border-b border-slate-200/70 dark:border-white/5 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/chats")}
            className="p-1.5 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 text-[#54656f] dark:text-[#aebac1] hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-[#111b21] dark:text-[#e9edef]">Account Settings</h2>
        </div>
      </div>

      {/* Profile Form Area */}
      <div className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Profile Card Header */}
        <div className="surface-glass rounded-3xl border border-zinc-200/80 dark:border-white/10 p-6 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-black/10 flex flex-col items-center gap-4 text-center">
          {/* Avatar Upload Container */}
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <Avatar src={user?.avatarUrl} name={user?.name} size="xl" className="shadow-2xl border-2 border-white/10" />

            <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center border border-white/10">
              {uploading ? (
                <Loader2 className="animate-spin text-white h-8 w-8" />
              ) : (
                <Camera className="text-white h-8 w-8" />
              )}
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            className="hidden"
            accept="image/*"
            disabled={uploading}
          />

          <div>
            <h3 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-1.5 mt-2">
              {user?.name}
              {user?.emailVerified && <BadgeCheck size={24} className="text-sky-500" />}
            </h3>
            <p className="text-base text-zinc-500 font-medium">@{user?.username}</p>
          </div>
          <button
            type="button"
            onClick={copyHandle}
            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-sky-600 bg-sky-500/10 hover:bg-sky-500/20 dark:text-sky-400 transition-colors cursor-pointer"
          >
            {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
            {copied ? "Handle copied" : "Copy profile handle"}
          </button>
        </div>

        {/* Profile Details Form */}
        <form onSubmit={handleUpdateProfile} className="surface-glass rounded-3xl border border-zinc-200/80 dark:border-white/10 p-5 sm:p-7 shadow-xl shadow-slate-200/40 dark:shadow-black/10 space-y-5">
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-white/5 pb-3">
            <BadgeCheck size={18} className="text-sky-500" />
            <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Personal Information</h4>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-sm text-red-400 font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-sm text-emerald-400 font-medium">
              {success}
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1">
              Full Name
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              disabled={loading || uploading}
            />
          </div>

          {/* Username */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1">
              Username
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              required
              disabled={loading || uploading}
            />
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              rows={3}
              maxLength={160}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white/90 text-zinc-900 shadow-xs placeholder-zinc-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all duration-200 text-sm dark:border-white/10 dark:bg-black/10 dark:text-zinc-100 dark:placeholder-zinc-500"
              disabled={loading || uploading}
            />
            <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400 dark:text-zinc-500">
              <span>Visible to everyone you chat with.</span>
              <span>{bio.length}/160</span>
            </div>
          </div>

          <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-zinc-200/70 dark:border-white/5 bg-zinc-100/70 dark:bg-white/5">
              <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Email</p>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate mt-0.5">{user?.email}</p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-200/70 dark:border-white/5 bg-zinc-100/70 dark:bg-white/5">
              <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Status</p>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                <CheckCircle2 size={13} />
                {user?.emailVerified ? "Verified Account" : "Unverified"}
              </p>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2 py-3 flex items-center justify-center gap-2 shadow-md shadow-sky-500/10"
            disabled={loading || uploading}
          >
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <>
                <Save size={18} />
                Save Profile Changes
              </>
            )}
          </Button>
        </form>

        {/* Change Password Form */}
        <form onSubmit={handleChangePassword} className="surface-glass rounded-3xl border border-zinc-200/80 dark:border-white/10 p-5 sm:p-7 shadow-xl shadow-slate-200/40 dark:shadow-black/10 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-white/5 pb-3">
            <KeyRound size={18} className="text-sky-500" />
            <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Change Password</h4>
          </div>

          {passwordError && (
            <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-sm text-red-400 font-medium">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-sm text-emerald-400 font-medium">
              {passwordSuccess}
            </div>
          )}

          {/* Current Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1">
              Current Password
            </label>
            <div className="relative flex items-center">
              <Input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                disabled={passwordLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1">
              New Password (Min 8 characters)
            </label>
            <div className="relative flex items-center">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new secure password"
                required
                disabled={passwordLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1">
              Confirm New Password
            </label>
            <div className="relative flex items-center">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                disabled={passwordLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-zinc-100/70 dark:bg-white/5 px-3.5 py-2.5 text-xs text-zinc-500 dark:text-zinc-400">
            <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0" />
            <span>After changing your password, your active session remains secure.</span>
          </div>

          <Button
            type="submit"
            variant="shimmer"
            className="w-full mt-2 py-3 flex items-center justify-center gap-2"
            disabled={passwordLoading}
          >
            {passwordLoading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <>
                <Lock size={17} />
                Update Password
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
