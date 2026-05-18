#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Rust chain (tonic-build from proto)"
cd services/chain
cargo build 2>/dev/null || true

echo "==> TypeScript orchestrator proto stubs"
ORCH_GEN="$ROOT/services/orchestrator/src/gen"
mkdir -p "$ORCH_GEN/zero/v1"

if command -v protoc >/dev/null 2>&1 && command -v grpc_tools_node_protoc_plugin >/dev/null 2>&1; then
  protoc \
    --plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto \
    --ts_proto_out="$ORCH_GEN" \
    --ts_proto_opt=esModuleInterop=true,outputServices=grpc-js,env=node \
    --proto_path="$ROOT/proto" \
    "$ROOT/proto/zero/v1/common.proto" \
    "$ROOT/proto/zero/v1/run.proto"
  echo "TS proto generated"
else
  echo "protoc/ts_proto not installed; using committed hand stubs in src/gen"
fi

if command -v buf >/dev/null 2>&1; then
  buf generate
  echo "Go proto generated via buf"
else
  echo "buf not installed; Go gateway uses embedded proto types"
fi

echo "proto-gen done"
