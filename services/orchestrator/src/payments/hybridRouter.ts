import type { Env } from "../config/env.js";
import type { AceStep, Job, PaymentRoute, RunReceipt } from "../agent/types.js";
import { createAceDataClient, runAceChat, runAceImage, runAceVideo } from "../clients/acedata.js";
import { chainRpc, createChainClient } from "../clients/grpc-chain.js";

export function organicJitter(minMs: number, maxMs: number): Promise<void> {
  const span = Math.max(0, maxMs - minMs);
  const delay = minMs + Math.floor(Math.random() * (span + 1));
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export class HybridPaymentRouter {
  private readonly chain;
  private readonly ace;

  constructor(private readonly env: Env) {
    this.chain = createChainClient(env.CHAIN_GRPC_ADDR);
    this.ace = createAceDataClient(env);
  }

  private cappedEscrowUsd(job: Job): number {
    const requested = job.estimatedValueUsd ?? 0.001;
    return Math.min(requested, this.env.MAX_ESCROW_USD);
  }

  private decideRoute(job: Job): PaymentRoute {
    const value = this.cappedEscrowUsd(job);
    return value >= this.env.ESCROW_THRESHOLD_USD ? "escrow" : "x402";
  }

  async routePayment(job: Job, steps: AceStep[]): Promise<RunReceipt> {
    const runId = job.id;

    const sentinel = await chainRpc.runSentinelCheck(
      this.chain,
      runId,
      job.type,
      job.query,
    );
    if (!sentinel.passed) {
      return {
        runId,
        status: "failed",
        route: "x402",
        plannerSource: "openrouter",
        executorSource: "ace-x402",
        aceServiceIds: [],
        txSignatures: [],
        sentinelScore: sentinel.score,
        sentinelPassed: false,
        errorMessage: sentinel.reason,
      };
    }

    await chainRpc.discoverSapAgents(this.chain, 50);

    const route = this.decideRoute(job);
    const txSignatures: string[] = [];
    const aceServiceIds: string[] = [];

    if (route === "escrow") {
      const amount = this.cappedEscrowUsd(job);
      const created = await chainRpc.createEscrow(this.chain, amount, runId);
      if (created.create_tx?.signature) {
        txSignatures.push(created.create_tx.signature);
      }
      const settled = await chainRpc.settleEscrow(this.chain, created.escrow_id);
      if (settled.settle_tx?.signature) {
        txSignatures.push(settled.settle_tx.signature);
      }
    }

    for (const step of steps) {
      aceServiceIds.push(step.serviceId);
      await this.executeAceStep(step);
      await organicJitter(this.env.JITTER_MIN_MS, this.env.JITTER_MAX_MS);
    }

    return {
      runId,
      status: "succeeded",
      route,
      plannerSource: "openrouter",
      executorSource: "ace-x402",
      aceServiceIds,
      txSignatures,
      sentinelScore: sentinel.score,
      sentinelPassed: true,
    };
  }

  private async executeAceStep(step: AceStep): Promise<void> {
    switch (step.serviceId) {
      case "ace-chat": {
        const messages = (step.payload.messages as { role: string; content: string }[]) ?? [
          { role: "user", content: "hello" },
        ];
        await runAceChat(this.ace, messages);
        return;
      }
      case "ace-image": {
        await runAceImage(this.ace, String(step.payload.prompt ?? ""));
        return;
      }
      case "ace-video": {
        await runAceVideo(this.ace, String(step.payload.prompt ?? ""));
        return;
      }
      default: {
        const _exhaustive: never = step.serviceId;
        throw new Error(`Unsupported step: ${_exhaustive}`);
      }
    }
  }
}
