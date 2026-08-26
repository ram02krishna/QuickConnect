import { Router } from "express";
import { z } from "zod";
import * as userController from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// Zod schema for profile updates
const updateMeSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  bio: z.string().max(40, "Bio must be 40 characters or less").nullable().optional(),
  avatarUrl: z.string().url("Invalid avatar URL").optional().or(z.literal("")),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or less")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .optional(),
});

// All user routes require a logged-in user
router.use(authenticate);

router.get("/me", userController.getMe);
router.patch("/me", validate(updateMeSchema), userController.updateMe);
router.get("/search", userController.searchUsers);
export default router;
