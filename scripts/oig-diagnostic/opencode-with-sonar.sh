#!/usr/bin/env bash
set -euo pipefail

if [[ -f ".env" ]]; then
  set -a
  source ".env"
  set +a
fi

exec opencode "$@"
