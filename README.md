# Zero

Autonomous agent for the [OOBE × Ace Data Cloud bounty](https://superteam.fun/earn/listing/autonomous-agent-bounty-oobe-ace-data-cloud): SAP mainnet registration, hybrid **x402 + escrow** routing, Sentinel checks, and discovery of Ace services.

## Category statement

We compete in **both** categories:

- **General Payment Volume** — SAP escrow create/settle via Rust `services/chain`
- **Ace Data Cloud Usage** — ≥3 distinct Ace APIs paid with x402 via `hybridRouter.ts` (Solana, `api.acedata.cloud`); platform order top-ups use Base USDC via `pnpm run pay-ace-order` in `services/orchestrator`

## Architecture

| Layer | Stack | Path |
|-------|-------|------|
| Chain | Rust + gRPC | `services/chain` |
| Agent | TypeScript | `services/orchestrator` |
| Demo API | Go | `services/gateway` |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick start

```bash
cp .env.example .env.local
# Set SYNAPSE_RPC_URL, SOLANA_KEYPAIR_PATH, ACEDATA_API_KEY, GATEWAY_API_KEY (production)
# Optional: OPENROUTER_API_KEY + PLANNER_ENABLED=true; set PLANNER_ENABLED=false to skip planner LLM

make build-all
# Terminal 1
cd services/chain && cargo run --release
# Terminal 2
cd services/orchestrator && pnpm run worker
```

## Verified runs

**Do not trust README claims until mainnet txs are listed:**

[docs/VERIFIED.md](docs/VERIFIED.md)

## Planned

- Full SAP `registerAgent` instruction wiring in Rust (currently: discovery + TS SDK attempt + on-chain health)
- `zero-landing` dashboard wired to `GET /v1/runs/{id}` (Fase 5)

## Makefile targets

| Target | Description |
|--------|-------------|
| `make proto-gen` | Generate stubs (Rust via build.rs; TS via protoc if installed) |
| `make build-all` | chain + orchestrator + gateway |
| `make dev-up` | Local chain + one-shot worker |
| `make spawn-up` | Validate Spawn config files |
| `make verified` | Fail if VERIFIED.md has no explorer links |

## Deploy (Spawn)

```bash
spawn zero hetzner --config infra/spawn/zero-worker.json --headless --fast
```

[docs/SPAWN.md](docs/SPAWN.md)

## Demo API

```bash
cd services/gateway && go run ./cmd/gateway
curl -s localhost:8080/health
curl -s -X POST localhost:8080/v1/runs \
  -H 'Content-Type: application/json' \
  -H "X-API-Key: ${GATEWAY_API_KEY}" \
  -d '{"query":"Solana agents","type":"ace-research","estimatedValueUsd":0.001}'
```

## License

MIT — see [LICENSE](LICENSE).
