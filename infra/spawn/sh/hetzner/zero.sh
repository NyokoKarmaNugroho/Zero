#!/usr/bin/env bash
set -euo pipefail

ZERO_ROOT="${ZERO_ROOT:-/opt/zero}"
cd "$ZERO_ROOT"

echo "[zero] building services"
make build-all

echo "[zero] installing systemd units"
sudo cp infra/spawn/systemd/zero-chain.service /etc/systemd/system/
sudo cp infra/spawn/systemd/zero-orchestrator.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable zero-chain zero-orchestrator
sudo systemctl restart zero-chain zero-orchestrator

echo "[zero] status"
systemctl is-active zero-chain zero-orchestrator
