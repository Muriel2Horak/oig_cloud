#!/usr/bin/env bash
set -euo pipefail

docker compose -f docker-compose.e2e.yml up -d --build
