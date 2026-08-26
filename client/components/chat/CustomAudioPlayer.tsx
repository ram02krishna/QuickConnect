"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Loader2, Download } from "lucide-react";

interface CustomAudioPlayerProps {
  src: string;
  isSelf?: boolean;
  onDownload?: () => void;
}

export function CustomAudioPlayer({ src, isSelf = false, onDownload }: CustomAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      setLoading(false);
    };
    const onCanPlay = () => setLoading(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);

    // Trigger metadata load manually if already cached
    if (audio.readyState >= 2) {
      setDuration(audio.duration);
      setLoading(false);
    }

    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => console.error("Playback failed:", err));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const seekTo = parseFloat(e.target.value);
    audioRef.current.currentTime = seekTo;
    setCurrentTime(seekTo);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl w-full max-w-[240px] sm:max-w-[270px] select-none border transition-colors ${
        isSelf
          ? "bg-black/10 dark:bg-black/20 border-white/10"
          : "bg-black/5 dark:bg-black/15 border-zinc-250/20 dark:border-white/5"
      }`}
    >
      {/* Play/Pause Trigger */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={loading}
        className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer transition-all active:scale-95 disabled:opacity-50 ${
          isSelf
            ? "bg-white text-zinc-700 hover:bg-white/95 hover:shadow-md"
            : "bg-zinc-600 hover:bg-zinc-700 text-white"
        }`}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isPlaying ? (
          <Pause size={14} fill="currentColor" />
        ) : (
          <Play size={14} fill="currentColor" className="ml-0.5" />
        )}
      </button>

      {/* Progress slider bar & text duration */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="relative w-full flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            disabled={loading || duration === 0}
            className={`w-full h-1 rounded-lg appearance-none cursor-pointer focus:outline-none ${
              isSelf ? "accent-white bg-white/20" : "accent-zinc-600 bg-zinc-250 dark:bg-zinc-700"
            }`}
            style={{
              background: `linear-gradient(to right, ${
                isSelf ? "#ffffff" : "#00D8E3"
              } 0%, ${
                isSelf ? "#ffffff" : "#00D8E3"
              } ${progressPercentage}%, ${
                isSelf ? "rgba(255, 255, 255, 0.2)" : "rgba(120, 120, 120, 0.2)"
              } ${progressPercentage}%, ${
                isSelf ? "rgba(255, 255, 255, 0.2)" : "rgba(120, 120, 120, 0.2)"
              } 100%)`
            }}
          />
        </div>
        <div
          className={`flex items-center justify-between text-base font-semibold leading-none ${
            isSelf ? "text-blue-100/90" : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Mute button */}
      <button
        type="button"
        onClick={toggleMute}
        disabled={loading}
        className={`p-1.5 rounded-full cursor-pointer transition-colors ${
          isSelf
            ? "text-white/80 hover:text-white hover:bg-white/10"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5"
        }`}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
      </button>

      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          className={`p-1.5 rounded-full cursor-pointer transition-colors ${
            isSelf
              ? "text-white/80 hover:text-white hover:bg-white/10"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5"
          }`}
          title="Download audio"
          aria-label="Download audio"
        >
          <Download size={15} />
        </button>
      )}

    </div>
  );
}
