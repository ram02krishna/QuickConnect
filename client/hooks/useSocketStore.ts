import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { useChatStore } from "./useChatStore";
import { useCallStore } from "./useCallStore";
import api from "@lib/api";
import { toast } from "sonner";
import { useAuthStore } from "./useAuthStore";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:5000";

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connectSocket: (token: string) => void;
  disconnectSocket: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connectSocket: (token) => {
    // don't create a new socket if already connected
    if (get().socket?.connected) return;

    get().socket?.disconnect();

    const socket = io(WS_BASE_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      // Start retrying almost immediately (200ms) instead of waiting 1 full second
      reconnectionDelay: 200,
      reconnectionDelayMax: 3000,
      // Fail fast on initial connect; don't block for 60s before declaring failure
      timeout: 10000,
    });

    socket.on("connect", () => {
      set({ isConnected: true });
      console.log("🔌 Connected to QuickConnect WebSocket");
    });

    socket.on("disconnect", () => {
      set({ isConnected: false });
      console.log("🔌 Disconnected from QuickConnect WebSocket");
    });

    // message events
    socket.on("message:new", async (message) => {
      const chatExists = useChatStore.getState().chats.some((c) => c.id === message.chatId);
      if (!chatExists) {
        try {
          const res = await api.get(`/chats/${message.chatId}`);
          if (res.data?.data?.chat) {
            useChatStore.getState().upsertChat(res.data.data.chat);
          }
        } catch (err) {
          console.error("Failed to fetch new chat details:", err);
        }
      }
      useChatStore.getState().addMessage(message.chatId, message);

      // acknowledge delivery for messages from other users
      const currentUserId = useAuthStore.getState().user?.id;
      if (message.senderId !== currentUserId) {
        socket.emit("message:delivered", { messageId: message.id, chatId: message.chatId });
      }

      triggerNotification(message);
    });

    socket.on("message:delivered", (payload) => {
      useChatStore.getState().updateReceipt(payload.chatId, payload.messageId, payload.receipt);
    });

    socket.on("message:read", (payload) => {
      useChatStore.getState().updateReceipt(payload.chatId, payload.messageId, payload.receipt);
    });

    socket.on("message:deleted-for-everyone", (payload: { chatId: string; messageId: string }) => {
      useChatStore.getState().markMessageDeletedForEveryone(payload.chatId, payload.messageId);
    });

    socket.on("chat:deleted", (payload: { chatId: string }) => {
      useChatStore.getState().deleteChat(payload.chatId);
    });

    // presence and typing
    socket.on("presence:change", (payload: { userId: string; status: "online" | "offline"; lastSeen?: string }) => {
      const statusValue = payload.status === "online" ? "online" : (payload.lastSeen || "offline");
      useChatStore.getState().setOnlineStatus(payload.userId, statusValue);
    });

    socket.on("typing:start", (payload: { chatId: string; userId: string }) => {
      useChatStore.getState().setUserTyping(payload.chatId, payload.userId, true);
    });

    socket.on("typing:stop", (payload: { chatId: string; userId: string }) => {
      useChatStore.getState().setUserTyping(payload.chatId, payload.userId, false);
    });

    // 1-to-1 call signals
    socket.on("call:incoming", (payload) => {
      useCallStore.getState().receiveCall(payload);
    });

    socket.on("call:answered", (payload) => {
      useCallStore.getState().handleAnswer(payload.sdp);
    });

    socket.on("call:declined", () => {
      useCallStore.getState().resetCallStore();
      toast.error("Call declined by user");
    });

    socket.on("call:ended", () => {
      useCallStore.getState().resetCallStore();
      toast.info("Call ended");
    });

    socket.on("call:ice-candidate", (payload) => {
      useCallStore.getState().handleIceCandidate(payload.candidate, payload.fromUserId);
    });

    // group call signals
    socket.on("call:incoming-group", (payload) => {
      useCallStore.getState().receiveGroupCall(payload);
    });

    socket.on("call:participant-joined", (payload) => {
      useCallStore.getState().handleParticipantJoined(payload.userId);
    });

    socket.on("call:participant-left", (payload) => {
      useCallStore.getState().handleParticipantLeft(payload.userId);
    });

    socket.on("call:group-response", (payload) => {
      if (payload.status === "accepted") {
        toast.success(`${payload.userName || "Someone"} joined the group call`);
      } else {
        toast.info(`${payload.userName || "Someone"} declined the group call`);
      }
    });

    socket.on("call:group-ended", (payload) => {
      const activeCall = useCallStore.getState();
      if (activeCall.isGroupCall && activeCall.groupChatId === payload.chatId) {
        activeCall.resetCallStore();
        toast.info("Group call ended");
      }
    });

    socket.on("call:offer", (payload) => {
      useCallStore.getState().handleGroupOffer(payload.fromUserId, payload.sdp, payload.callType);
    });

    socket.on("call:answer", (payload) => {
      useCallStore.getState().handleGroupAnswer(payload.fromUserId, payload.sdp);
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },
}));

const playNotificationSound = (type: "incoming" | "outgoing") => {
  if (typeof window === "undefined") return;
  const isSoundEnabled = localStorage.getItem("settings-notifications-sound") !== "false";
  if (!isSoundEnabled) return;

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === "incoming") {
      const now = ctx.currentTime;

      // Master gain for overall volume boost
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.9, now);
      master.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(784, now);
      gain1.gain.setValueAtTime(0.55, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(master);
      osc1.start(now);
      osc1.stop(now + 0.19);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1047, now + 0.08);
      gain2.gain.setValueAtTime(0.45, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
      osc2.connect(gain2);
      gain2.connect(master);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.31);
    } else {
      const now = ctx.currentTime;

      // Master gain for overall volume boost
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.9, now);
      master.connect(ctx.destination);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.08);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.13);
    }
  } catch (err) {
    console.error("Failed to play notification audio:", err);
  }
};

const triggerNotification = (message: any) => {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;

  const currentUserId = useAuthStore.getState().user?.id;
  if (message.senderId === currentUserId) {
    playNotificationSound("outgoing");
    return;
  }

  playNotificationSound("incoming");

  const isEnabled = localStorage.getItem("settings-notifications-enabled") !== "false";
  if (!isEnabled) return;

  const showPreviews = localStorage.getItem("settings-notifications-preview") !== "false";

  const pathname = window.location.pathname;
  const currentChatId = pathname.includes("/chats/") ? pathname.split("/chats/")[1] : null;
  const isDifferentChat = currentChatId !== message.chatId;
  const isBackground = document.visibilityState === "hidden" || !document.hasFocus();

  if (isBackground || isDifferentChat) {
    if (Notification.permission === "granted") {
      const senderName = message.sender?.name || "New Message";
      const body = showPreviews ? message.content || "Sent an attachment" : "New message received";

      const notification = new Notification(senderName, { body, tag: message.chatId });

      notification.onclick = () => {
        window.focus();
        window.location.href = `/chats/${message.chatId}`;
      };
    }
  }
};
