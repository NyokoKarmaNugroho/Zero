# Spawn Deploy

Install [OpenRouterTeam/spawn](https://github.com/OpenRouterTeam/spawn) CLI globally, then:

```bash
export OPENROUTER_API_KEY=sk-or-v1-...
export HCLOUD_TOKEN=...
export SYNAPSE_RPC_URL=...
export ACEDATA_API_KEY=...

spawn zero hetzner --config infra/spawn/zero-worker.json --headless --fast
spawn status
```

Bootstrap script: `infra/spawn/sh/hetzner/zero.sh` builds Zero and installs systemd units for `zero-chain` and `zero-orchestrator`.

After VM run, copy tx links from worker logs into [VERIFIED.md](./VERIFIED.md).
