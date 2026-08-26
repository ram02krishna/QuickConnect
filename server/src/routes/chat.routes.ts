import { Router } from "express";
import { z } from "zod";
import * as chatController from "../controllers/chat.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// Zod schemas for chat payloads
const openDirectChatSchema = z.object({
  targetUserId: z.string().uuid("Invalid target user ID"),
});

const createGroupSchema = z.object({
  title: z.string().min(1, "Group title cannot be empty").max(100, "Title is too long"),
  memberIds: z.array(z.string().uuid("Invalid member user ID")).min(1, "Group must have at least one other member"),
  photoUrl: z.string().url("Invalid photo URL").optional().or(z.literal("")),
});

const updateGroupSchema = z.object({
  title: z.string().min(1, "Group title cannot be empty").max(100, "Title is too long").optional(),
  photoUrl: z.string().url("Invalid photo URL").optional().or(z.literal("")),
});

const addMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

// All chat routes require authentication
router.use(authenticate);

router.get("/", chatController.getAllMyChats);
router.post("/direct", validate(openDirectChatSchema), chatController.startNewChat);
router.post("/group", validate(createGroupSchema), chatController.createGroup);
router.post("/groups", validate(createGroupSchema), chatController.createGroup);
router.post("/", (req, res, next) => {
  if (req.body.type === "GROUP" || Array.isArray(req.body.memberIds)) {
    return chatController.createGroup(req, res);
  }
  return chatController.startNewChat(req, res);
});

router.get("/:chatId", chatController.getChat);
router.patch("/:chatId", validate(updateGroupSchema), chatController.updateChat);
router.delete("/:chatId", chatController.deleteChat);

router.post("/:chatId/members", validate(addMemberSchema), chatController.addMember);
router.delete("/:chatId/members/:userId", chatController.removeMember);

export default router;
