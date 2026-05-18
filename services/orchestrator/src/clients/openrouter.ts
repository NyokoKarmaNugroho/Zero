import type { Env } from "../config/env.js";
import type { AceStep, Job } from "../agent/types.js";
import { buildDefaultSteps, extractJsonArray, validateAceSteps } from "../agent/validate.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export class OpenRouterPlanner {
  constructor(private readonly env: Env) {}

  async planSteps(job: Job): Promise<AceStep[]> {
    if (!this.env.OPENROUTER_API_KEY || !this.env.PLANNER_ENABLED) {
      return buildDefaultSteps(job);
    }

    const body = {
      model: this.env.OPENROUTER_MODEL,
      temperature: 0,
      max_tokens: this.env.OPENROUTER_MAX_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Return JSON only: {"steps":[{"serviceId":"ace-chat"|"ace-image"|"ace-video","payload":{...}}]}. ' +
            "Exactly 3 steps, one per serviceId. For ace-chat use messages[{role,user,content}]. " +
            "For ace-image and ace-video use payload.prompt. Do not include endpoints or secrets.",
        },
        { role: "user", content: `Task type: ${job.type}\nQuery: ${job.query}` },
      ],
    };

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/NyokoKarmaNugroho/Zero",
        "X-Title": "Zero Agent",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.warn(`[planner] OpenRouter ${res.status}, using default steps`);
      return buildDefaultSteps(job);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return buildDefaultSteps(job);

    try {
      const parsed = extractJsonArray(content) as unknown;
      const stepsArray = Array.isArray(parsed)
        ? parsed
        : (parsed as { steps?: unknown }).steps;
      return validateAceSteps(stepsArray, job);
    } catch (e) {
      console.warn("[planner] parse failed, using default steps:", e);
      return buildDefaultSteps(job);
    }
  }
}
