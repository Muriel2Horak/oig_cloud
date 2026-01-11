#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  docker compose -f docker-compose.e2e.yml down -v
}
trap cleanup EXIT

docker compose -f docker-compose.e2e.yml up -d --build

echo "==> Waiting for mock server..."
for i in {1..30}; do
  if curl -fsS "http://localhost:8124/host?mode=cloud" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -fsS "http://localhost:8124/host?mode=cloud" >/dev/null

npx playwright test
