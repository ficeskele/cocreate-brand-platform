#!/usr/bin/env bash
# Start (or restart) the dev server with .env loaded. Usage: scripts/serve.sh [--mock]
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
PORT="${PORT:-3456}"
lsof -tnP -iTCP:"$PORT" -sTCP:LISTEN | xargs -r kill 2>/dev/null || true
sleep 0.5
[ "${1:-}" = "--mock" ] && export AGENT_MOCK_DESIGN=1
# Build the DropLab web app (served at /app) when its sources are newer than the build.
if [ -d web ] && [ -d web/node_modules ]; then
  if [ ! -f web/dist/index.html ] || [ -n "$(find web/src web/public web/index.html -newer web/dist/index.html 2>/dev/null | head -1)" ]; then
    echo "building web/ ..."; (cd web && pnpm exec tsc -b && pnpm exec vite build >/dev/null) || echo "web build failed; /app may be stale"
  fi
fi
echo "starting on :$PORT (AGENT_MOCK_DESIGN=${AGENT_MOCK_DESIGN:-0})"
exec node_modules/.bin/tsx src/index.ts
