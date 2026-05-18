import type { Env } from "../config/env.js";
import type { Job, RunPlan } from "./types.js";
import { OpenRouterPlanner } from "../clients/openrouter.js";

export class Planner {
  private readonly openRouter;

  constructor(private readonly env: Env) {
    this.openRouter = new OpenRouterPlanner(env);
  }

  async buildPlan(job: Job): Promise<RunPlan> {
    const steps = await this.openRouter.planSteps(job);
    return { job, steps };
  }
}
