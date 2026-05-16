import { Router } from "express";
import { aiChatController } from "./ai.controller";

const router = Router();

// POST /api/ai/chat
router.post("/chat", aiChatController);

export const AIRoutes = router;