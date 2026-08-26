import { create } from "zustand";
import { useSocketStore } from "./useSocketStore";
import { useAuthStore } from "./useAuthStore";
import { toast } from "sonner";

interface CallPartner {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export type CallState = "idle" | "incoming" | "outgoing" | "connected";

interface CallStoreState {
  callState: CallState;
  callType: "audio" | "video";
  isGroupCall: boolean;

  // 1-to-1 specifics
  partner: CallPartner | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;

  // Group Call specifics
  groupChatId: string | null;
  groupChatTitle: string | null;
  peerConnections: Record<string, RTCPeerConnection>;
  remoteStreams: Record<string, MediaStream>;
  participants: Record<string, CallPartner>;

  localStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;

  // Actions
  initiateCall: (targetUserId: string, targetName: string, targetAvatar: string | null, type: "audio" | "video") => Promise<void>;
  receiveCall: (payload: { fromUserId: string; fromUserName: string; fromUserAvatar: string | null; sdp: any; callType: "audio" | "video" }) => void;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;

  // Group Call Actions
  initiateGroupCall: (chatId: string, chatTitle: string, type: "audio" | "video") => Promise<void>;
  receiveGroupCall: (payload: { chatId: string; chatTitle: string; chatAvatar: string | null; fromUserId: string; fromUserName: string; fromUserAvatar: string | null; callType: "audio" | "video" }) => void;
  acceptGroupCall: () => Promise<void>;
  respondToGroupCall: (status: "accepted" | "declined") => void;
  handleParticipantJoined: (userId: string) => Promise<void>;
  handleParticipantLeft: (userId: string) => void;
  handleGroupOffer: (fromUserId: string, sdp: any, callType: "audio" | "video") => Promise<void>;
  handleGroupAnswer: (fromUserId: string, sdp: any) => Promise<void>;

  toggleMute: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => Promise<void>;
  handleIceCandidate: (candidate: any, fromUserId?: string) => void;
  handleAnswer: (sdp: any) => void;
  resetCallStore: () => void;
  ringVolume: number;
  setRingVolume: (volume: number) => void;
}

// ─── Ringtone ────────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;
let ringGain: GainNode | null = null;
let ringInterval: any = null;

// Scales normalized 0..1 volume to a gentle, comfortable acoustic gain curve.
function computeComfortGain(vol: number): number {
  const clamped = Math.max(0, Math.min(1, vol));
  return Math.pow(clamped, 1.2) * 0.25;
}

const getInitialRingVolume = (): number => {
  if (typeof window === "undefined") return 0.3; // default to a comfortable 30%
  try {
    const saved = localStorage.getItem("quickconnect_call_ring_volume");
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return Math.round(parsed * 100) / 100;
    }
  } catch {}
  return 0.3;
};

function startRingtone(type: "dial" | "ring") {
  if (typeof window === "undefined") return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
    stopRingtone();
    ringGain = audioCtx.createGain();
    const volume = useCallStore.getState().ringVolume;
    const targetGain = computeComfortGain(volume);
    ringGain.gain.setValueAtTime(targetGain, audioCtx.currentTime);
    ringGain.gain.value = targetGain;
    ringGain.connect(audioCtx.destination);

    const playBeep = () => {
      if (!audioCtx || !ringGain) return;
      const now = audioCtx.currentTime;
      if (type === "dial") {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);
        osc1.connect(ringGain);
        osc2.connect(ringGain);
        osc1.start(now); osc2.start(now);
        osc1.stop(now + 1.5); osc2.stop(now + 1.5);
      } else {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
          const osc = audioCtx!.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + i * 0.15);
          osc.connect(ringGain!);
          osc.start(now + i * 0.15);
          osc.stop(now + i * 0.15 + 0.3);
        });
      }
    };

    playBeep();
    ringInterval = setInterval(playBeep, type === "dial" ? 4000 : 2500);
  } catch (err) {
    console.error("Failed to start ringtone:", err);
  }
}

function stopRingtone() {
  if (ringInterval) { clearInterval(ringInterval); ringInterval = null; }
  try { ringGain?.disconnect(); } catch {}
  ringGain = null;
}

// ─── WebRTC config ────────────────────────────────────────────────────────────

const STUN_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

