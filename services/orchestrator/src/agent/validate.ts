import { z } from "zod";
import type { AceStep, Job } from "./types.js";

export const ALLOWED_JOB_TYPES = ["ace-research", "ace-demo"] as const;
export const ALLOWED_SERVICE_IDS = ["ace-chat", "ace-image", "ace-video"] as const;

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior)/i,
  /you\s+are\s+now\s+/i,
  /new\s+system\s+prompt/i,
  /<\s*script\b/i,
  /javascript\s*:/i,
  /Bearer\s+[A-Za-z0-9._-]{20,}/i,
  /sk-or-v1-[A-Za-z0-9]+/i,
  /api[_-]?key\s*[:=]/i,
];

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const rawStepSchema = z.object({
  serviceId: z.string(),
  endpoint: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

export function sanitizeQuery(query: string, maxLen: number): string {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Safeguard: query must not be empty");
  }
  if (trimmed.length > maxLen) {
    throw new Error(`Safeguard: query exceeds ${maxLen} characters`);
  }
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new Error("Safeguard: query blocked by content policy");
    }
  }
  return trimmed;
}

export function sanitizeJobType(type: string): (typeof ALLOWED_JOB_TYPES)[number] {
  const t = type.trim() as (typeof ALLOWED_JOB_TYPES)[number];
  if (!(ALLOWED_JOB_TYPES as readonly string[]).includes(t)) {
    throw new Error(`Safeguard: job type must be one of: ${ALLOWED_JOB_TYPES.join(", ")}`);
  }
  return t;
}

export function buildDefaultSteps(job: Job): AceStep[] {
  return [
    {
      serviceId: "ace-chat",
      payload: {
        messages: [{ role: "user", content: job.query }],
      },
    },
    {
      serviceId: "ace-image",
      payload: { prompt: job.query },
    },
    {
      serviceId: "ace-video",
      payload: { prompt: job.query },
    },
  ];
}

function coerceChatPayload(payload: Record<string, unknown> | undefined, job: Job): AceStep {
  if (payload?.messages && Array.isArray(payload.messages)) {
    const parsed = z.array(messageSchema).safeParse(payload.messages);
    if (parsed.success && parsed.data.length > 0) {
      return { serviceId: "ace-chat", payload: { messages: parsed.data } };
    }
  }
  return {
    serviceId: "ace-chat",
    payload: { messages: [{ role: "user", content: job.query }] },
  };
}

function coercePromptPayload(
  serviceId: "ace-image" | "ace-video",
  payload: Record<string, unknown> | undefined,
  job: Job,
): AceStep {
  const raw = typeof payload?.prompt === "string" ? payload.prompt : job.query;
  const prompt = sanitizeQuery(raw, 1000);
  return { serviceId, payload: { prompt } };
}

export function validateAceSteps(raw: unknown, job: Job): AceStep[] {
  let items: unknown[] = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else {
    return buildDefaultSteps(job);
  }

  const steps: AceStep[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const parsed = rawStepSchema.safeParse(item);
    if (!parsed.success) continue;

    const id = parsed.data.serviceId.trim().toLowerCase();
    if (!(ALLOWED_SERVICE_IDS as readonly string[]).includes(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);

    const payload = parsed.data.payload ?? {};
    if (id === "ace-chat") {
      steps.push(coerceChatPayload(payload, job));
    } else if (id === "ace-image") {
      steps.push(coercePromptPayload("ace-image", payload, job));
    } else if (id === "ace-video") {
      steps.push(coercePromptPayload("ace-video", payload, job));
    }
  }

  if (steps.length < 3) {
    return buildDefaultSteps(job);
  }

  return steps.slice(0, 3);
}

export function extractJsonArray(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Planner output is not valid JSON");
  }
}
