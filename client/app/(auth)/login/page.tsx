"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@components/auth/AuthCard";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";
import api from "@lib/api";
import { useAuthStore } from "@hooks/useAuthStore";
import { useSocketStore } from "@hooks/useSocketStore";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const connectSocket = useSocketStore((state) => state.connectSocket);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const device = getDeviceDetails();
      const res = await api.post("/auth/login", {
        identifier,
        password,
      }, {
        headers: {
          "x-device-name": device.name,
          "x-device-type": device.type,
        }
      });

      const { user, token } = res.data.data;
      setAuth(user, token);
      connectSocket(token);
      router.push("/chats");
    } catch (err: any) {
      console.warn("Login failed:", err.message || err);
      const msg = err.response?.data?.message || "Invalid credentials — please try again.";

      if (err.response?.status === 403 && msg.toLowerCase().includes("verify")) {
        setError("Your account is not fully verified. Please register again or request a verification code.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Welcome Back" subtitle="Sign in to your QuickConnect account">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-base text-red-400 font-medium">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider pl-1">
            Username or Email
          </label>
          <Input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="username or email@example.com"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between pl-1">
            <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-brand-primary hover:text-brand-hover font-medium transition-colors"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative flex items-center">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
              disabled={loading}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <Button type="submit" variant="shimmer" className="w-full mt-2 py-3" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>

        <p className="text-center text-base text-zinc-500 mt-6">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="text-brand-primary hover:text-brand-hover font-bold transition-colors"
          >
            Sign Up
          </Link>
        </p>
        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors">
            Return to Home
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}

function getDeviceDetails() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { name: "Web Client", type: "DESKTOP" };
  }

  const ua = navigator.userAgent;
  let os = "Unknown OS";
  let browser = "Web Client";
  let type = "DESKTOP";

  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) { os = "Android"; type = "MOBILE"; }
  else if (/iphone|ipad|ipod/i.test(ua)) { os = "iOS"; type = "MOBILE"; }
  else if (/linux/i.test(ua)) os = "Linux";

  if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua) && !/opr|opera/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = "Safari";
  else if (/edge|edg/i.test(ua)) browser = "Edge";
  else if (/opr|opera/i.test(ua)) browser = "Opera";

  return {
    name: `${browser} on ${os}`,
    type: type
  };
}
