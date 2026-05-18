# Zero Runbook

## Local dev

```bash
cp .env.example .env.local
# Fill SYNAPSE_RPC_URL, SOLANA_KEYPAIR_PATH, ACEDATA_API_KEY

make build-all
make dev-up
```

## One-shot worker

```bash
cd services/orchestrator && pnpm run worker
```

## 24/7 loop

```bash
WORKER_LOOP=true pnpm run worker
```

## Anti-wash safeguards

- `organicJitter` 30–180s between Ace steps
- `STATE_DIR/runs.jsonl` blocks identical back-to-back service sets
- Sentinel must pass before payment routing

## Security (production)

- Set `GATEWAY_API_KEY` and pass `X-API-Key` on `POST /v1/runs`
- Set `GATEWAY_RATE_LIMIT_RPM` (default 30)
- Use `PLANNER_ENABLED=false` or omit `OPENROUTER_API_KEY` to skip planner LLM calls
- `WORKER_MAX_RUNS_PER_HOUR` caps loop spend (default 60)

## Verify before README claims

```bash
make verified
```
