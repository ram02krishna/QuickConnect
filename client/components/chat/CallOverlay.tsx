"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useCallStore } from "@hooks/useCallStore";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  Volume1,
  VolumeX,
  MonitorUp,
  MonitorOff,
  Maximize2,
  Minimize2,
  ArrowLeftRight,
} from "lucide-react";
import { Avatar } from "@components/ui/Avatar";
import { toast } from "sonner";

interface VideoStreamProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  isMirrored?: boolean;
  objectFit?: "cover" | "contain";
  onClick?: () => void;
  className?: string;
}

function VideoStream({
  stream,
  isLocal = false,
  isMirrored = false,
  objectFit = "cover",
  onClick,
  className = "",
}: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current || !stream) return;
    if (videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      onClick={onClick}
      className={`h-full w-full ${
        objectFit === "contain" ? "object-contain" : "object-cover"
      } ${isMirrored ? "-scale-x-100" : ""} ${className}`}
    />
  );
}

export function CallOverlay() {
  const {
    callState,
    callType,
    isGroupCall,
    partner,
    groupChatTitle,
    participants,
    localStream,
    remoteStream,
    remoteStreams,
    isMuted,
    isCameraOff,
    acceptCall,
    acceptGroupCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    isScreenSharing,
    ringVolume,
    setRingVolume,
  } = useCallStore();

  const remoteAudioRef = useRef<HTMLVideoElement>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [fitMode, setFitMode] = useState<"cover" | "contain">("cover");
  const [isSwapped, setIsSwapped] = useState(false); // Swap local & remote main view
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Duration timer when connected
  useEffect(() => {
    if (callState === "connected") {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setCallDuration(0);
      setIsSwapped(false);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Auto-focus window on call state change to guarantee browser keydown capture
  useEffect(() => {
    if (callState === "incoming" || callState === "outgoing") {
      window.focus();
    }
  }, [callState]);

  // Adjust volume for remote audio stream during connected calls
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = ringVolume;
    }
  }, [ringVolume]);

  // Handle volume control via keys F2/- (Volume Down) and F3/+/= (Volume Up)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (callState === "idle") return;

      if (e.key === "F2" || e.key === "-") {
        e.preventDefault();
        const currentVol = useCallStore.getState().ringVolume;
        const newVol = Math.max(0, Math.round((currentVol - 0.1) * 10) / 10);
        setRingVolume(newVol);
        toast.info(`Volume: ${Math.round(newVol * 100)}%`, { id: "call-volume", duration: 1200 });
      } else if (e.key === "F3" || e.key === "+" || e.key === "=") {
        e.preventDefault();
        const currentVol = useCallStore.getState().ringVolume;
        const newVol = Math.min(1, Math.round((currentVol + 0.1) * 10) / 10);
        setRingVolume(newVol);
        toast.info(`Volume: ${Math.round(newVol * 100)}%`, { id: "call-volume", duration: 1200 });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [callState, setRingVolume]);

  // Route remote audio to speaker or earpiece when isSpeaker changes
  useEffect(() => {
    if (!remoteAudioRef.current) return;
    const el = remoteAudioRef.current as any;
    if (typeof el.setSinkId === "function") {
      el.setSinkId(isSpeaker ? "" : "communications").catch(() => {});
    }
  }, [isSpeaker]);

  // Bind remote stream to the audio element for audio calls
  useEffect(() => {
    if (!remoteAudioRef.current || !remoteStream) return;
    if (remoteAudioRef.current.srcObject !== remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callState === "idle" || (!partner && !isGroupCall)) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const handleAccept = () => {
    if (isGroupCall) {
      acceptGroupCall();
    } else {
      acceptCall();
    }
  };

  const displayName = isGroupCall ? groupChatTitle || "Group Call" : partner?.name;
  const displayAvatar = isGroupCall ? null : partner?.avatarUrl;

  const activeRemoteStreams = Object.entries(remoteStreams);
  const numStreams = activeRemoteStreams.length;

  let gridCols = "grid-cols-1";
  if (numStreams === 2) gridCols = "grid-cols-1 sm:grid-cols-2";
  else if (numStreams >= 3 && numStreams <= 4) gridCols = "grid-cols-2 grid-rows-2";
  else if (numStreams > 4) gridCols = "grid-cols-2 sm:grid-cols-3 grid-rows-2";

  const getVolumeIcon = () => {
    if (ringVolume === 0) return <VolumeX size={19} />;
    if (ringVolume < 0.5) return <Volume1 size={19} />;
    return <Volume2 size={19} />;
  };

  // Determine what video streams to show in main vs PiP
  const mainStream = isSwapped ? localStream : remoteStream;
  const pipStream = isSwapped ? remoteStream : localStream;
  const isMainMirrored = isSwapped && !isScreenSharing;
  const isPipMirrored = !isSwapped && !isScreenSharing;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-zinc-950 text-white select-none overflow-hidden touch-none">
      {/* Background Ambience / Blur */}
      <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none animate-pulse-slow z-0" />
      <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[130px] pointer-events-none animate-pulse z-0" />

      {/* Top Header Bar with WhatsApp styling & Volume Control */}
      <header className="relative z-30 w-full flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-b from-black/70 via-black/30 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-left">
            <span className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {callType === "video" ? "WhatsApp Video Call" : "WhatsApp Voice Call"}
            </span>
            <span className="text-xs text-zinc-400">
              {callState === "connected" ? (
                <span className="font-mono text-emerald-400 font-medium">
                  {formatTime(callDuration)}
                </span>
              ) : callState === "outgoing" ? (
                "Ringing..."
              ) : (
                "Incoming..."
              )}
            </span>
          </div>
        </div>

        {/* Volume & Frame Fit Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Fit / Cover toggle for 1-to-1 video calls */}
          {callState === "connected" && callType === "video" && !isGroupCall && (
            <button
              onClick={() => setFitMode((prev) => (prev === "cover" ? "contain" : "cover"))}
              className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-zinc-200 hover:text-white transition-all backdrop-blur-md border border-white/10 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title={fitMode === "cover" ? "Switch to Fit Frame (Full View)" : "Switch to Fill Screen"}
            >
              {fitMode === "cover" ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              <span className="hidden sm:inline">
                {fitMode === "cover" ? "Fit Frame" : "Fill Screen"}
              </span>
            </button>
          )}

          {/* Swap Video View (Local vs Remote PiP) */}
          {callState === "connected" && callType === "video" && !isGroupCall && localStream && (
            <button
              onClick={() => setIsSwapped((prev) => !prev)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-zinc-200 hover:text-white transition-all backdrop-blur-md border border-white/10 cursor-pointer"
              title="Swap main & picture-in-picture view"
            >
              <ArrowLeftRight size={16} />
            </button>
          )}

          {/* Volume Control Bar & Slider */}
          <div className="relative flex items-center">
            <button
              onClick={() => setShowVolumeSlider((prev) => !prev)}
              className={`p-2 rounded-full transition-all backdrop-blur-md border border-white/10 cursor-pointer flex items-center gap-1 ${
                ringVolume === 0
                  ? "bg-red-500/80 text-white"
                  : "bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white"
              }`}
              title="Adjust Volume"
            >
              {getVolumeIcon()}
              <span className="text-xs font-mono font-semibold px-0.5">
                {Math.round(ringVolume * 100)}%
              </span>
            </button>

            {/* Volume Slider Popup */}
            {showVolumeSlider && (
              <div className="absolute right-0 top-12 z-40 bg-zinc-900/95 border border-white/15 backdrop-blur-xl p-3 rounded-2xl shadow-2xl flex flex-col items-center gap-2 w-48">
                <div className="flex items-center justify-between w-full text-xs text-zinc-300 font-medium">
                  <span>Device Volume</span>
                  <span className="font-mono text-emerald-400">{Math.round(ringVolume * 100)}%</span>
                </div>
                <div className="flex items-center gap-2 w-full">
                  <button
                    onClick={() => setRingVolume(ringVolume === 0 ? 0.5 : 0)}
                    className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title={ringVolume === 0 ? "Unmute" : "Mute"}
                  >
                    {ringVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={ringVolume}
                    onChange={(e) => setRingVolume(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-zinc-500">Press F2/F3 or +/- to adjust</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body Area: Video Stream / Audio Avatar */}
      <main className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        {/* Hidden Audio Elements for Audio Calls */}
        {callType === "audio" && (
          <div className="absolute w-0 h-0 opacity-0 pointer-events-none">
            {isGroupCall ? (
              activeRemoteStreams.map(([userId, stream]) => (
                <VideoStream key={userId} stream={stream} />
              ))
            ) : (
              <video ref={remoteAudioRef} autoPlay playsInline />
            )}
          </div>
        )}

        {/* Video Call Full-screen Feeds */}
        {callState === "connected" && callType === "video" ? (
          <div className="absolute inset-0 h-full w-full bg-zinc-950 flex items-center justify-center">
            {isGroupCall ? (
              <div className={`w-full h-full grid ${gridCols} gap-2 p-2 sm:p-4`}>
                {activeRemoteStreams.map(([userId, stream]) => (
                  <div
                    key={userId}
                    className="relative bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 shadow-lg flex items-center justify-center"
                  >
                    <VideoStream stream={stream} objectFit="cover" />
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium border border-white/10">
                      {participants[userId]?.name || "Participant"}
                    </div>
                  </div>
                ))}
                {numStreams === 0 && (
                  <div className="col-span-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-400 gap-3">
                    <Avatar src={displayAvatar} name={displayName || "?"} size="xl" />
                    <p className="text-sm font-semibold animate-pulse">Waiting for others to join...</p>
                  </div>
                )}
              </div>
            ) : (
              /* 1-to-1 Video Feed */
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                {mainStream ? (
                  <>
                    {/* Ambient Background for Letterbox (WhatsApp/Apple Style) */}
                    {fitMode === "contain" && (
                      <div className="absolute inset-0 overflow-hidden opacity-30 blur-3xl scale-110 pointer-events-none">
                        <VideoStream stream={mainStream} objectFit="cover" isMirrored={isMainMirrored} />
                      </div>
                    )}
                    <VideoStream
                      stream={mainStream}
                      objectFit={fitMode}
                      isMirrored={isMainMirrored}
                      className="relative z-10"
                    />
                  </>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-400 gap-4">
                    <Avatar src={displayAvatar} name={displayName || "?"} size="xl" className="h-28 w-28 text-4xl" />
                    <p className="text-sm font-medium animate-pulse text-zinc-400">
                      Waiting for video stream...
                    </p>
                  </div>
                )}

                {/* WhatsApp Local Video Picture-in-Picture (PiP) */}
                {pipStream && !isCameraOff && (
                  <div
                    onClick={() => setIsSwapped((prev) => !prev)}
                    className="absolute top-4 right-4 sm:top-6 sm:right-6 w-28 h-40 sm:w-36 sm:h-52 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-zinc-900 z-20 cursor-pointer hover:border-emerald-400/60 hover:scale-105 transition-all duration-200 group"
                    title="Click to swap view"
                  >
                    <VideoStream stream={pipStream} isLocal={!isSwapped} isMirrored={isPipMirrored} objectFit="cover" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ArrowLeftRight size={20} className="text-white drop-shadow-md" />
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-medium text-zinc-300">
                      {isSwapped ? displayName : "You"}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Incoming / Outgoing / Audio Call Central Avatar Screen */
          <div className="relative z-20 flex flex-col items-center justify-center gap-6 max-w-sm px-6">
            <div className="relative flex items-center justify-center">
              <div
                className={`absolute inset-0 rounded-full bg-emerald-500/20 scale-125 border border-emerald-500/20 ${
                  callState === "connected" ? "scale-110" : "animate-ping"
                }`}
              />
              <div
                className={`absolute inset-0 rounded-full bg-emerald-500/10 scale-150 border border-emerald-500/10 ${
                  callState === "connected" ? "scale-125" : "animate-pulse"
                }`}
              />
              <Avatar
                src={displayAvatar}
                name={displayName || "?"}
                size="xl"
                className="relative z-10 border-4 border-white/20 shadow-2xl h-28 w-28 text-4xl"
              />
            </div>

            <div className="space-y-1.5 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-md">
                {displayName}
              </h2>
              <p className="text-sm font-medium text-zinc-400 tracking-wide">
                {callState === "outgoing" && "Ringing..."}
                {callState === "incoming" &&
                  `Incoming ${isGroupCall ? "Group " : ""}${callType === "video" ? "Video" : "Voice"} Call`}
                {callState === "connected" && (
                  <span className="font-mono text-emerald-400 font-semibold text-base">
                    {formatTime(callDuration)}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Floating Control Dock (WhatsApp Style) */}
      <footer className="relative z-30 w-full flex justify-center pb-8 pt-4 px-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        {callState === "incoming" ? (
          <div className="flex items-center justify-around w-full max-w-xs px-4">
            {/* Decline Call */}
            <button
              onClick={declineCall}
              className="flex flex-col items-center gap-2 group focus:outline-none cursor-pointer"
            >
              <div className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 flex items-center justify-center shadow-2xl transition-all duration-150">
                <PhoneOff size={28} className="text-white" />
              </div>
              <span className="text-xs font-semibold text-zinc-300 group-hover:text-white">Decline</span>
            </button>

            {/* Accept Call */}
            <button
              onClick={handleAccept}
              className="flex flex-col items-center gap-2 group focus:outline-none cursor-pointer"
            >
              <div className="h-16 w-16 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 flex items-center justify-center shadow-2xl transition-all duration-150 animate-bounce">
                <Phone size={28} className="text-white" />
              </div>
              <span className="text-xs font-semibold text-zinc-300 group-hover:text-white">Accept</span>
            </button>
          </div>
        ) : (
          /* Active / Outgoing Call Controls Dock */
          <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 rounded-full bg-zinc-900/80 border border-white/15 backdrop-blur-2xl shadow-2xl">
            {/* Mute Mic Toggle */}
            <button
              onClick={toggleMute}
              disabled={callState === "outgoing"}
              className={`h-12 w-12 rounded-full flex items-center justify-center border transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                isMuted
                  ? "bg-red-500 border-red-400 text-white"
                  : "bg-white/10 hover:bg-white/20 border-white/15 text-zinc-200 hover:text-white"
              }`}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Camera Toggle for Video Calls */}
            {callType === "video" && (
              <button
                onClick={toggleCamera}
                disabled={callState === "outgoing"}
                className={`h-12 w-12 rounded-full flex items-center justify-center border transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                  isCameraOff
                    ? "bg-red-500 border-red-400 text-white"
                    : "bg-white/10 hover:bg-white/20 border-white/15 text-zinc-200 hover:text-white"
                }`}
                title={isCameraOff ? "Turn On Camera" : "Turn Off Camera"}
              >
                {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            )}

            {/* Screen Share Toggle for Video Calls */}
            {callType === "video" && (
              <button
                onClick={toggleScreenShare}
                disabled={callState === "outgoing"}
                className={`h-12 w-12 rounded-full flex items-center justify-center border transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                  isScreenSharing
                    ? "bg-emerald-500 border-emerald-400 text-white"
                    : "bg-white/10 hover:bg-white/20 border-white/15 text-zinc-200 hover:text-white"
                }`}
                title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
              >
                {isScreenSharing ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
              </button>
            )}

            {/* Speaker / Earpiece Toggle for Audio Calls */}
            {callType === "audio" && (
              <button
                onClick={() => setIsSpeaker(!isSpeaker)}
                disabled={callState === "outgoing"}
                className={`h-12 w-12 rounded-full flex items-center justify-center border transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                  isSpeaker
                    ? "bg-white/10 hover:bg-white/20 border-white/15 text-zinc-200 hover:text-white"
                    : "bg-red-500 border-red-400 text-white"
                }`}
                title={isSpeaker ? "Speakerphone active" : "Speakerphone off"}
              >
                {isSpeaker ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
            )}

            {/* End / Cancel Call Button */}
            <button
              onClick={callState === "outgoing" ? declineCall : endCall}
              className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 flex items-center justify-center shadow-lg transition-all duration-150 cursor-pointer border border-red-500"
              title={callState === "outgoing" ? "Cancel Call" : "End Call"}
            >
              <PhoneOff size={22} className="text-white" />
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}
