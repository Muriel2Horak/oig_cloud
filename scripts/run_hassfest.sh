#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HA_CORE_DIR="${HA_CORE_DIR:-$ROOT_DIR/local_dev/ha-core}"
HA_CORE_REF="${HA_CORE_REF:-2025.1.4}"
INTEGRATION_PATH="${INTEGRATION_PATH:-$ROOT_DIR/custom_components/oig_cloud}"
REF_STAMP_FILE="$HA_CORE_DIR/.ha_ref"

if [[ ! -d "$HA_CORE_DIR/.git" ]]; then
  git clone --depth=1 --branch "$HA_CORE_REF" https://github.com/home-assistant/core.git "$HA_CORE_DIR"
else
  git -C "$HA_CORE_DIR" fetch --depth=1 origin "$HA_CORE_REF"
  git -C "$HA_CORE_DIR" checkout --force FETCH_HEAD
fi

if [[ ! -f "$REF_STAMP_FILE" ]] || [[ "$(cat "$REF_STAMP_FILE")" != "$HA_CORE_REF" ]]; then
  rm -rf "$HA_CORE_DIR/.venv"
  printf '%s' "$HA_CORE_REF" > "$REF_STAMP_FILE"
fi

if [[ ! -d "$HA_CORE_DIR/.venv" ]]; then
  python3 -m venv "$HA_CORE_DIR/.venv"
fi

VENV_PY="$HA_CORE_DIR/.venv/bin/python"
VENV_PIP="$HA_CORE_DIR/.venv/bin/pip"
export PATH="$HA_CORE_DIR/.venv/bin:$PATH"

find "$INTEGRATION_PATH" -type d -name node_modules -prune -exec rm -rf {} +

"$VENV_PIP" install --upgrade pip

(
  cd "$HA_CORE_DIR"
  "$VENV_PIP" install -e . -r requirements_test_pre_commit.txt -r requirements_test.txt colorlog go2rtc-client==0.1.2 numpy==2.2.0
  "$VENV_PY" -m script.hassfest --integration-path "$INTEGRATION_PATH"
)