// ─── Media helper with graceful device fallback ────────────────────────────────
// Returns a MediaStream. If the camera is missing, falls back to audio-only.
// If the mic is missing, throws a user-friendly error.
async function getMediaStream(type: "audio" | "video"): Promise<{ stream: MediaStream; actualType: "audio" | "video" }> {
  const audioConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  const videoConstraints: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
    facingMode: "user",
  };

  if (type === "video") {
    // Try full video + audio first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: videoConstraints,
      });
      return { stream, actualType: "video" };
    } catch (err: any) {
      const isDeviceMissing =
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError" ||
        err.name === "OverconstrainedError";

      if (isDeviceMissing) {
        // Try with relaxed video constraints before giving up on video
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: true, // minimal constraints
          });
          toast.warning("Using lower quality camera — your device doesn't support HD.");
          return { stream, actualType: "video" };
        } catch {
          // Camera truly unavailable — fall back to audio-only
          toast.warning("Camera not found. Switching to audio-only call.");
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false,
          });
          return { stream, actualType: "audio" };
        }
      }

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        throw new Error("Camera or microphone permission denied. Please allow access in your browser settings.");
      }
      if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        // Device is in use — try audio only as fallback
        toast.warning("Camera is in use by another app. Switching to audio-only call.");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
        return { stream, actualType: "audio" };
      }
      throw err;
    }
  } else {
    // Audio-only call
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });
      return { stream, actualType: "audio" };
    } catch (err: any) {
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        throw new Error("No microphone found. Please connect a microphone and try again.");
      }
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        throw new Error("Microphone permission denied. Please allow access in your browser settings.");
      }
      if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        throw new Error("Microphone is in use by another app. Please close that app and try again.");
      }
      throw err;
    }
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCallStore = create<CallStoreState>((set, get) => {
  // Module-level ephemeral state (not in Zustand to avoid serialization)
  let pendingCandidates: RTCIceCandidateInit[] = [];
  let pendingGroupCandidates: Record<string, RTCIceCandidateInit[]> = {};
  let pendingOffer: RTCSessionDescriptionInit | null = null;

  const cleanMedia = () => {
    const { localStream, remoteStream, peerConnection, peerConnections, remoteStreams } = get();
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    if (remoteStream) remoteStream.getTracks().forEach((t) => t.stop());
    if (peerConnection) { try { peerConnection.close(); } catch {} }
    Object.values(peerConnections).forEach((pc) => { try { pc.close(); } catch {} });
    Object.values(remoteStreams).forEach((s) => s.getTracks().forEach((t) => t.stop()));
    stopRingtone();
    pendingCandidates = [];
    pendingGroupCandidates = {};
    pendingOffer = null;
  };

  // Helper: drain ICE candidates into a peer connection once remote description is set
  const drainCandidates = (pc: RTCPeerConnection, candidates: RTCIceCandidateInit[]) => {
    candidates.forEach((c) => {
      void pc.addIceCandidate(new RTCIceCandidate(c)).catch((err) => {
        console.warn("Failed to add ICE candidate:", err);
      });
    });
  };

  const createGroupPeerConnection = (userId: string, _isInitiator: boolean) => {
    const pc = new RTCPeerConnection(STUN_SERVERS);
    const { localStream } = get();

    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        useSocketStore.getState().socket?.emit("call:ice-candidate", {
          targetUserId: userId,
          candidate: event.candidate,
          fromUserId: useAuthStore.getState().user?.id,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams?.[0]) {
        set((state) => ({ remoteStreams: { ...state.remoteStreams, [userId]: event.streams[0] } }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        console.warn(`Group peer connection to ${userId} failed.`);
      }
    };

    set((state) => ({ peerConnections: { ...state.peerConnections, [userId]: pc } }));
    return pc;
  };

  return {
    callState: "idle",
    callType: "audio",
    isGroupCall: false,
    partner: null,
    remoteStream: null,
    peerConnection: null,
    groupChatId: null,
    groupChatTitle: null,
    peerConnections: {},
    remoteStreams: {},
    participants: {},
    localStream: null,
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
    ringVolume: getInitialRingVolume(),

    setRingVolume: (volume) => {
      const clamped = Math.max(0, Math.min(1, Math.round(volume * 100) / 100));
      set({ ringVolume: clamped });
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("quickconnect_call_ring_volume", clamped.toString());
        }
      } catch {}
      if (ringGain && audioCtx) {
        try {
          const targetGain = computeComfortGain(clamped);
          ringGain.gain.cancelScheduledValues(audioCtx.currentTime);
          ringGain.gain.setValueAtTime(targetGain, audioCtx.currentTime);
          ringGain.gain.value = targetGain;
        } catch {}
      }
    },

    // ── 1-to-1: Caller ──────────────────────────────────────────────────────

    initiateCall: async (targetUserId, targetName, targetAvatar, type) => {
      cleanMedia();
      set({
        callState: "outgoing", callType: type, isGroupCall: false,
        partner: { id: targetUserId, name: targetName, avatarUrl: targetAvatar },
        isMuted: false, isCameraOff: false, isScreenSharing: false,
      });
      startRingtone("dial");

      try {
        const { stream, actualType } = await getMediaStream(type);
        // If we fell back to audio, update the call type
        if (actualType !== type) set({ callType: actualType });
        set({ localStream: stream });

        const pc = new RTCPeerConnection(STUN_SERVERS);
        set({ peerConnection: pc });

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (event.streams?.[0]) set({ remoteStream: event.streams[0] });
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            useSocketStore.getState().socket?.emit("call:ice-candidate", {
              targetUserId, candidate: event.candidate,
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed") {
            toast.error("Call connection failed. Please try again.");
            get().endCall();
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const socket = useSocketStore.getState().socket;
        const user = useAuthStore.getState().user;
        socket?.emit("call:initiate", {
          targetUserId,
          fromUserId: user?.id,
          fromUserName: user?.name,
          fromUserAvatar: user?.avatarUrl,
          sdp: offer,
          callType: actualType,
        });
      } catch (err: any) {
        console.error("Call initiation error:", err);
        toast.error(err.message || "Failed to access camera or microphone.");
        get().resetCallStore();
      }
    },

    // ── 1-to-1: Receiver ────────────────────────────────────────────────────

    receiveCall: (payload) => {
      cleanMedia();
      // Store the offer for use in acceptCall — DO NOT call setRemoteDescription here.
      // Tracks must be added to the peer connection BEFORE setRemoteDescription
      // so the answer SDP properly negotiates media.
      pendingOffer = payload.sdp;

      set({
        callState: "incoming", callType: payload.callType, isGroupCall: false,
        partner: { id: payload.fromUserId, name: payload.fromUserName, avatarUrl: payload.fromUserAvatar },
        isMuted: false, isCameraOff: false, isScreenSharing: false,
      });
      startRingtone("ring");

      const pc = new RTCPeerConnection(STUN_SERVERS);
      set({ peerConnection: pc });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          useSocketStore.getState().socket?.emit("call:ice-candidate", {
            targetUserId: payload.fromUserId, candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams?.[0]) set({ remoteStream: event.streams[0] });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          toast.error("Call connection failed.");
          get().resetCallStore();
        }
      };
    },

    acceptCall: async () => {
      const { peerConnection, partner, callType } = get();
      if (!peerConnection || !partner) return;
      stopRingtone();
      set({ callState: "connected" });

      try {
        const { stream, actualType } = await getMediaStream(callType);
        if (actualType !== callType) set({ callType: actualType });
        set({ localStream: stream });

        // 1. Add local tracks FIRST so the answer SDP includes our media
        stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

        // 2. Now apply the stored offer
        if (pendingOffer) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(pendingOffer));
          // 3. Drain any ICE candidates that arrived before remote description was set
          drainCandidates(peerConnection, pendingCandidates);
          pendingCandidates = [];
          pendingOffer = null;
        }

        // 4. Create and send the answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        useSocketStore.getState().socket?.emit("call:accept", { targetUserId: partner.id, sdp: answer });
      } catch (err: any) {
        console.error("Error accepting call:", err);
        toast.error(err.message || "Failed to answer the call.");
        get().declineCall();
      }
    },

    declineCall: () => {
      const { partner, isGroupCall } = get();
      if (isGroupCall) {
        get().respondToGroupCall("declined");
      } else if (partner) {
        useSocketStore.getState().socket?.emit("call:decline", { targetUserId: partner.id });
      }
      get().resetCallStore();
    },

    endCall: () => {
      const { callState, partner, isGroupCall, groupChatId } = get();
      const socket = useSocketStore.getState().socket;
      if (isGroupCall && groupChatId) {
        socket?.emit(callState === "outgoing" ? "call:end-group" : "call:leave-group", { chatId: groupChatId });
      } else if (partner) {
        socket?.emit("call:hangup", { targetUserId: partner.id });
      }
      get().resetCallStore();
    },

    // ── 1-to-1: Caller receives answer ───────────────────────────────────────

    handleAnswer: (sdp) => {
      const { peerConnection } = get();
      if (!peerConnection) return;
      stopRingtone();
      set({ callState: "connected" });
      void peerConnection.setRemoteDescription(new RTCSessionDescription(sdp))
        .then(() => {
          drainCandidates(peerConnection, pendingCandidates);
          pendingCandidates = [];
        })
        .catch((err) => console.error("setRemoteDescription (answer) failed:", err));
    },

    // ── Group Call: Initiator ─────────────────────────────────────────────────

    initiateGroupCall: async (chatId, chatTitle, type) => {
      cleanMedia();
      set({
        callState: "outgoing", callType: type, isGroupCall: true,
        groupChatId: chatId, groupChatTitle: chatTitle,
        isMuted: false, isCameraOff: false, isScreenSharing: false,
        peerConnections: {}, remoteStreams: {}, participants: {},
      });
      startRingtone("dial");

      try {
        const { stream, actualType } = await getMediaStream(type);
        if (actualType !== type) set({ callType: actualType });
        set({ localStream: stream });

        const socket = useSocketStore.getState().socket;
        const user = useAuthStore.getState().user;

        // Join the socket room BEFORE emitting the call so we receive
        // call:participant-joined events from people who accept.
        socket?.emit("chat:join", { chatId });

        socket?.emit("call:initiate-group", {
          chatId,
          fromUserName: user?.name,
          fromUserAvatar: user?.avatarUrl,
          callType: actualType,
        });
      } catch (err: any) {
        console.error("Group call initiation error:", err);
        toast.error(err.message || "Failed to access camera or microphone.");
        get().resetCallStore();
      }
    },

    // ── Group Call: Receiver ───────────────────────────────────────────────────

    receiveGroupCall: (payload) => {
      if (get().callState !== "idle") return; // already in a call
      cleanMedia();
      set({
        callState: "incoming", callType: payload.callType, isGroupCall: true,
        groupChatId: payload.chatId, groupChatTitle: payload.chatTitle,
        participants: {
          [payload.fromUserId]: { id: payload.fromUserId, name: payload.fromUserName, avatarUrl: payload.fromUserAvatar },
        },
        isMuted: false, isCameraOff: false, isScreenSharing: false,
      });
      startRingtone("ring");
    },

    acceptGroupCall: async () => {
      const { groupChatId, callType } = get();
      if (!groupChatId) return;
      stopRingtone();
      set({ callState: "connected" });

      try {
        const { stream, actualType } = await getMediaStream(callType);
        if (actualType !== callType) set({ callType: actualType });
        set({ localStream: stream });

        const socket = useSocketStore.getState().socket;
        // Join socket room so we get participant events
        socket?.emit("chat:join", { chatId: groupChatId });
        socket?.emit("call:join-group", { chatId: groupChatId });
        get().respondToGroupCall("accepted");
      } catch (err: any) {
        console.error("Failed to accept group call:", err);
        toast.error(err.message || "Failed to access camera or microphone.");
        get().respondToGroupCall("declined");
        get().resetCallStore();
      }
    },

    respondToGroupCall: (status) => {
      const { groupChatId } = get();
      if (!groupChatId) return;
      useSocketStore.getState().socket?.emit("call:group-response", { chatId: groupChatId, status });
    },

    // ── Group Call: Peer connection management ────────────────────────────────

    handleParticipantJoined: async (userId) => {
      const { callState, isGroupCall, callType } = get();
      if ((callState !== "connected" && callState !== "outgoing") || !isGroupCall) return;

      if (callState === "outgoing") {
        set({ callState: "connected" });
        stopRingtone();
      }

      const pc = createGroupPeerConnection(userId, true);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        useSocketStore.getState().socket?.emit("call:offer", { targetUserId: userId, sdp: offer, callType });
      } catch (err) {
        console.error("Failed to create offer for participant:", err);
      }
    },

    handleParticipantLeft: (userId) => {
      const { peerConnections, remoteStreams, participants } = get();
      try { peerConnections[userId]?.close(); } catch {}
      const newPcs = { ...peerConnections };
      const newStreams = { ...remoteStreams };
      const newParticipants = { ...participants };
      delete newPcs[userId];
      delete newStreams[userId];
      delete newParticipants[userId];
      set({ peerConnections: newPcs, remoteStreams: newStreams, participants: newParticipants });
    },

    handleGroupOffer: async (fromUserId, sdp, callType) => {
      const { callState, isGroupCall } = get();
      if ((callState !== "connected" && callState !== "outgoing") || !isGroupCall) return;
      if (callState === "outgoing") { set({ callState: "connected" }); stopRingtone(); }

      const pc = createGroupPeerConnection(fromUserId, false);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        // Drain any pending candidates for this peer
        if (pendingGroupCandidates[fromUserId]) {
          drainCandidates(pc, pendingGroupCandidates[fromUserId]);
          delete pendingGroupCandidates[fromUserId];
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        useSocketStore.getState().socket?.emit("call:answer", { targetUserId: fromUserId, sdp: answer });
      } catch (err) {
        console.error("handleGroupOffer error:", err);
      }
    },

    handleGroupAnswer: async (fromUserId, sdp) => {
      const pc = get().peerConnections[fromUserId];
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        if (pendingGroupCandidates[fromUserId]) {
          drainCandidates(pc, pendingGroupCandidates[fromUserId]);
          delete pendingGroupCandidates[fromUserId];
        }
      } catch (err) {
        console.error("handleGroupAnswer error:", err);
      }
    },

    // ── ICE Candidates ────────────────────────────────────────────────────────

    handleIceCandidate: (candidate, fromUserId) => {
      const { isGroupCall, peerConnections, peerConnection } = get();

      if (isGroupCall && fromUserId) {
        const pc = peerConnections[fromUserId];
        if (pc?.remoteDescription) {
          void pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn);
        } else {
          if (!pendingGroupCandidates[fromUserId]) pendingGroupCandidates[fromUserId] = [];
          pendingGroupCandidates[fromUserId].push(candidate);
        }
      } else {
        if (peerConnection?.remoteDescription) {
          void peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn);
        } else {
          pendingCandidates.push(candidate);
        }
      }
    },

    // ── Media controls ────────────────────────────────────────────────────────

    toggleMute: () => {
      const { localStream, isMuted } = get();
      localStream?.getAudioTracks().forEach((t) => (t.enabled = isMuted));
      set({ isMuted: !isMuted });
    },

    toggleCamera: () => {
      const { localStream, isCameraOff, isScreenSharing, toggleScreenShare } = get();
      if (isScreenSharing) {
        void toggleScreenShare();
      } else {
        localStream?.getVideoTracks().forEach((t) => (t.enabled = isCameraOff));
        set({ isCameraOff: !isCameraOff });
      }
    },

    toggleScreenShare: async () => {
      const { localStream, isScreenSharing, peerConnection, peerConnections, isCameraOff } = get();
      if (!localStream) return;

      try {
        if (!isScreenSharing) {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          const screenTrack = displayStream.getVideoTracks()[0];

          screenTrack.onended = () => { void get().toggleScreenShare(); };

          const oldTrack = localStream.getVideoTracks()[0];
          if (oldTrack) localStream.removeTrack(oldTrack);
          localStream.addTrack(screenTrack);

          const replaceInSender = (pc: RTCPeerConnection) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) sender.replaceTrack(screenTrack).catch(console.error);
          };
          if (peerConnection) replaceInSender(peerConnection);
          Object.values(peerConnections).forEach(replaceInSender);

          set({ isScreenSharing: true, isCameraOff: false });
        } else {
          const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          });
          const cameraTrack = cameraStream.getVideoTracks()[0];
          if (isCameraOff) cameraTrack.enabled = false;

          const oldTrack = localStream.getVideoTracks()[0];
          if (oldTrack) { oldTrack.stop(); localStream.removeTrack(oldTrack); }
          localStream.addTrack(cameraTrack);

          const replaceInSender = (pc: RTCPeerConnection) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) sender.replaceTrack(cameraTrack).catch(console.error);
          };
          if (peerConnection) replaceInSender(peerConnection);
          Object.values(peerConnections).forEach(replaceInSender);

          set({ isScreenSharing: false });
        }
      } catch (err) {
        console.error("Screen sharing error:", err);
        toast.error("Failed to share screen.");
      }
    },

    // ── Reset ─────────────────────────────────────────────────────────────────

    resetCallStore: () => {
      cleanMedia();
      set({
        callState: "idle", isGroupCall: false, partner: null,
        peerConnection: null, localStream: null, remoteStream: null,
        groupChatId: null, groupChatTitle: null,
        peerConnections: {}, remoteStreams: {}, participants: {},
        isMuted: false, isCameraOff: false, isScreenSharing: false,
      });
    },
  };
});
