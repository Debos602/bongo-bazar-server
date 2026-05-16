import { Request, Response } from "express";
import { runAIAgent, ChatMessage } from "./ai.service";

export const aiChatController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { message, history = [] } = req.body as {
      message: string;
      history: ChatMessage[];
    };

    if (!message || typeof message !== "string" || message.trim() === "") {
      res.status(400).json({
        success: false,
        error: "message field is required",
      });
      return;
    }

    // Limit history to last 10 messages to save tokens
    const recentHistory = history.slice(-10);

    const reply = await runAIAgent(message.trim(), recentHistory);

    res.json({
      success: true,
      data: {
        reply,
        role: "assistant",
      },
    });
  } catch (error: any) {
    console.error("[AI Chat Error]", error.message);
    res.status(500).json({
      success: false,
      error: "AI সার্ভিসে সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।",
    });
  }
};