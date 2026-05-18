import { loadEnv } from "../config/env.js";
import { Planner } from "../agent/planner.js";
import { Executor } from "../agent/executor.js";
import { jobFromEnv } from "../agent/jobFromEnv.js";
import { chainRpc, createChainClient } from "../clients/grpc-chain.js";
import { assertHourlyRunBudget } from "../state/runBudget.js";
import { RunsStore } from "../state/runsStore.js";

function logReceiptSummary(receipt: {
  runId: string;
  status: string;
  route: string;
  aceServiceIds: string[];
  txSignatures: string[];
  sentinelPassed?: boolean;
  errorMessage?: string;
}): void {
  console.log(
    JSON.stringify({
      runId: receipt.runId,
      status: receipt.status,
      route: receipt.route,
      aceServiceIds: receipt.aceServiceIds,
      txCount: receipt.txSignatures.length,
      txSignatures: receipt.txSignatures,
      sentinelPassed: receipt.sentinelPassed,
      errorMessage: receipt.errorMessage,
    }),
  );
}

async function runOnce(): Promise<void> {
  const env = loadEnv();
  const store = new RunsStore(env.STATE_DIR);
  await assertHourlyRunBudget(store, env.WORKER_MAX_RUNS_PER_HOUR);

  const chain = createChainClient(env.CHAIN_GRPC_ADDR);

  const health = await chainRpc.health(chain);
  console.log(`[worker] chain health: ${health.service}`);

  const reg = await chainRpc.ensureAgentRegistered(
    chain,
    "zero-agent",
    "Zero autonomous SAP + Ace x402 agent",
  );
  console.log(`[worker] agent ${reg.agent_pubkey} registered=${reg.already_registered}`);

  const executor = new Executor(env);
  await executor.ensureSapRegistration();

  const job = jobFromEnv(env);
  console.log(`[worker] job ${job.id} type=${job.type} queryLen=${job.query.length}`);

  const plan = await new Planner(env).buildPlan(job);
  console.log(`[worker] plan steps: ${plan.steps.map((s) => s.serviceId).join(", ")}`);

  const receipt = await executor.execute(plan);
  logReceiptSummary(receipt);

  if (receipt.status === "failed") {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const env = loadEnv();
  if (env.WORKER_LOOP) {
    for (;;) {
      await runOnce();
      const delay = env.JITTER_MIN_MS + Math.random() * (env.JITTER_MAX_MS - env.JITTER_MIN_MS);
      await new Promise((r) => setTimeout(r, delay));
    }
  } else {
    await runOnce();
  }
}

main().catch((err) => {
  console.error("[worker] fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
