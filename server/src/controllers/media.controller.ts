import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import * as mediaService from "../services/media.service.js";
import { cloudinary } from "../config/cloudinary.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// generate a Cloudinary upload signature for direct client-side uploads
export async function getSignature(req: Request, res: Response) {
  const folder = req.query.folder as string;

  if (!folder) {
    throw new ApiError(400, "Folder is required");
  }

  if (!folder.startsWith("chat-app/")) {
    throw new ApiError(400, "Invalid folder path");
  }

  // if it's a chat-specific folder, verify the user is in that chat
  const isAvatar = folder === "chat-app/avatars";
  const isGeneral = folder === "chat-app/general";

  if (!isAvatar && !isGeneral) {
    const chatId = folder.split("chat-app/")[1];
    if (chatId) {
      const membership = await prisma.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId: req.user!.id } },
      });
      if (!membership) throw new ApiError(403, "You are not in this chat");
    }
  }

  const signatureData = mediaService.generateUploadSignature(folder);
  sendSuccess(res, "Signature generated", signatureData);
}

// update user avatar URL after a direct Cloudinary upload
export async function updateAvatarUrl(req: Request, res: Response) {
  const { avatarUrl } = req.body;
  if (!avatarUrl) throw new ApiError(400, "avatarUrl is required");

  await prisma.user.update({
    where: { id: req.user!.id },
    data: { avatarUrl },
  });

  sendSuccess(res, "Avatar updated", { avatarUrl });
}

// proxy a file download from Cloudinary to set the original filename in the download header
export async function downloadFile(req: Request, res: Response) {
  const url = req.query.url as string;
  const filename = req.query.name as string;
  const inline = req.query.inline === "true";

  if (!url) throw new ApiError(400, "URL query parameter is required");
  if (!filename) throw new ApiError(400, "Filename query parameter is required");

  // Derive Cloudinary resource_type and public_id from the stored URL so we can
  // generate a signed fetch URL — plain fetch() returns 401 for raw resources.
  let fetchUrl = url;
  try {
    const parsed = new URL(url);
    // Cloudinary URL shape: /v1_1/<cloud>/[image|video|raw|auto]/upload/<...transforms>/v<ver>/<public_id>
    const uploadMatch = parsed.pathname.match(
      /\/(image|video|raw|auto)\/upload\/(?:.*?\/)?v\d+\/(.+)$/
    );
    if (uploadMatch) {
      const resourceType = uploadMatch[1] === "auto" ? "raw" : uploadMatch[1];
      const publicId = decodeURIComponent(uploadMatch[2]);

      // Generate a signed URL valid for 5 minutes
      fetchUrl = cloudinary.url(publicId, {
        resource_type: resourceType as "image" | "video" | "raw",
        sign_url: true,
        expires_at: Math.floor(Date.now() / 1000) + 300, // 5 min
        type: "upload",
      });
    }
  } catch {
    // If parsing fails, fall back to the original URL
    fetchUrl = url;
  }

  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new ApiError(response.status, `Failed to fetch file from storage: ${response.statusText}`);
    }

    if (inline) {
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      res.removeHeader("x-frame-options");
      res.removeHeader("content-security-policy");
    } else {
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);

    const contentLength = response.headers.get("content-length");
    if (contentLength) res.setHeader("Content-Length", contentLength);

    if (response.body) {
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error("Download proxy error:", err);
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, "Failed to download file from storage proxy: " + (err.message || err));
  }
}
