import { Router } from "express";
import { aiChatController } from "./ai.controller";
import { optionalAuth } from "../../middlewares/auth";

const router = Router();

// POST /api/ai/chat
router.post("/chat", optionalAuth, aiChatController);

export const AIRoutes = router;