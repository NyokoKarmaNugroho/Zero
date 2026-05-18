#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.local && -f .env.example ]]; then
  echo "Copy .env.example to .env.local and fill secrets before dev-up"
  exit 1
fi

export $(grep -v '^#' .env.local | xargs) 2>/dev/null || true

cleanup() {
  kill "$CHAIN_PID" "$ORCH_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "Starting chain gRPC on ${CHAIN_GRPC_ADDR:-127.0.0.1:50051}"
cd services/chain
cargo run --release &
CHAIN_PID=$!
sleep 2

echo "Starting orchestrator worker (one-shot)"
cd "$ROOT/services/orchestrator"
pnpm run worker &
ORCH_PID=$!

wait $ORCH_PID || true
