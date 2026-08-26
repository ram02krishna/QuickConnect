import { Router } from "express";
import { z } from "zod";
import * as messageController from "../controllers/message.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// Zod schemas for message payloads
const sendMessageSchema = z.object({
  content: z.string().optional().nullable(),
  type: z.enum(["TEXT", "IMAGE", "VIDEO", "AUDIO", "FILE", "SYSTEM"]).default("TEXT"),
  attachments: z.array(
    z.object({
      fileName: z.string(),
      fileType: z.string(),
      fileSize: z.number(),
      fileUrl: z.string(),
      mimeType: z.string(),
    })
  ).optional(),
});

const deleteMessageSchema = z.object({
  scope: z.enum(["me", "everyone"]),
});

// All message routes require authentication
router.use(authenticate);

// Chat specific endpoints
router.post("/:chatId", validate(sendMessageSchema), messageController.sendNewMessage);
router.get("/:chatId", messageController.fetchChatMessages);
router.delete("/:chatId/:messageId", validate(deleteMessageSchema), messageController.deleteChatMessage);

export default router;
