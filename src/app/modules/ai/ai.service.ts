import { aiTools, executeTool } from "./ai.tools";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = [
  "anthropic/claude-3-haiku",
  "anthropic/claude-3.5-haiku:beta",
  "google/gemini-flash-1.5",
  "meta-llama/llama-3.1-8b-instruct:free",
];

const SYSTEM_PROMPT = `You are Bongo Bazar's helpful AI shopping assistant. Always respond in clean, proper Bengali using correct Unicode characters.

Your capabilities:
- Search and recommend products
- Check product prices, stock, and details
- Browse product categories
- Check order status

Strict rules:
- ALWAYS respond in proper Bengali Unicode. Never output garbled or broken text.
- Show prices with taka symbol
- If featured products are empty, show latest available products instead
- Never say "no products available" when products exist in database
- Keep answers short and helpful (3-5 lines max)
- Only answer questions related to Bongo Bazar products and orders`;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MODELS = [
  "anthropic/claude-3-haiku",
  "anthropic/claude-3.5-haiku:beta",
  "google/gemini-flash-1.5",
  "meta-llama/llama-3.1-8b-instruct:free",
];

export async function runAIAgent(
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  
  for (const MODEL of MODELS) {
    try {
      const result = await callOpenRouter(MODEL, userMessage, conversationHistory);
      if (result) return result;
    } catch (err: any) {
      // 404 = model নেই, পরেরটা try করো
      if (err.message.includes("404")) {
        console.warn(`[AI] Model unavailable: ${MODEL}, trying next...`);
        continue;
      }
      // অন্য error হলে সরাসরি throw
      throw err;
    }
  }

  return "দুঃখিত, এই মুহূর্তে সার্ভিস পাওয়া যাচ্ছে না।";
}

async function callOpenRouter(
  model: string,
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<string> {
  const messages = [
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  let loopCount = 0;
  const MAX_LOOPS = 5;

  while (loopCount < MAX_LOOPS) {
    loopCount++;

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bongo-bazar.com",
        "X-Title": "Bongo Bazar AI",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        tools: aiTools,
        tool_choice: "auto",
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const choice = data.choices[0];
    const assistantMessage = choice.message;

    messages.push(assistantMessage);

    if (
      choice.finish_reason === "stop" ||
      !assistantMessage.tool_calls ||
      assistantMessage.tool_calls.length === 0
    ) {
      // If the model didn't call any tools, try a local fallback search
      try {
        const attempts: string[] = [];
        // original message
        attempts.push(userMessage);
        // cleaned message (remove punctuation but keep unicode letters/numbers)
        const cleaned = userMessage.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
        if (cleaned && cleaned !== userMessage) attempts.push(cleaned);
        // numeric tokens (e.g., model numbers like 1381)
        const nums = (userMessage.match(/\d{3,}/g) || []).map((s) => s.trim());
        attempts.push(...nums);

        for (const attempt of attempts) {
          if (!attempt || attempt.length === 0) continue;
          console.log(`[AI Fallback] trying search_products with: "${attempt}"`);
          const fallback = await executeTool("search_products", { name: attempt });
          const parsed = JSON.parse(fallback || "{}");
          if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
            const items = parsed.products
              .slice(0, 5)
              .map((p: any) => `${p.name} — ৳${p.price} — ${p.stock}টি স্টক`)
              .join("\n");
            return `আমি এই পণ্যগুলো খুঁজে পেয়েছি:\n${items}`;
          }
        }
      } catch (err) {
        console.warn("[AI Fallback] search failed:", err);
      }

      return assistantMessage.content || "দুঃখিত, উত্তর দিতে পারলাম না।";
    }

    const toolResults = await Promise.all(
      assistantMessage.tool_calls.map(async (toolCall: any) => {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
        console.log(`[AI Tool] Calling: ${toolName}`, toolArgs);
        const result = await executeTool(toolName, toolArgs);
        return {
          role: "tool" as const,
          tool_call_id: toolCall.id,
          content: result,
        };
      })
    );

    messages.push(...toolResults);
  }

  return "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না।";
}