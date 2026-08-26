import type { Server, Socket } from "socket.io";
import { SOCKET_EVENTS } from "./events.js";
import { prisma } from "../config/prisma.js";

export function setupChatSockets(io: Server, socket: Socket) {
  const userId = (socket as any).userId;
  if (!userId) return;

  // join a chat room (only if user is actually a member)
  socket.on(SOCKET_EVENTS.JOIN_CHAT, async ({ chatId }: { chatId: string }) => {
    try {
      if (!chatId) return;

      const member = await prisma.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId } },
      });

      if (!member) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "You are not a member of this chat" });
        return;
      }

      await socket.join(`chat:${chatId}`);
    } catch (error) {
      console.error("Error joining chat room:", error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: "Failed to join chat room" });
    }
  });

  socket.on(SOCKET_EVENTS.LEAVE_CHAT, ({ chatId }: { chatId: string }) => {
    if (!chatId) return;
    void socket.leave(`chat:${chatId}`);
  });

  // typing indicators
  socket.on(SOCKET_EVENTS.TYPING_START, ({ chatId }: { chatId: string }) => {
    if (!chatId) return;
    socket.to(`chat:${chatId}`).emit(SOCKET_EVENTS.TYPING_START, { chatId, userId });
  });

  socket.on(SOCKET_EVENTS.TYPING_STOP, ({ chatId }: { chatId: string }) => {
    if (!chatId) return;
    socket.to(`chat:${chatId}`).emit(SOCKET_EVENTS.TYPING_STOP, { chatId, userId });
  });

  // 1-to-1 call signaling
  socket.on("call:initiate", async (payload: any) => {
    try {
      const { targetUserId, fromUserName, fromUserAvatar, sdp, callType } = payload;
      if (!targetUserId) return;

      io.to(`user:${targetUserId}`).emit("call:incoming", {
        fromUserId: userId,
        fromUserName,
        fromUserAvatar,
        sdp,
        callType,
      });
    } catch (err) {
      console.error("Error in call:initiate:", err);
    }
  });

  socket.on("call:accept", ({ targetUserId, sdp }: any) => {
    if (!targetUserId) return;
    io.to(`user:${targetUserId}`).emit("call:answered", { sdp });
  });

  socket.on("call:decline", ({ targetUserId }: any) => {
    if (!targetUserId) return;
    io.to(`user:${targetUserId}`).emit("call:declined");
  });

  socket.on("call:hangup", ({ targetUserId }: any) => {
    if (!targetUserId) return;
    io.to(`user:${targetUserId}`).emit("call:ended");
  });

  socket.on("call:ice-candidate", ({ targetUserId, candidate, fromUserId: customFrom }: any) => {
    if (!targetUserId) return;
    io.to(`user:${targetUserId}`).emit("call:ice-candidate", {
      fromUserId: customFrom || userId,
      candidate,
    });
  });

  // group call signaling
  socket.on("call:initiate-group", async (payload: any) => {
    try {
      const { chatId, fromUserName, fromUserAvatar, callType } = payload;
      if (!chatId) return;

      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: { title: true, photoUrl: true, members: { select: { userId: true } } },
      });

      if (!chat?.members.some((member) => member.userId === userId)) return;

      if (chat) {
        for (const member of chat.members) {
          if (member.userId !== userId) {
            io.to(`user:${member.userId}`).emit("call:incoming-group", {
              chatId,
              chatTitle: chat.title,
              chatAvatar: chat.photoUrl,
              fromUserId: userId,
              fromUserName,
              fromUserAvatar,
              callType,
            });
          }
        }
      }
    } catch (err) {
      console.error("Error in call:initiate-group:", err);
    }
  });

  socket.on("call:join-group", ({ chatId }: any) => {
    if (!chatId) return;
    socket.to(`chat:${chatId}`).emit("call:participant-joined", { userId });
  });

  socket.on("call:group-response", async ({ chatId, status }: { chatId: string; status: "accepted" | "declined" }) => {
    if (!chatId || !["accepted", "declined"].includes(status)) return;
    const member = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!member) return;
    const responder = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    io.to(`chat:${chatId}`).emit("call:group-response", {
      chatId,
      userId,
      userName: responder?.name || "Someone",
      status,
    });
  });

  socket.on("call:end-group", async ({ chatId }: { chatId: string }) => {
    if (!chatId) return;
    const member = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!member) return;
    socket.to(`chat:${chatId}`).emit("call:group-ended", { chatId });
  });

  socket.on("call:leave-group", ({ chatId }: any) => {
    if (!chatId) return;
    socket.to(`chat:${chatId}`).emit("call:participant-left", { userId });
  });

  socket.on("call:offer", ({ targetUserId, sdp, callType }: any) => {
    if (!targetUserId) return;
    io.to(`user:${targetUserId}`).emit("call:offer", { fromUserId: userId, sdp, callType });
  });

  socket.on("call:answer", ({ targetUserId, sdp }: any) => {
    if (!targetUserId) return;
    io.to(`user:${targetUserId}`).emit("call:answer", { fromUserId: userId, sdp });
  });

  // read receipts
  socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, async ({ messageId, chatId }: { messageId: string; chatId: string }) => {
    try {
      if (!messageId || !chatId) return;

      const receipt = await prisma.messageReceipt.upsert({
        where: { messageId_userId: { messageId, userId } },
        update: { deliveredAt: new Date() },
        create: { messageId, userId, deliveredAt: new Date() },
      });

      socket.to(`chat:${chatId}`).emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
        messageId,
        chatId,
        receipt: { userId, deliveredAt: receipt.deliveredAt, readAt: receipt.readAt },
      });
    } catch (err) {
      console.error("Error in message:delivered:", err);
    }
  });

  socket.on(SOCKET_EVENTS.MESSAGE_READ, async ({ messageId, chatId }: { messageId: string; chatId: string }) => {
    try {
      if (!messageId || !chatId) return;

      const receipt = await prisma.messageReceipt.upsert({
        where: { messageId_userId: { messageId, userId } },
        update: { readAt: new Date() },
        create: { messageId, userId, deliveredAt: new Date(), readAt: new Date() },
      });

      socket.to(`chat:${chatId}`).emit(SOCKET_EVENTS.MESSAGE_READ, {
        messageId,
        chatId,
        receipt: { userId, deliveredAt: receipt.deliveredAt, readAt: receipt.readAt },
      });
    } catch (err) {
      console.error("Error in message:read:", err);
    }
  });
}
