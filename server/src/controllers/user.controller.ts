import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { decryptDeterministic } from "../services/crypto.service.js";
import { invalidateInboxCache } from "../services/chat.service.js";

export async function getMe(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
    },
  });

  if (!user) throw new ApiError(404, "User not found");

  user.email = decryptDeterministic(user.email);

  sendSuccess(res, "Profile fetched", { user });
}

export async function updateMe(req: Request, res: Response) {
  const { name, bio, avatarUrl, username } = req.body;

  if (username) {
    const taken = await prisma.user.findFirst({
      where: { username, id: { not: req.user!.id } },
    });
    if (taken) throw new ApiError(409, "That username is already taken");
  }

  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(name && { name }),
      ...(bio !== undefined && { bio }),
      ...(avatarUrl && { avatarUrl }),
      ...(username && { username }),
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      avatarUrl: true,
      bio: true,
    },
  });

  updated.email = decryptDeterministic(updated.email);

  // Chat lists cache member profiles, so invalidate it to surface profile changes immediately.
  await invalidateInboxCache([req.user!.id]);

  sendSuccess(res, "Profile updated", { user: updated });
}

export async function searchUsers(req: Request, res: Response) {
  const q = (req.query.q as string)?.trim();

  if (!q || q.length < 2) {
    sendSuccess(res, "Search results", { users: [] });
    return;
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: req.user!.id },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
    },
    take: 20,
  });

  sendSuccess(res, "Search results", { users });
}
