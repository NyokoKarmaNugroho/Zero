#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERIFIED="$ROOT/docs/VERIFIED.md"

if [[ ! -f "$VERIFIED" ]]; then
  echo "MISSING: docs/VERIFIED.md"
  exit 1
fi

if grep -qE 'https?://(solscan|orbmarkets|explorer\.oobeprotocol)' "$VERIFIED"; then
  echo "VERIFIED.md contains explorer link(s)"
  exit 0
fi

echo "VERIFIED.md has no tx explorer links yet — add after mainnet run"
exit 1
