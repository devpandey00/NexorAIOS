#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
API_URL="${NEXOR_API_URL:-http://localhost:3000}"

printf '\n=== NEXOR AIOS AUTOPILOT ===\nStarting local API + autonomous workflow...\n\n'
command -v pnpm >/dev/null 2>&1 || { echo 'pnpm is required.'; exit 1; }

if [ ! -d node_modules ]; then
  echo '[1/4] Installing dependencies...'
  pnpm install --frozen-lockfile
fi

echo '[2/4] Generating Prisma client...'
pnpm run db:generate
echo '[3/4] Starting Nexor API/UI...'
pnpm dev &
DEV_PID=$!
cleanup() { kill "$DEV_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

READY=0
for i in $(seq 1 90); do
  if curl -fsS --max-time 2 "$API_URL/api/health" >/dev/null 2>&1; then READY=1; break; fi
  sleep 1
done

if [ "$READY" -ne 1 ]; then
  echo 'Nexor API/database did not become ready.'
  exit 1
fi

echo '[4/4] Launching full autonomous workflow...'
RESULT="$(curl -fsS --max-time 300 -X POST "$API_URL/api/command" -H 'Content-Type: application/json' --data '{"query":"start full autonomous workflow"}')"
printf '%s\n' "$RESULT"

printf '\n=== NEXOR AUTOPILOT STARTED ===\n'
printf 'Client leads, research, outreach queues, social drafts and job/company opportunities have been triggered.\n'
printf 'Keep this terminal open for the local API. GitHub scheduled workers run independently when their secrets are configured.\n'
wait "$DEV_PID"
