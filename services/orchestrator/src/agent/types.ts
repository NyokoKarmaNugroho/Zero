export type PaymentRoute = "x402" | "escrow";

export type RunStatus = "pending" | "running" | "succeeded" | "failed";

export interface Job {
  id: string;
  type: string;
  query: string;
  estimatedValueUsd?: number;
}

export interface AceStep {
  serviceId: "ace-chat" | "ace-image" | "ace-video";
  payload: Record<string, unknown>;
}

export interface RunPlan {
  job: Job;
  steps: AceStep[];
}

export interface RunReceipt {
  runId: string;
  status: RunStatus;
  route: PaymentRoute;
  plannerSource: "openrouter";
  executorSource: "ace-x402";
  aceServiceIds: string[];
  txSignatures: string[];
  sentinelScore?: number;
  sentinelPassed?: boolean;
  errorMessage?: string;
}
