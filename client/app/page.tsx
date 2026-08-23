"use client";

import Link from "next/link";
import { MessageCircle, Users, FileText, ArrowRight, Github } from "lucide-react";
import { Button } from "@components/ui/Button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col select-none">
      {/* Navbar */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="QuickConnect Logo" className="w-8 h-8 rounded-xl object-contain" />
            <span className="font-bold text-xl tracking-tight">QuickConnect</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:text-brand-primary transition-colors">
              Log in
            </Link>
            <Link href="/signup">
              <Button size="sm">Sign up</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl mb-6 text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400">
          Connect Beyond <br className="hidden sm:block" /> Boundaries
        </h1>
        
        <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mb-10 leading-relaxed">
          A full-stack real-time chat application built from scratch to demonstrate modern web development practices, WebSockets, and seamless user experiences.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto flex items-center gap-2">
              Start Chatting <ArrowRight size={18} />
            </Button>
          </Link>
          <a href="https://github.com" target="_blank" rel="noreferrer">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto flex items-center gap-2">
              <Github size={18} /> View Source
            </Button>
          </a>
        </div>
        
        {/* Features Grid */}
        <div className="grid sm:grid-cols-3 gap-8 mt-32 max-w-5xl mx-auto text-left">
          <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-brand-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-4">
              <MessageCircle size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Real-time Messaging</h3>
            <p className="text-zinc-600 dark:text-zinc-400">Instant message delivery powered by WebSockets. See typing indicators and read receipts just like a professional app.</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-brand-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-4">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Group Conversations</h3>
            <p className="text-zinc-600 dark:text-zinc-400">Create groups, add members, and manage roles. Perfect for coordinating with your study group or project team.</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-brand-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Rich Media Sharing</h3>
            <p className="text-zinc-600 dark:text-zinc-400">Share images, videos, audio messages, and documents easily with your contacts with seamless previews.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8 text-center text-zinc-500 dark:text-zinc-400 text-sm bg-white dark:bg-zinc-950">
        <p>QuickConnect © {new Date().getFullYear()}. Created as a demonstration project.</p>
      </footer>
    </div>
  );
}
