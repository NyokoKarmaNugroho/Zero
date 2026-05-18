# Zero Architecture

Zero is an autonomous agent for the OOBE × Ace Data Cloud bounty: SAP mainnet registration, hybrid payments (x402 + escrow), Sentinel checks, and Ace service discovery.

## Services

| Service | Path | Role |
|---------|------|------|
| **chain** | `services/chain` (Rust) | gRPC server `:50051` — SAP discovery, Sentinel, escrow txs |
| **orchestrator** | `services/orchestrator` (TypeScript) | Planner (OpenRouter) + executor (Ace x402) + `hybridRouter.ts` |
| **gateway** | `services/gateway` (Go) | HTTP demo API `:8080` — `POST/GET /v1/runs` |

Fase 0–3: orchestrator calls chain directly. Gateway is optional until Fase 4.

## Flow

```text
worker.ts → Planner (OpenRouter) → Executor → hybridRouter
  → gRPC Sentinel + discovery + escrow (Rust)
  → Ace x402 (chat, image, video)
  → runs.jsonl state
```

## Deploy

Headless VM via [OpenRouter Spawn](https://github.com/OpenRouterTeam/spawn): see [SPAWN.md](./SPAWN.md).
