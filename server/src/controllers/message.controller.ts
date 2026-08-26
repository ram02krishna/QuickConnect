import type { Request, Response } from "express";
import * as messageService from "../services/message.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { io } from "../server.js";
import { SOCKET_EVENTS } from "../sockets/events.js";
import { prisma } from "../config/prisma.js";

export async function sendNewMessage(req: Request, res: Response) {
  const { content, type, attachments } = req.body;
  const message = await messageService.sendMessage(
    req.params.chatId as string,
    req.user!.id,
    content,
    type,
    attachments
  );

  const chat = await prisma.chat.findUnique({
    where: { id: req.params.chatId as string },
    select: { members: { select: { userId: true } } },
  });

  if (chat) {
    for (const member of chat.members) {
      io.to(`user:${member.userId}`).emit(SOCKET_EVENTS.MESSAGE_NEW, message);
    }
  }

  sendSuccess(res, "Message sent", { message }, 201);
}

export async function fetchChatMessages(req: Request, res: Response) {
  const cursor = req.query.cursor as string | undefined;
  const limit = Number(req.query.limit) || 30;

  const messages = await messageService.getChatMessages(
    req.params.chatId as string,
    req.user!.id,
    cursor,
    limit
  );

  sendSuccess(res, "Messages fetched", { messages });
}

export async function deleteChatMessage(req: Request, res: Response) {
  const result = await messageService.deleteMessage(
    req.params.chatId as string,
    req.params.messageId as string,
    req.user!.id,
    req.body.scope
  );

  if (result.scope === "everyone") {
    for (const memberId of result.memberIds) {
      io.to(`user:${memberId}`).emit(SOCKET_EVENTS.MESSAGE_DELETED_FOR_EVERYONE, {
        chatId: result.chatId,
        messageId: result.messageId,
      });
    }
  }

  sendSuccess(res, "Message deleted", { result });
}
