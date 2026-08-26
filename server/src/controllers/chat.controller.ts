import type { Request, Response } from "express";
import * as chatService from "../services/chat.service.js";
import { sendMessage } from "../services/message.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { io } from "../server.js";
import { SOCKET_EVENTS } from "../sockets/events.js";
import { getOnlineStatuses } from "../sockets/presence.js";
import { prisma } from "../config/prisma.js";

export async function startNewChat(req: Request, res: Response) {
  const { targetUserId } = req.body;
  const { chat, isNew } = await chatService.getOrCreateDirectChat(req.user!.id, targetUserId);

  const onlineStatuses = await getOnlineStatuses([targetUserId]);

  sendSuccess(res, isNew ? "Chat created" : "Chat opened", { chat, onlineStatuses }, isNew ? 201 : 200);
}

export async function createGroup(req: Request, res: Response) {
  const { title, memberIds, photoUrl } = req.body;
  const chat = await chatService.createGroupChat(req.user!.id, title, memberIds, photoUrl);

  const creatorUser = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });
  const creatorName = creatorUser?.name || "Someone";

  const { message: systemMsg, memberIds: uniqueMembers } = await sendMessage(
    chat.id,
    req.user!.id,
    `${creatorName} created group "${title}"`,
    "SYSTEM"
  );

  for (const memberId of uniqueMembers) {
    io.to(`user:${memberId}`).emit(SOCKET_EVENTS.MESSAGE_NEW, systemMsg);
  }

  sendSuccess(res, "Group created", { chat }, 201);
}

export async function getAllMyChats(req: Request, res: Response) {
  const chats = await chatService.getUserChats(req.user!.id);

  const partnerIds = chats
    .map((chat: any) => {
      if (chat.type === "DIRECT") {
        const partner = chat.members.find((m: any) => m.userId !== req.user!.id)?.user;
        return partner?.id;
      }
      return null;
    })
    .filter(Boolean) as string[];

  let onlineStatuses: Record<string, any> = {};
  if (partnerIds.length > 0) {
    onlineStatuses = await getOnlineStatuses(partnerIds);
  }

  sendSuccess(res, "Chats fetched", { chats, onlineStatuses });
}

export async function getChat(req: Request, res: Response) {
  const chat = await chatService.getChatById(req.params.chatId as string, req.user!.id);
  sendSuccess(res, "Chat fetched", { chat });
}

export async function updateChat(req: Request, res: Response) {
  const { title, photoUrl } = req.body;
  const chat = await chatService.updateGroupChat(req.params.chatId as string, req.user!.id, { title, photoUrl });
  sendSuccess(res, "Group updated", { chat });
}

export async function addMember(req: Request, res: Response) {
  const { userId } = req.body;
  const member = await chatService.addMember(req.params.chatId as string, req.user!.id, userId);

  // Parallel user queries
  const [adderUser, addedUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);

  const { message: systemMsg, memberIds } = await sendMessage(
    req.params.chatId as string,
    req.user!.id,
    `${adderUser?.name || "Admin"} added ${addedUser?.name || "a user"}`,
    "SYSTEM"
  );

  for (const m of memberIds) {
    io.to(`user:${m}`).emit(SOCKET_EVENTS.MESSAGE_NEW, systemMsg);
  }

  sendSuccess(res, "Member added", { member }, 201);
}

export async function removeMember(req: Request, res: Response) {
  const chatId = req.params.chatId as string;
  const requesterId = req.user!.id;
  const targetUserId = req.params.userId as string;

  // Parallel user queries
  const [removerUser, removedUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: requesterId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: targetUserId }, select: { name: true } }),
  ]);

  await chatService.removeMember(chatId, requesterId, targetUserId);

  const isSelf = requesterId === targetUserId;
  const { message: systemMsg, memberIds } = await sendMessage(
    chatId,
    requesterId,
    isSelf
      ? `${removedUser?.name || "A user"} left the group`
      : `${removerUser?.name || "A user"} removed ${removedUser?.name || "a user"}`,
    "SYSTEM"
  );

  for (const m of memberIds) {
    io.to(`user:${m}`).emit(SOCKET_EVENTS.MESSAGE_NEW, systemMsg);
  }

  io.to(`user:${targetUserId}`).emit(SOCKET_EVENTS.MESSAGE_NEW, systemMsg);
  io.to(`user:${targetUserId}`).emit(SOCKET_EVENTS.CHAT_DELETED, { chatId });

  sendSuccess(res, "Member removed");
}

export async function deleteChat(req: Request, res: Response) {
  const chatId = req.params.chatId as string;
  const chat = await chatService.deleteChat(chatId, req.user!.id);

  for (const member of chat.members) {
    io.to(`user:${member.userId}`).emit(SOCKET_EVENTS.CHAT_DELETED, { chatId });
  }

  sendSuccess(res, "Chat deleted");
}
