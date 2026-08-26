"use client";

import Link from "next/link";
import { useState } from "react";
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
  CheckCheck,
  Play,
  Volume2,
  Share2,
  Terminal,
  Cpu,
  Layers,
  Globe,
  Radio,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@components/ui/Button";
import { useTheme } from "next-themes";

export default function LandingPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"chat" | "calls" | "security">("chat");

  const features = [
    {
      icon: MessageCircle,
      title: "Real-time Messaging",
      badge: "Sub-millisecond",
      description:
        "Sub-millisecond message delivery powered by optimized WebSockets with instant delivery ticks and read receipts.",
      gradient: "from-sky-500/10 to-blue-500/10 border-sky-500/20 text-sky-500",
    },
    {
      icon: Video,
      title: "HD Video & Voice Calls",
      badge: "Adaptive WebRTC",
      description:
        "Crystal-clear 1-to-1 and group video calls with adaptive WebRTC mesh streaming, acoustic volume controls, and frame fitting.",
      gradient: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-500",
    },
    {
      icon: Maximize2,
      title: "Floating PiP Call Widget",
      badge: "Multitask Ready",
      description:
        "Minimize calls into a floating Picture-in-Picture window so you can navigate chats and use the entire app uninterrupted.",
      gradient: "from-purple-500/10 to-indigo-500/10 border-purple-500/20 text-purple-500",
    },
    {
      icon: Users,
      title: "Collaborative Groups",
      badge: "Named Typing",
      description:
        "Create custom groups, manage participants, and experience named real-time typing indicators with smooth sync.",
      gradient: "from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-500",
    },
    {
      icon: Lock,
      title: "End-to-End Encryption",
      badge: "AES-256",
      description:
        "Enterprise-grade AES-256 payload encryption ensuring all your messages, media files, and contacts remain strictly private.",
      gradient: "from-rose-500/10 to-pink-500/10 border-rose-500/20 text-rose-500",
    },
    {
      icon: Mic,
      title: "Voice Notes & Waveforms",
      badge: "Audio Seeking",
      description:
        "Record crisp voice messages with interactive audio waveform players, adjustable playback speeds, and seekbars.",
      gradient: "from-cyan-500/10 to-sky-500/10 border-cyan-500/20 text-cyan-500",
    },
    {
      icon: Search,
      title: "Instant In-Chat Search",
      badge: "Keyboard Nav",
      description:
        "Search through thousands of conversations and media attachments with real-time match counters and keyboard shortcuts.",
      gradient: "from-violet-500/10 to-fuchsia-500/10 border-violet-500/20 text-violet-500",
    },
    {
      icon: FileText,
      title: "Rich Media & Lightbox",
      badge: "Direct CDN",
      description:
        "Share full-resolution photos, videos, and documents with built-in media lightboxes and high-speed signed downloads.",
      gradient: "from-emerald-500/10 to-green-500/10 border-emerald-500/20 text-emerald-500",
    },
  ];

  const metrics = [
    { label: "Realtime Latency", value: "< 35ms", icon: Zap },
    { label: "Encryption Standard", value: "AES-256", icon: ShieldCheck },
    { label: "Call Quality", value: "1080p HD", icon: Video },
    { label: "Device Support", value: "100% Responsive", icon: Globe },
  ];

  const techStack = [
    "Next.js 15",
    "React 19",
    "WebSockets",
    "WebRTC Mesh",
    "Tailwind CSS",
    "Prisma ORM",
    "PostgreSQL",
    "Redis Cache",
    "Cloudinary CDN",
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b141a] text-zinc-900 dark:text-zinc-100 font-sans flex flex-col select-none relative overflow-x-hidden">
      {/* Dynamic Background Ambient Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] sm:w-[1100px] h-[500px] bg-gradient-to-tr from-sky-500/15 via-blue-500/10 to-emerald-500/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-[40%] right-0 w-[500px] h-[500px] bg-purple-500/10 blur-[130px] pointer-events-none rounded-full" />

      {/* Navbar */}
      <header className="border-b border-zinc-200/70 dark:border-white/5 bg-white/70 dark:bg-[#0b141a]/75 backdrop-blur-xl sticky top-0 z-50 transition-colors">
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
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-16 sm:pt-24 pb-16 max-w-6xl mx-auto w-full relative z-10">
        
        {/* Release Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-semibold mb-6 shadow-xs backdrop-blur-md">
          <Sparkles size={14} className="animate-spin-slow" />
          <span>QuickConnect 2.0 • Ultra-fast WebSockets & HD WebRTC Mesh</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl mb-6 text-transparent bg-clip-text bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-600 dark:from-white dark:via-zinc-100 dark:to-zinc-400 leading-[1.1]">
          Connect Beyond <br className="hidden sm:block" /> Boundaries
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mb-10 leading-relaxed">
          The all-in-one modern communication platform featuring instant messaging, multi-user WebRTC video conferencing,
          floating Picture-in-Picture calls, and end-to-end security.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto justify-center mb-16">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm sm:text-base py-3.5 px-7 shadow-lg shadow-sky-500/15">
              Start Chatting Free <ArrowRight size={18} />
            </Button>
          </Link>
          <a href="https://github.com/ram02krishna/QuickConnect" target="_blank" rel="noreferrer">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm sm:text-base py-3.5 px-6">
              <Github size={18} /> Star on GitHub
            </Button>
          </a>
        </div>

        {/* Live Interactive UI Showcase Card */}
        <div className="w-full max-w-4xl rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 shadow-2xl backdrop-blur-2xl overflow-hidden text-left mb-24 transition-all">
          {/* Mock Window Titlebar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200/70 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400/80 inline-block" />
              <span className="h-3 w-3 rounded-full bg-amber-400/80 inline-block" />
              <span className="h-3 w-3 rounded-full bg-emerald-400/80 inline-block" />
              <span className="text-xs text-zinc-500 font-mono ml-2 hidden sm:inline">QuickConnect Web Client</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[11px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Socket Online
              </span>
            </div>
          </div>

          {/* Interactive Chat Canvas Preview */}
          <div className="p-4 sm:p-6 space-y-4 bg-zinc-100/50 dark:bg-[#0b141a]/90">
            {/* Incoming Message with Named Sender */}
            <div className="flex items-start gap-3 max-w-md">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-xs">
                M
              </div>
              <div>
                <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 ml-1">Mansi • Group Admin</span>
                <div className="p-3 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-2xl rounded-tl-sm shadow-xs border border-zinc-200/50 dark:border-white/5 text-sm mt-0.5">
                  Hey everyone! The new group call and minimizable floating call window are live now. 🚀
                  <div className="text-[10px] text-zinc-400 text-right mt-1 font-mono">04:30 PM</div>
                </div>
              </div>
            </div>

            {/* Outgoing Message with Double Ticks */}
            <div className="flex items-end justify-end gap-2 max-w-md ml-auto">
              <div className="p-3 bg-sky-600 text-white rounded-2xl rounded-tr-sm shadow-md text-sm">
                Awesome! I just tested the mesh group call and voice note waveform seekbars. Smooth and zero lag!
                <div className="flex items-center justify-end gap-1 text-[10px] text-sky-200 font-mono mt-1">
                  <span>04:31 PM</span>
                  <CheckCheck size={14} className="text-sky-200" />
                </div>
              </div>
            </div>

            {/* Voice Message Simulation */}
            <div className="flex items-start gap-3 max-w-sm">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                A
              </div>
              <div className="p-3 bg-white dark:bg-zinc-800 rounded-2xl rounded-tl-sm border border-zinc-200/50 dark:border-white/5 shadow-xs flex items-center gap-3 w-full">
                <button className="h-9 w-9 rounded-full bg-sky-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Play size={16} className="ml-0.5" />
                </button>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-1 h-4">
                    {[40, 75, 55, 90, 60, 85, 45, 95, 70, 50, 80, 65, 40, 75, 55].map((h, i) => (
                      <span key={i} style={{ height: `${h}%` }} className="w-1 bg-sky-500/70 rounded-full" />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                    <span>0:18</span>
                    <span>1.0x</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Counter Bar */}
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 mb-24">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/5 flex flex-col items-center justify-center text-center shadow-xs"
              >
                <Icon size={22} className="text-sky-500 mb-2" />
                <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 font-mono">
                  {m.value}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Feature Highlights Grid */}
        <div className="w-full">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Engineered for Speed, Privacy & Power
            </h2>
            <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 mt-2 max-w-xl mx-auto">
              Everything required for frictionless personal conversations and mission-critical team communication.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-left">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="group relative p-6 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/5 hover:border-sky-500/40 dark:hover:border-sky-500/40 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-transform duration-200 group-hover:scale-105 ${feat.gradient}`}
                      >
                        <Icon size={22} />
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-200/50 dark:bg-white/5 text-zinc-600 dark:text-zinc-400">
                        {feat.badge}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                      {feat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Technology Stack Badges */}
        <div className="w-full mt-24 pt-12 border-t border-zinc-200/70 dark:border-white/5">
          <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-6">
            Powered by Modern Open Technologies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 max-w-4xl mx-auto">
            {techStack.map((tech) => (
              <span
                key={tech}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200/70 dark:border-white/5 shadow-xs"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom CTA Card */}
        <div className="w-full mt-24 rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-2xl relative overflow-hidden text-center flex flex-col items-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 to-transparent pointer-events-none" />
          <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4 relative z-10">
            Ready to experience next-gen chatting?
          </h3>
          <p className="text-sky-100 text-sm sm:text-base max-w-xl mb-8 relative z-10">
            Sign up in seconds, start direct or group chats, and make HD voice & video calls right in your browser.
          </p>
          <Link href="/signup" className="relative z-10">
            <Button size="lg" className="bg-white text-zinc-950 hover:bg-zinc-100 font-bold px-8 py-3.5 shadow-xl text-base">
              Create Your Account
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-white/5 py-8 text-center text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm bg-white dark:bg-zinc-950/80 mt-auto">
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
