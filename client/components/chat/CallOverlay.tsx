"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useCallStore } from "@hooks/useCallStore";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, Volume1, VolumeX, MonitorUp, MonitorOff } from "lucide-react";
import { Avatar } from "@components/ui/Avatar";
import { toast } from "sonner";
// Helper component to bind a MediaStream to a video element
function VideoStream({ stream, isLocal = false }: { stream: MediaStream, isLocal?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current || !stream) return;
    // Always re-assign so track replacements (e.g. screen share) take effect
    if (videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  });

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      className="h-full w-full object-cover"
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

  const containerRef = useRef<HTMLDivElement>(null);
  const remoteAudioRef = useRef<HTMLVideoElement>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeaker, setIsSpeaker] = useState(true); // true = speaker (default), false = earpiece
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

  // Handle volume control via keys F2/- (Volume Down) and F3/+/= (Volume Up)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (callState !== "incoming" && callState !== "outgoing") return;
      
      if (e.key === "F2" || e.key === "-") {
        e.preventDefault();
        const currentVol = useCallStore.getState().ringVolume;
        const newVol = Math.max(0, currentVol - 0.1);
        setRingVolume(newVol);
        toast.info(`Volume: ${Math.round(newVol * 100)}%`, { id: "call-volume", duration: 1500 });
      } else if (e.key === "F3" || e.key === "+" || e.key === "=") {
        e.preventDefault();
        const currentVol = useCallStore.getState().ringVolume;
        const newVol = Math.min(1, currentVol + 0.1);
        setRingVolume(newVol);
        toast.info(`Volume: ${Math.round(newVol * 100)}%`, { id: "call-volume", duration: 1500 });
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
      // "" = default (speaker), a specific device ID for earpiece
      // In web browsers we can only switch between default and communication devices
      el.setSinkId(isSpeaker ? "" : "communications").catch(() => {
        // setSinkId may fail if device isn't available — silently ignore
      });
    }
  }, [isSpeaker]);

  // Bind remote stream to the audio element
  useEffect(() => {
    if (!remoteAudioRef.current || !remoteStream) return;
    if (remoteAudioRef.current.srcObject !== remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  });

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
  if (numStreams === 2) gridCols = "grid-cols-2";
  else if (numStreams >= 3 && numStreams <= 4) gridCols = "grid-cols-2 grid-rows-2";
  else if (numStreams > 4) gridCols = "grid-cols-3 grid-rows-2";

  return (
    <React.Fragment>
      <div
        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/98 dark:bg-zinc-950/98 backdrop-blur-2xl text-zinc-900 dark:text-white select-none overflow-hidden"
      >
        <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-zinc-300/30 dark:bg-zinc-700/10 blur-[120px] pointer-events-none animate-pulse-slow z-0" />
        <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-brand-primary/10 blur-[120px] pointer-events-none animate-pulse z-0" />

        {/* Real-time Feeds */}
        {callState === "connected" && (
          <>
            {/* Hidden Audio Elements for Voice Calls */}
            {callType === "audio" && (
              <div className="absolute w-0 h-0 opacity-0 pointer-events-none">
                {isGroupCall ? (
                  activeRemoteStreams.map(([userId, stream]) => (
                    <VideoStream key={userId} stream={stream} />
                  ))
                ) : (
                  // Use our ref'd element so we can call setSinkId on it
                  <video
                    ref={remoteAudioRef}
                    autoPlay
                    playsInline
                  />
                )}
              </div>
            )}

            {/* Visual Video Feeds for Video Calls */}
            {callType === "video" && (
              <div ref={containerRef} className="absolute inset-0 h-full w-full bg-black z-10 flex">
                {/* Group Call Grid or Single Remote Video */}
                {isGroupCall ? (
                  <div className={`w-full h-full grid ${gridCols} gap-1 p-1`}>
                    {activeRemoteStreams.map(([userId, stream]) => (
                      <div key={userId} className="relative bg-zinc-900 rounded-lg overflow-hidden border border-white/10">
                        <VideoStream stream={stream} />
                        <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-base">
                          {participants[userId]?.name || "Participant"}
                        </div>
                      </div>
                    ))}
                    {numStreams === 0 && (
                      <div className="col-span-full h-full flex flex-col items-center justify-center bg-zinc-950/90 text-zinc-400">
                        <p className="text-base font-semibold animate-pulse">Waiting for others to join...</p>
                      </div>
                    )}
                  </div>
                ) : (
                  remoteStream ? (
                    <VideoStream stream={remoteStream} />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center bg-zinc-950/90 text-zinc-400 gap-3">
                      <Avatar src={displayAvatar} name={displayName || "?"} size="xl" />
                      <p className="text-base font-semibold animate-pulse">Waiting for video stream...</p>
                    </div>
                  )
                )}

                {/* Local Video Picture-in-Picture */}
                {!isCameraOff && localStream && (
                  <div
                    className="absolute top-4 right-4 sm:top-6 sm:right-6 w-24 h-36 sm:w-32 sm:h-44 rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-zinc-900 z-20 cursor-grab active:cursor-grabbing"
                  >
                    <VideoStream stream={localStream} isLocal={true} />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Content Pane */}
        <div className="relative z-20 flex flex-col items-center justify-between h-full w-full max-w-md px-6 py-16 text-center">
          
          <div className="space-y-4 mt-8 pointer-events-none">
            <div className="flex justify-center">
              {callState === "connected" && callType === "video" ? (
                <div className="px-4 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md text-base font-semibold tracking-wide pointer-events-auto">
                  {formatTime(callDuration)}
                </div>
              ) : (
                <div className="relative flex items-center justify-center">
                  <div className={`absolute inset-0 rounded-full bg-brand-primary/20 scale-125 border border-brand-primary/20 ${callState === "connected" ? "" : "animate-ping"}`} />
                  <div className={`absolute inset-0 rounded-full bg-brand-primary/10 scale-150 border border-brand-primary/10 ${callState === "connected" ? "" : "animate-pulse"}`} />
                  <Avatar
                    src={displayAvatar}
                    name={displayName || "?"}
                    size="xl"
                    className="relative z-10 border-2 border-white/15 shadow-2xl h-24 w-24 text-4xl"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white drop-shadow-md">
                {displayName}
              </h2>
              <p className="text-base font-medium text-zinc-500 dark:text-zinc-400 drop-shadow-sm tracking-wide">
                {callState === "outgoing" && "Calling..."}
                {callState === "incoming" && `Incoming ${isGroupCall ? "Group " : ""}${callType === "video" ? "Video" : "Voice"} Call`}
                {callState === "connected" && (
                  <span className="text-zinc-700 dark:text-zinc-300 font-semibold">
                    {callType === "video" ? (isGroupCall ? "Group Video Chat" : "Video Chat") : formatTime(callDuration)}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="w-full space-y-8 mb-4">
            
            {callState === "incoming" && (
              <div className="flex items-center justify-around w-full px-6">
                <button
                  onClick={declineCall}
                  className="flex flex-col items-center gap-2 group focus:outline-none"
                >
                  <div className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 flex items-center justify-center shadow-lg transition-all duration-150 cursor-pointer">
                    <PhoneOff size={26} className="text-white transform rotate-135" />
                  </div>
                  <span className="text-base text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors font-medium">Decline</span>
                </button>

                <button
                  onClick={handleAccept}
                  className="flex flex-col items-center gap-2 group focus:outline-none"
                >
                  <div className="h-16 w-16 rounded-full bg-zinc-600 hover:bg-zinc-700 active:scale-95 flex items-center justify-center shadow-lg transition-all duration-150 cursor-pointer animate-bounce">
                    <Phone size={26} className="text-white" />
                  </div>
                  <span className="text-base text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors font-medium">Accept</span>
                </button>
              </div>
            )}

            {(callState === "outgoing" || callState === "connected") && (
              <div className="flex flex-col items-center gap-8">
                
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={toggleMute}
                    disabled={callState === "outgoing"}
                    className={`h-12 w-12 rounded-full flex items-center justify-center border transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                      isMuted
                        ? "bg-red-500/90 border-red-500 text-white"
                        : "bg-zinc-200/50 dark:bg-white/10 border-zinc-300 dark:border-white/15 text-zinc-700 dark:text-white hover:bg-zinc-300/50 dark:hover:bg-white/20"
                    }`}
                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>

                  {callType === "video" && (
                    <button
                      onClick={toggleCamera}
                      disabled={callState === "outgoing"}
                      className={`h-12 w-12 rounded-full flex items-center justify-center border transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                        isCameraOff
                          ? "bg-red-500/90 border-red-500 text-white"
                          : "bg-zinc-200/50 dark:bg-white/10 border-zinc-300 dark:border-white/15 text-zinc-700 dark:text-white hover:bg-zinc-300/50 dark:hover:bg-white/20"
                      }`}
                      title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                    >
                      {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </button>
                  )}

                  {callType === "video" && (
                    <button
                      onClick={toggleScreenShare}
                      disabled={callState === "outgoing"}
                      className={`h-12 w-12 rounded-full flex items-center justify-center border transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                        isScreenSharing
                          ? "bg-brand-primary/90 border-brand-primary text-white"
                          : "bg-zinc-200/50 dark:bg-white/10 border-zinc-300 dark:border-white/15 text-zinc-700 dark:text-white hover:bg-zinc-300/50 dark:hover:bg-white/20"
                      }`}
                      title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
                    >
                      {isScreenSharing ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
                    </button>
                  )}

                  {callType === "audio" && (
                    <button
                      onClick={() => setIsSpeaker(!isSpeaker)}
                      disabled={callState === "outgoing"}
                      className={`h-12 w-12 rounded-full flex items-center justify-center border transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                        isSpeaker
                          ? "bg-zinc-200/50 dark:bg-white/10 border-zinc-300 dark:border-white/15 text-zinc-700 dark:text-white hover:bg-zinc-300/50 dark:hover:bg-white/20"
                          : "bg-red-500/90 border-red-500 text-white"
                      }`}
                      title={isSpeaker ? "Speaker On (tap to mute speaker)" : "Speaker Off (tap to enable speaker)"}
                    >
                      {isSpeaker ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                  )}
                </div>

                <button
                  onClick={callState === "outgoing" ? declineCall : endCall}
                  className="flex flex-col items-center gap-2 group focus:outline-none"
                >
                  <div className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 flex items-center justify-center shadow-lg transition-all duration-150 cursor-pointer">
                    <PhoneOff size={26} className="text-white" />
                  </div>
                  <span className="text-base text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors font-medium">
                    {callState === "outgoing" ? "Cancel" : "End Call"}
                  </span>
                </button>

              </div>
            )}

          </div>

        </div>

      </div>
    </React.Fragment>
  );
}
