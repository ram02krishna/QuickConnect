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
  receiveGroupCall: (payload: { chatId: string, chatTitle: string, chatAvatar: string | null, fromUserId: string, fromUserName: string, fromUserAvatar: string | null, callType: "audio" | "video" }) => void;
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

let audioCtx: AudioContext | null = null;
let ringGain: GainNode | null = null;
let ringInterval: any = null;

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
    ringGain.gain.setValueAtTime(volume, audioCtx.currentTime);
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
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.5);
        osc2.stop(now + 1.5);
      } else {
        // Charming melody for incoming ringtone
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
    console.error("Failed to start synthetic ringtone:", err);
  }
}

function stopRingtone() {
  if (ringInterval) { clearInterval(ringInterval); ringInterval = null; }
  try {
    ringGain?.disconnect();
  } catch {}
  ringGain = null;
}

const STUN_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
    { urls: "stun:stun.cloudflare.com:3478" }
  ],
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

export const useCallStore = create<CallStoreState>((set, get) => {
  let pendingCandidates: any[] = [];
  let pendingGroupCandidates: Record<string, any[]> = {};

  const cleanMedia = () => {
    const { localStream, remoteStream, peerConnection, peerConnections, remoteStreams } = get();
    if (localStream) localStream.getTracks().forEach((track) => track.stop());
    if (remoteStream) remoteStream.getTracks().forEach((track) => track.stop());
    if (peerConnection) peerConnection.close();
    
    Object.values(peerConnections).forEach(pc => pc.close());
    Object.values(remoteStreams).forEach(stream => stream.getTracks().forEach(track => track.stop()));

    stopRingtone();
    pendingCandidates = [];
    pendingGroupCandidates = {};
  };

  const createGroupPeerConnection = (userId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(STUN_SERVERS);
    const { localStream } = get();
    
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = useSocketStore.getState().socket;
        if (socket) {
          socket.emit("call:ice-candidate", {
            targetUserId: userId,
            candidate: event.candidate,
            fromUserId: useAuthStore.getState().user?.id
          });
        }
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        set(state => ({
          remoteStreams: { ...state.remoteStreams, [userId]: event.streams[0] }
        }));
      }
    };
    
    set(state => ({
      peerConnections: { ...state.peerConnections, [userId]: pc }
    }));
    
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
    ringVolume: 0.3,
    setRingVolume: (volume) => {
      set({ ringVolume: volume });
      if (ringGain) {
        try {
          ringGain.gain.value = volume;
          if (audioCtx) {
            ringGain.gain.setValueAtTime(volume, audioCtx.currentTime);
          }
        } catch {}
      }
    },

    initiateCall: async (targetUserId, targetName, targetAvatar, type) => {
      cleanMedia();
      set({ 
        callState: "outgoing", callType: type, isGroupCall: false,
        partner: { id: targetUserId, name: targetName, avatarUrl: targetAvatar },
        isMuted: false, isCameraOff: false, isScreenSharing: false
      });
      startRingtone("dial");

      try {
        const constraints = {
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: true,
            googEchoCancellation: true,
            googAutoGainControl: true,
            googNoiseSuppression: true
          } as any,
          video: type === "video" ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: "user"
          } : false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        set({ localStream: stream });

        const pc = new RTCPeerConnection(STUN_SERVERS);
        set({ peerConnection: pc });
        
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) set({ remoteStream: event.streams[0] });
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            useSocketStore.getState().socket?.emit("call:ice-candidate", {
              targetUserId, candidate: event.candidate
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const socket = useSocketStore.getState().socket;
        const user = useAuthStore.getState().user;
        if (socket) {
          socket.emit("call:initiate", {
            targetUserId, fromUserId: user?.id, fromUserName: user?.name, fromUserAvatar: user?.avatarUrl,
            sdp: offer, callType: type
          });
        }
      } catch (err) {
        console.error("WebRTC getUserMedia error:", err);
        toast.error("Failed to access camera or microphone");
        get().declineCall();
      }
    },

    receiveCall: (payload) => {
      cleanMedia();
      set({
        callState: "incoming", callType: payload.callType, isGroupCall: false,
        partner: { id: payload.fromUserId, name: payload.fromUserName, avatarUrl: payload.fromUserAvatar },
        isMuted: false, isCameraOff: false, isScreenSharing: false
      });
      startRingtone("ring");
      
      const pc = new RTCPeerConnection(STUN_SERVERS);
      set({ peerConnection: pc });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          useSocketStore.getState().socket?.emit("call:ice-candidate", {
            targetUserId: payload.fromUserId, candidate: event.candidate
          });
        }
      };
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) set({ remoteStream: event.streams[0] });
      };

      void pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
        .then(() => {
          pendingCandidates.forEach(c => void pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error));
          pendingCandidates = [];
        }).catch(console.error);
    },

    acceptCall: async () => {
      const { peerConnection, partner, callType } = get();
      if (!peerConnection || !partner) return;
      stopRingtone();
      set({ callState: "connected" });

      try {
        const constraints = {
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: true,
            googEchoCancellation: true,
            googAutoGainControl: true,
            googNoiseSuppression: true
          } as any,
          video: callType === "video" ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: "user"
          } : false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        set({ localStream: stream });
        stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        useSocketStore.getState().socket?.emit("call:accept", { targetUserId: partner.id, sdp: answer });
      } catch (err) {
        console.error("Error answering WebRTC call:", err);
        toast.error("Failed to answer call with camera/mic");
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

    // Group Call Logic
    initiateGroupCall: async (chatId, chatTitle, type) => {
      cleanMedia();
      set({ 
        callState: "outgoing", callType: type, isGroupCall: true,
        groupChatId: chatId, groupChatTitle: chatTitle,
        isMuted: false, isCameraOff: false, isScreenSharing: false, peerConnections: {}, remoteStreams: {}, participants: {}
      });
      startRingtone("dial");

      try {
        const constraints = {
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: true,
            googEchoCancellation: true,
            googAutoGainControl: true,
            googNoiseSuppression: true
          } as any,
          video: type === "video" ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: "user"
          } : false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        set({ localStream: stream });

        const user = useAuthStore.getState().user;
        useSocketStore.getState().socket?.emit("call:initiate-group", {
          chatId, fromUserName: user?.name, fromUserAvatar: user?.avatarUrl, callType: type
        });
        
        // As initiator, wait for others to join (stay in outgoing state)

      } catch (err) {
        console.error("Failed to initiate group call:", err);
        toast.error("Failed to access camera or microphone");
        get().resetCallStore();
      }
    },

    receiveGroupCall: (payload) => {
      // Ignore if already in a call
      if (get().callState !== "idle") return;
      cleanMedia();
      set({
        callState: "incoming", callType: payload.callType, isGroupCall: true,
        groupChatId: payload.chatId, groupChatTitle: payload.chatTitle,
        participants: {
          [payload.fromUserId]: { id: payload.fromUserId, name: payload.fromUserName, avatarUrl: payload.fromUserAvatar }
        },
        isMuted: false, isCameraOff: false, isScreenSharing: false
      });
      startRingtone("ring");
    },

    acceptGroupCall: async () => {
      const { groupChatId, callType } = get();
      if (!groupChatId) return;
      stopRingtone();
      set({ callState: "connected" });

      try {
        const constraints = {
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: true,
            googEchoCancellation: true,
            googAutoGainControl: true,
            googNoiseSuppression: true
          } as any,
          video: callType === "video" ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15, max: 24 }, facingMode: "user" } : false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        set({ localStream: stream });

        // Tell everyone in the group chat we joined, so they can send us offers
        useSocketStore.getState().socket?.emit("call:join-group", { chatId: groupChatId });
        get().respondToGroupCall("accepted");
      } catch (err) {
        console.error("Failed to answer group call:", err);
        get().respondToGroupCall("declined");
        get().resetCallStore();
      }
    },

    respondToGroupCall: (status) => {
      const { groupChatId } = get();
      if (!groupChatId) return;
      useSocketStore.getState().socket?.emit("call:group-response", {
        chatId: groupChatId,
        status,
      });
    },

    handleParticipantJoined: async (userId) => {
      const { callState, isGroupCall, callType } = get();
      if ((callState !== "connected" && callState !== "outgoing") || !isGroupCall) return;

      if (callState === "outgoing") {
        set({ callState: "connected" });
        stopRingtone();
      }

      const pc = createGroupPeerConnection(userId, true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      useSocketStore.getState().socket?.emit("call:offer", {
        targetUserId: userId, sdp: offer, callType
      });
    },

    handleParticipantLeft: (userId) => {
      const { peerConnections, remoteStreams, participants } = get();
      if (peerConnections[userId]) {
        peerConnections[userId].close();
        const newPcs = { ...peerConnections };
        delete newPcs[userId];
        
        const newStreams = { ...remoteStreams };
        delete newStreams[userId];
        
        const newParticipants = { ...participants };
        delete newParticipants[userId];
        
        set({ peerConnections: newPcs, remoteStreams: newStreams, participants: newParticipants });
      }
    },

    handleGroupOffer: async (fromUserId, sdp, callType) => {
      const { callState, isGroupCall } = get();
      if ((callState !== "connected" && callState !== "outgoing") || !isGroupCall) return;

      if (callState === "outgoing") {
        set({ callState: "connected" });
        stopRingtone();
      }

      const pc = createGroupPeerConnection(fromUserId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      useSocketStore.getState().socket?.emit("call:answer", {
        targetUserId: fromUserId, sdp: answer
      });

      // Process pending candidates
      if (pendingGroupCandidates[fromUserId]) {
        pendingGroupCandidates[fromUserId].forEach(c => {
          void pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
        });
        delete pendingGroupCandidates[fromUserId];
      }
    },

    handleGroupAnswer: async (fromUserId, sdp) => {
      const pc = get().peerConnections[fromUserId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        if (pendingGroupCandidates[fromUserId]) {
          pendingGroupCandidates[fromUserId].forEach(c => {
            void pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
          });
          delete pendingGroupCandidates[fromUserId];
        }
      }
    },

    toggleMute: () => {
      const { localStream, isMuted } = get();
      if (localStream) {
        localStream.getAudioTracks().forEach((track) => track.enabled = isMuted);
        set({ isMuted: !isMuted });
      }
    },

    toggleCamera: () => {
      const { localStream, isCameraOff, isScreenSharing, toggleScreenShare } = get();
      if (isScreenSharing) {
        void toggleScreenShare();
      } else if (localStream) {
        localStream.getVideoTracks().forEach((track) => track.enabled = isCameraOff);
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
          
          screenTrack.onended = () => {
             get().toggleScreenShare().catch(console.error);
          };

          const oldTrack = localStream.getVideoTracks()[0];
          if (oldTrack) {
            localStream.removeTrack(oldTrack);
            // Optionally stop the old camera track here if you want to completely release it:
            // oldTrack.stop();
          }
          localStream.addTrack(screenTrack);

          if (peerConnection) {
            const sender = peerConnection.getSenders().find(s => s.track?.kind === "video");
            if (sender) sender.replaceTrack(screenTrack).catch(console.error);
          }
          Object.values(peerConnections).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === "video");
            if (sender) sender.replaceTrack(screenTrack).catch(console.error);
          });

          set({ isScreenSharing: true, isCameraOff: false });
        } else {
          // Revert to camera
          const constraints = { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } };
          const cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
          const cameraTrack = cameraStream.getVideoTracks()[0];
          
          // Stop the screen track
          const oldTrack = localStream.getVideoTracks()[0];
          if (oldTrack) {
            oldTrack.stop();
            localStream.removeTrack(oldTrack);
          }
          
          if (isCameraOff) {
            cameraTrack.enabled = false;
          }
          localStream.addTrack(cameraTrack);

          if (peerConnection) {
            const sender = peerConnection.getSenders().find(s => s.track?.kind === "video");
            if (sender) sender.replaceTrack(cameraTrack).catch(console.error);
          }
          Object.values(peerConnections).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === "video");
            if (sender) sender.replaceTrack(cameraTrack).catch(console.error);
          });

          set({ isScreenSharing: false });
        }
      } catch (err) {
        console.error("Screen sharing error:", err);
      }
    },

    handleIceCandidate: (candidate, fromUserId) => {
      const { isGroupCall, peerConnections, peerConnection } = get();
      
      if (isGroupCall && fromUserId) {
        const pc = peerConnections[fromUserId];
        if (pc && pc.remoteDescription) {
          void pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        } else {
          if (!pendingGroupCandidates[fromUserId]) pendingGroupCandidates[fromUserId] = [];
          pendingGroupCandidates[fromUserId].push(candidate);
        }
      } else {
        if (peerConnection && peerConnection.remoteDescription) {
          void peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        } else {
          pendingCandidates.push(candidate);
        }
      }
    },

    handleAnswer: (sdp) => {
      const { peerConnection } = get();
      if (peerConnection) {
        stopRingtone();
        set({ callState: "connected" });
        void peerConnection.setRemoteDescription(new RTCSessionDescription(sdp))
          .then(() => {
            pendingCandidates.forEach((c) => void peerConnection.addIceCandidate(new RTCIceCandidate(c)).catch(console.error));
            pendingCandidates = [];
          })
          .catch(console.error);
      }
    },

    resetCallStore: () => {
      cleanMedia();
      set({
        callState: "idle", isGroupCall: false, partner: null, peerConnection: null, localStream: null, remoteStream: null,
        groupChatId: null, groupChatTitle: null, peerConnections: {}, remoteStreams: {}, participants: {}
      });
    }
  };
});
