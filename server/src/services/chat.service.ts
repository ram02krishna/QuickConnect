import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { decryptMessage, decryptDeterministic } from "./crypto.service.js";
import { redis } from "../config/redis.js";

function decryptChatMembers(chat: any) {
  if (chat?.members) {
    for (const member of chat.members) {
      if (member.user?.email) {
        member.user.email = decryptDeterministic(member.user.email);
      }
    }
  }
  return chat;
}

export async function getOrCreateDirectChat(userId: string, targetUserId: string) {
  if (userId === targetUserId) {
    throw new ApiError(400, "You can't start a chat with yourself");
  }

  const existing = await prisma.chat.findFirst({
    where: {
      type: "DIRECT",
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: targetUserId } } },
      ],
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, username: true, avatarUrl: true, bio: true, email: true } } },
      },
      lastMessage: {
        select: {
          id: true,
          content: true,
          type: true,
          createdAt: true,
          sender: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (existing) {
    if (existing.lastMessage?.content) {
      existing.lastMessage.content = decryptMessage(existing.lastMessage.content);
    }
    decryptChatMembers(existing);
    return { chat: existing, isNew: false };
  }

  const chat = await prisma.chat.create({
    data: {
      type: "DIRECT",
      createdBy: userId,
      members: {
        create: [{ userId }, { userId: targetUserId }],
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, username: true, avatarUrl: true, bio: true, email: true } } },
      },
      lastMessage: true,
    },
  });

  decryptChatMembers(chat);
  await invalidateInboxCache([userId, targetUserId]);
  return { chat, isNew: true };
}

export async function createGroupChat(
  userId: string,
  title: string,
  memberIds: string[],
  photoUrl?: string
) {
  if (!title.trim()) throw new ApiError(400, "Group name is required");

  const uniqueMembers = [...new Set([userId, ...memberIds])];
  if (uniqueMembers.length < 2) {
    throw new ApiError(400, "A group needs at least 2 members");
  }

  const chat = await prisma.chat.create({
    data: {
      type: "GROUP",
      title,
      photoUrl,
      createdBy: userId,
      members: {
        create: uniqueMembers.map((id) => ({ userId: id })),
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, username: true, avatarUrl: true, bio: true, email: true } } },
      },
    },
  });

  await invalidateInboxCache(uniqueMembers);
  return decryptChatMembers(chat);
}

export async function invalidateInboxCache(userIds: string[]) {
  const keys = userIds.map((id) => `inbox:${id}`);
  if (keys.length > 0) {
    try {
      await redis.del(...keys);
    } catch (error) {
      console.warn("Failed to invalidate inbox cache:", error);
    }
  }
}

export async function getUserChats(userId: string) {
  const cacheKey = `inbox:${userId}`;
  const cached = await redis.get<any[]>(cacheKey);
  if (cached) return cached;

  const memberships = await prisma.chatMember.findMany({
    where: { userId },
    orderBy: { chat: { updatedAt: "desc" } },
    include: {
      chat: {
        include: {
          lastMessage: {
            select: {
              id: true,
              type: true,
              content: true,
              createdAt: true,
              sender: { select: { id: true, name: true } },
            },
          },
          members: {
            include: {
              user: { select: { id: true, name: true, username: true, avatarUrl: true, bio: true, email: true } },
            },
          },
        },
      },
    },
  });

  const mappedChats = memberships.map((m) => {
    const chat = m.chat;
    if (chat.lastMessage?.content) {
      chat.lastMessage.content = decryptMessage(chat.lastMessage.content);
    }
    decryptChatMembers(chat);
    return chat;
  });

  await redis.set(cacheKey, mappedChats, { ex: 60 * 60 * 24 });
  return mappedChats;
}

export async function getChatById(chatId: string, userId: string) {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, username: true, avatarUrl: true, bio: true, email: true } },
        },
      },
      lastMessage: {
        select: {
          id: true,
          content: true,
          type: true,
          createdAt: true,
          sender: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!chat) throw new ApiError(404, "Chat not found");

  const isMember = chat.members.some((m) => m.userId === userId);
  if (!isMember) throw new ApiError(403, "You are not a member of this chat");

  if (chat.lastMessage?.content) {
    chat.lastMessage.content = decryptMessage(chat.lastMessage.content);
  }

  decryptChatMembers(chat);
  return chat;
}

export async function addMember(chatId: string, requesterId: string, newUserId: string) {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { members: true },
  });

  if (!chat) throw new ApiError(404, "Chat not found");
  if (chat.type !== "GROUP") throw new ApiError(400, "You can only add members to group chats");

  const requester = chat.members.find((m) => m.userId === requesterId);
  if (!requester) throw new ApiError(403, "You are not in this chat");

  const alreadyMember = chat.members.some((m) => m.userId === newUserId);
  if (alreadyMember) throw new ApiError(400, "That user is already in this chat");

  return prisma.chatMember.create({
    data: { chatId, userId: newUserId },
    include: {
      user: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });
}

export async function removeMember(chatId: string, requesterId: string, targetUserId: string) {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { members: true },
  });

  if (!chat) throw new ApiError(404, "Chat not found");
  if (chat.type !== "GROUP") throw new ApiError(400, "You can't remove from a direct chat");

  const requester = chat.members.find((m) => m.userId === requesterId);
  if (!requester) throw new ApiError(403, "You are not in this chat");

  const target = chat.members.find((m) => m.userId === targetUserId);
  if (!target) throw new ApiError(404, "That user is not in this chat");

  await prisma.chatMember.deleteMany({ where: { chatId, userId: targetUserId } });
}

export async function updateGroupChat(
  chatId: string,
  userId: string,
  data: { title?: string; photoUrl?: string }
) {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { members: true },
  });

  if (!chat) throw new ApiError(404, "Chat not found");
  if (chat.type !== "GROUP") throw new ApiError(400, "You can only update group chats");

  const member = chat.members.find((m) => m.userId === userId);
  if (!member) throw new ApiError(403, "You are not in this chat");

  return prisma.chat.update({ where: { id: chatId }, data });
}

export async function deleteChat(chatId: string, userId: string) {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { members: true },
  });

  if (!chat) throw new ApiError(404, "Chat not found");

  const myMembership = chat.members.find((m) => m.userId === userId);
  if (!myMembership) throw new ApiError(403, "You are not a member of this chat");

  await prisma.chat.delete({ where: { id: chatId } });

  return chat;
}
