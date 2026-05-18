import { randomUUID } from "node:crypto";
import type { Env } from "../config/env.js";
import type { Job } from "./types.js";
import { sanitizeJobType, sanitizeQuery } from "./validate.js";

export function jobFromEnv(env: Env): Job {
  const id = process.env.ZERO_RUN_ID?.trim() || randomUUID();
  const type = sanitizeJobType(process.env.ZERO_JOB_TYPE?.trim() || "ace-research");
  const query = sanitizeQuery(
    process.env.ZERO_JOB_QUERY?.trim() ||
      "Summarize latest Solana DeFi trends for autonomous agents",
    env.MAX_JOB_QUERY_LEN,
  );
  const valueRaw = process.env.ZERO_JOB_ESTIMATED_VALUE_USD?.trim();
  const estimatedValueUsd = valueRaw ? Math.min(Number(valueRaw), env.MAX_ESCROW_USD) : 0.001;

  if (!Number.isFinite(estimatedValueUsd) || estimatedValueUsd < 0) {
    throw new Error("Safeguard: ZERO_JOB_ESTIMATED_VALUE_USD must be a non-negative number");
  }

  return { id, type, query, estimatedValueUsd };
}
