#!/usr/bin/env bash
# Start (or restart) the dev server with .env loaded. Usage: scripts/serve.sh [--mock]
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
PORT="${PORT:-3456}"
lsof -tnP -iTCP:"$PORT" -sTCP:LISTEN | xargs -r kill 2>/dev/null || true
sleep 0.5
[ "${1:-}" = "--mock" ] && export AGENT_MOCK_DESIGN=1
echo "starting on :$PORT (AGENT_MOCK_DESIGN=${AGENT_MOCK_DESIGN:-0})"
exec node_modules/.bin/tsx src/index.ts
