import type { Env } from "../config/env.js";
import type { RunPlan, RunReceipt } from "./types.js";
import { HybridPaymentRouter } from "../payments/hybridRouter.js";
import { assertDiversity } from "./safeguards.js";
import { RunsStore } from "../state/runsStore.js";
import { ensureSapAgentRegistered } from "../clients/sap.js";

export class Executor {
  private readonly router;
  private readonly store;

  constructor(private readonly env: Env) {
    this.router = new HybridPaymentRouter(env);
    this.store = new RunsStore(env.STATE_DIR);
  }

  async ensureSapRegistration(): Promise<void> {
    const sig = await ensureSapAgentRegistered(this.env);
    if (sig) {
      console.log(`[executor] SAP registerAgent tx: https://orbmarkets.io/tx/${sig}`);
    }
  }

  async execute(plan: RunPlan): Promise<RunReceipt> {
    const receipt = await this.router.routePayment(plan.job, plan.steps);
    if (receipt.status === "succeeded") {
      await assertDiversity(this.store, receipt);
      await this.store.append(receipt);
    }
    return receipt;
  }
}
