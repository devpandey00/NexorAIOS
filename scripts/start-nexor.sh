#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

API_URL="${NEXOR_API_URL:-http://localhost:3000}"

printf '\n=== NEXOR AIOS AUTOPILOT ===\n'
printf 'Starting local API + automation workers...\n\n'

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
trap 'kill "$DEV_PID" 2>/dev/null || true' EXIT INT TERM

for i in $(seq 1 60); do
  if curl -fsS --max-time 2 "$API_URL/api/health" >/dev/null 2>&1; then break; fi
  sleep 1
done

if ! curl -fsS --max-time 5 "$API_URL/api/health" >/dev/null 2>&1; then
  echo 'Nexor API did not become ready.'
  exit 1
fi

echo '[4/4] Launching full autonomous workflow...'
curl -fsS --max-time 300 -X POST "$API_URL/api/command" \
  -H 'Content-Type: application/json' \
  --data '{"query":"start full autonomous workflow"}'
echo

echo
printf '=== NEXOR AUTOPILOT RUNNING ===\n'
printf 'Leads, client research, outreach queues, social drafts and opportunity discovery are now running.\n'
printf 'Keep this terminal open for the local worker. GitHub scheduled workers continue independently when configured.\n'

wait "$DEV_PID"
