#!/usr/bin/env bash
set -euo pipefail

E2E_COMPOSE_PROJECT="${E2E_COMPOSE_PROJECT:-oig_cloud_e2e}"

cleanup() {
  docker compose -p "${E2E_COMPOSE_PROJECT}" -f docker-compose.e2e.yml down -v --remove-orphans
}
trap cleanup EXIT

docker compose -p "${E2E_COMPOSE_PROJECT}" -f docker-compose.e2e.yml up -d --build

echo "==> Waiting for mock server..."
for i in {1..30}; do
  if curl -fsS "http://localhost:8124/host?mode=cloud" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -fsS "http://localhost:8124/host?mode=cloud" >/dev/null

npx playwright test
