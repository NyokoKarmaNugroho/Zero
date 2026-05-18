#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if rg -n 'mock|fake|stub' services/orchestrator/src services/chain/src services/gateway --glob '!**/*_test.*' 2>/dev/null; then
  echo "FAIL: mock/fake/stub found in production src"
  exit 1
fi

echo "anti-mock scan passed"
