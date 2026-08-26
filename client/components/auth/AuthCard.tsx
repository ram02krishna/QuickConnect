"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

interface AuthCardProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthCard({ children, title, subtitle }: AuthCardProps) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center p-4 overflow-hidden bg-white dark:bg-zinc-950 select-none">
      <button
        type="button"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className="absolute top-5 right-5 z-20 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white/80 text-zinc-600 shadow-sm backdrop-blur transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
        title={resolvedTheme === "dark" ? "Use light theme" : "Use dark theme"}
        aria-label={resolvedTheme === "dark" ? "Use light theme" : "Use dark theme"}
      >
        {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Card */}  
      <div
        className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md z-10"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1.5 text-base text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
