"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@components/auth/AuthCard";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";
import api from "@lib/api";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/register", {
        name,
        username,
        email,
        password,
      });

      const { user } = res.data.data;

      router.push(`/verify-email?userId=${user.id}&email=${encodeURIComponent(user.email)}`);
    } catch (err: any) {
      console.warn("Registration failed:", err.message || err);
      setError(err.response?.data?.message || "Failed to create account. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Create Account" subtitle="Join QuickConnect and start messaging">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-base text-red-400 font-medium">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider pl-1">
            Full Name
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider pl-1">
            Username
          </label>
          <Input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider pl-1">
            Email Address
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider pl-1">
            Password
          </label>
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
          {loading ? "Creating account..." : "Sign Up"}
        </Button>

        <p className="text-center text-base text-zinc-500 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-brand-primary hover:text-brand-hover font-bold transition-colors"
          >
            Sign In
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
