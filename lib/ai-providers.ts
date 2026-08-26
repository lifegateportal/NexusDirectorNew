import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/lib/env";

const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY
});

const deepSeek = createOpenAI({
  apiKey: env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1"
});

const anthropic = createAnthropic({
  apiKey: env.ANTHROPIC_API_KEY
});

// Curator uses the extended-output beta so it can emit up to 64K tokens —
// necessary for large academy packages (multi-module, full lesson notes).
const anthropicCurator = createAnthropic({
  apiKey: env.ANTHROPIC_API_KEY,
  headers: { "anthropic-beta": "output-128k-2025-02-19" },
});

export const geminiModel = google(env.GEMINI_MODEL);
// Structured-output routes (generateObject) must not run on deepseek-reasoner,
// which rejects tool_choice / structured output flows. Guard at provider level
// so a misconfigured DEEPSEEK_MODEL cannot break production pipelines.
const safeDeepSeekModelId = env.DEEPSEEK_MODEL === "deepseek-reasoner"
  ? "deepseek-v4-pro"
  : env.DEEPSEEK_MODEL;
export const deepSeekModel = deepSeek(safeDeepSeekModelId);
export const deepSeekChatModel = deepSeek("deepseek-chat");
export const deepSeekFlashModel = deepSeek("deepseek-v4-flash");
export const deepSeekReasonerModel = deepSeek("deepseek-reasoner");
export const claudeModel = anthropic(env.CLAUDE_MODEL);
export const curatorModel = anthropicCurator(env.CURATOR_MODEL);
