"use client";

import Link from "next/link";
import {
  MessageCircle,
  Users,
  Video,
  Phone,
  ShieldCheck,
  Search,
  Mic,
  FileText,
  ArrowRight,
  Github,
  Moon,
  Sun,
  Maximize2,
  Lock,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@components/ui/Button";
import { useTheme } from "next-themes";

export default function LandingPage() {
  const { resolvedTheme, setTheme } = useTheme();

  const features = [
    {
      icon: MessageCircle,
      title: "Real-time Messaging",
      description:
        "Sub-millisecond message delivery powered by optimized WebSockets with instant delivery ticks and read receipts.",
      gradient: "from-blue-500/10 to-sky-500/10 border-blue-500/20 text-blue-500",
    },
    {
      icon: Video,
      title: "HD Video & Voice Calls",
      description:
        "Crystal-clear 1-to-1 and group video calls with adaptive WebRTC mesh streaming, acoustic volume controls, and frame fitting.",
      gradient: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-500",
    },
    {
      icon: Maximize2,
      title: "Floating PiP Call Widget",
      description:
        "Minimize calls into a floating Picture-in-Picture window so you can navigate chats and use the entire app uninterrupted.",
      gradient: "from-purple-500/10 to-indigo-500/10 border-purple-500/20 text-purple-500",
    },
    {
      icon: Users,
      title: "Collaborative Groups",
      description:
        "Create custom groups, manage participants, and experience named real-time typing indicators with smooth sync.",
      gradient: "from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-500",
    },
    {
      icon: Lock,
      title: "End-to-End Encryption",
      description:
        "Enterprise-grade AES-256 payload encryption ensuring all your messages, media files, and contacts remain strictly private.",
      gradient: "from-rose-500/10 to-pink-500/10 border-rose-500/20 text-rose-500",
    },
    {
      icon: Mic,
      title: "Voice Notes & Audio Player",
      description:
        "Record crisp voice messages with interactive audio waveform players, adjustable playback speeds, and seekbars.",
      gradient: "from-cyan-500/10 to-sky-500/10 border-cyan-500/20 text-cyan-500",
    },
    {
      icon: Search,
      title: "Instant In-Chat Search",
      description:
        "Search through thousands of conversations and media attachments with real-time match counters and keyboard shortcuts.",
      gradient: "from-violet-500/10 to-fuchsia-500/10 border-violet-500/20 text-violet-500",
    },
    {
      icon: FileText,
      title: "Rich Media & Lightbox",
      description:
        "Share full-resolution photos, videos, and documents with built-in media lightboxes and high-speed signed downloads.",
      gradient: "from-emerald-500/10 to-green-500/10 border-emerald-500/20 text-emerald-500",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col select-none">
      {/* Navbar */}
      <header className="border-b border-zinc-200/80 dark:border-white/5 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="QuickConnect Logo" className="w-8 h-8 rounded-xl object-contain shadow-xs" />
            <span className="font-bold text-lg sm:text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300">
              QuickConnect
            </span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
              title={resolvedTheme === "dark" ? "Use light theme" : "Use dark theme"}
              aria-label="Toggle Theme"
            >
              {resolvedTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <Link
              href="/login"
              className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            >
              Sign In
            </Link>
            <Link href="/signup">
              <Button size="sm" className="shadow-sm">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto w-full">
        {/* Release Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-semibold mb-6 animate-pulse">
          <Sparkles size={14} />
          <span>QuickConnect 2.0 • WebSockets + WebRTC + Mesh Video Calls</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl mb-6 text-transparent bg-clip-text bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-600 dark:from-white dark:via-zinc-100 dark:to-zinc-400 leading-[1.1]">
          Connect Beyond <br className="hidden sm:block" /> Boundaries
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mb-10 leading-relaxed">
          The next-generation communication suite featuring instant messaging, WebRTC group video conferencing,
          minimizable calls, and robust encryption.
        </p>

        <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto justify-center">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm sm:text-base py-3 px-6 shadow-md shadow-sky-500/10">
              Start Chatting Now <ArrowRight size={18} />
            </Button>
          </Link>
          <a href="https://github.com/ram02krishna/QuickConnect" target="_blank" rel="noreferrer">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm sm:text-base py-3 px-6">
              <Github size={18} /> View on GitHub
            </Button>
          </a>
        </div>

        {/* Feature Highlights Grid */}
        <div className="w-full mt-24 sm:mt-32">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Engineered for Speed, Privacy & Power
            </h2>
            <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 mt-2">
              Everything you need for seamless personal and team conversations.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-left">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="group relative p-6 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/5 hover:border-sky-500/40 dark:hover:border-sky-500/40 transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 border transition-transform duration-200 group-hover:scale-105 ${feat.gradient}`}
                  >
                    <Icon size={22} />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-white/5 py-8 text-center text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm bg-white dark:bg-zinc-950">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain" />
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">QuickConnect</span>
          </div>
          <p>© {new Date().getFullYear()} QuickConnect. Designed for real-time collaboration.</p>
        </div>
      </footer>
    </div>
  );
}
