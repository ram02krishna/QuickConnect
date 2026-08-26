import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import type { MessageType } from "@prisma/client";
import { encryptMessage, decryptMessage } from "./crypto.service.js";
import { redis } from "../config/redis.js";
import { invalidateInboxCache } from "./chat.service.js";

function decryptMessageObj(message: any) {
  if (!message) return message;
  if (message.content) {
    message.content = decryptMessage(message.content);
  }
  return message;
}

const messageInclude = {
  sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
  attachments: true,
  receipts: { select: { userId: true, deliveredAt: true, readAt: true } },
} as const;

const deletedMessageText = "This message was deleted";

export async function sendMessage(
  chatId: string,
  senderId: string,
  content: string,
  type: MessageType = "TEXT",
  attachments?: Array<{
    fileName: string;
    fileType: string;
    fileSize: number;
    fileUrl: string;
    mimeType: string;
  }>
) {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { members: true },
  });
  if (!chat) throw new ApiError(404, "Chat not found");

  const membership = chat.members.find((m) => m.userId === senderId);
  if (!membership) throw new ApiError(403, "You are not in this chat");

  const message = await prisma.message.create({
    data: {
      chatId,
      senderId,
      content: content ? encryptMessage(content) : content,
      type,
      ...(attachments && attachments.length > 0 && {
        attachments: {
          create: attachments.map((att) => ({
            fileName: att.fileName,
            fileType: att.fileType,
            fileSize: att.fileSize,
            fileUrl: att.fileUrl,
            mimeType: att.mimeType,
          })),
        },
      }),
    },
    include: messageInclude,
  });

  // update the chat's last message so sidebar shows the latest
  await prisma.chat.update({
    where: { id: chatId },
    data: { lastMessageId: message.id, updatedAt: new Date() },
  });

  // clear caches for all members
  const allMemberIds = chat.members.map((m) => m.userId);
  await invalidateInboxCache(allMemberIds);
  const messageKeys = allMemberIds.map((id) => `messages:${chatId}:${id}`);
  if (messageKeys.length > 0) {
    try {
      await redis.del(...messageKeys);
    } catch (error) {
      console.warn("Failed to invalidate message cache:", error);
    }
  }

  return decryptMessageObj(message);
}

// fetch messages for a chat, 30 at a time (newest first, then reversed for display)
// pass cursor (the oldest message id you have) to load older messages
export async function getChatMessages(
  chatId: string,
  userId: string,
  cursor?: string,
  limit = 30
) {
  const membership = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
  });
  if (!membership) throw new ApiError(403, "You are not in this chat");

  const cacheKey = `messages:${chatId}:${userId}`;
  if (!cursor && limit === 30) {
    const cached = await redis.get<any[]>(cacheKey);
    if (cached) return cached;
  }

  const messages = await prisma.message.findMany({
    where: { chatId, deletions: { none: { userId } } },
    take: limit,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
    orderBy: { createdAt: "desc" },
    include: messageInclude,
  });

  const result = messages.map(decryptMessageObj).reverse();

  if (!cursor && limit === 30) {
    await redis.set(cacheKey, result, { ex: 60 * 60 * 24 });
  }

  return result;
}

export async function deleteMessage(
  chatId: string,
  messageId: string,
  userId: string,
  scope: "me" | "everyone"
) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { chat: { include: { members: { select: { userId: true } } } } },
  });

  if (!message || message.chatId !== chatId) throw new ApiError(404, "Message not found");
  if (!message.chat.members.some((member) => member.userId === userId)) {
    throw new ApiError(403, "You are not a member of this chat");
  }

  if (scope === "everyone") {
    if (message.senderId !== userId) {
      throw new ApiError(403, "Only the sender can delete this message for everyone");
    }
    if (message.deletedForEveryoneAt) {
      return { scope, chatId, messageId, memberIds: message.chat.members.map((member) => member.userId) };
    }

    const deletedAt = new Date();
    await prisma.message.update({
      where: { id: messageId },
      data: {
        content: encryptMessage(deletedMessageText),
        type: "TEXT",
        deletedForEveryoneAt: deletedAt,
        attachments: { deleteMany: {} },
      },
    });

    const memberIds = message.chat.members.map((member) => member.userId);
    await invalidateInboxCache(memberIds);
    const messageKeys = memberIds.map((id) => `messages:${chatId}:${id}`);
    if (messageKeys.length > 0) await redis.del(...messageKeys);
    return { scope, chatId, messageId, memberIds, deletedAt };
  }

  await prisma.messageDeletion.upsert({
    where: { messageId_userId: { messageId, userId } },
    update: {},
    create: { messageId, userId },
  });
  await redis.del(`messages:${chatId}:${userId}`);
  return { scope, chatId, messageId, memberIds: [userId] };
}
