import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
loadDotenv({ path: path.join(root, ".env.local") });
loadDotenv({ path: path.join(root, ".env") });

const envSchema = z.object({
  SYNAPSE_RPC_URL: z.string().url(),
  SOLANA_KEYPAIR_PATH: z.string().min(1),
  ACEDATA_API_KEY: z.string().optional(),
  ACE_API_KEY: z.string().optional(),
  /** platform-v1 Account Token for https://platform.acedata.cloud (order pay, credentials). */
  ACE_PLATFORM_TOKEN: z.string().optional(),
  /** EVM 0x… private key — Base mainnet USDC for platform order x402 (not Solana keypair). */
  ACE_X402_PRIVATE_KEY: z.string().optional(),
  /** Optional default order id for `pnpm run pay-ace-order`. */
  ACE_X402_ORDER_ID: z.string().optional(),
  /** Solana ATA for facilitator routing (SAP / on-chain); not the Ace platform API token. */
  FACILITATOR_ATA: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("google/gemini-2.5-flash"),
  OPENROUTER_MAX_TOKENS: z.coerce.number().int().min(64).max(4096).default(512),
  PLANNER_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  CHAIN_GRPC_ADDR: z.string().default("127.0.0.1:50051"),
  STATE_DIR: z.string().default("./state"),
  ESCROW_THRESHOLD_USD: z.coerce.number().positive().default(100),
  MAX_ESCROW_USD: z.coerce.number().positive().default(10),
  MAX_JOB_QUERY_LEN: z.coerce.number().int().min(64).max(8000).default(2000),
  WORKER_MAX_RUNS_PER_HOUR: z.coerce.number().int().min(0).default(60),
  JITTER_MIN_MS: z.coerce.number().default(30_000),
  JITTER_MAX_MS: z.coerce.number().default(180_000),
  WORKER_LOOP: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof envSchema> & { acedataApiKey: string };

export function loadEnv(): Env {
  const parsed = envSchema.parse(process.env);
  const acedataApiKey = parsed.ACEDATA_API_KEY ?? parsed.ACE_API_KEY;
  if (!acedataApiKey) {
    throw new Error("ACEDATA_API_KEY or ACE_API_KEY is required");
  }
  if (parsed.MAX_ESCROW_USD > parsed.ESCROW_THRESHOLD_USD) {
    console.warn(
      "[env] MAX_ESCROW_USD exceeds ESCROW_THRESHOLD_USD; escrow route may never trigger",
    );
  }
  return { ...parsed, acedataApiKey };
}
