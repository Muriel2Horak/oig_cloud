#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HA_CORE_DIR="${HA_CORE_DIR:-$ROOT_DIR/local_dev/ha-core}"
HA_CORE_REF="${HA_CORE_REF:-2026.8.1}"
HASSFEST_PYTHON="${HASSFEST_PYTHON:-python3}"
INTEGRATION_PATH="${INTEGRATION_PATH:-$ROOT_DIR/custom_components/oig_cloud}"

if [[ ! -d "$HA_CORE_DIR/.git" ]]; then
  git clone --depth=1 --branch "$HA_CORE_REF" https://github.com/home-assistant/core.git "$HA_CORE_DIR"
else
  git -C "$HA_CORE_DIR" fetch --depth=1 origin "$HA_CORE_REF"
  git -C "$HA_CORE_DIR" checkout --force FETCH_HEAD
fi

HASSFEST_TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/oig-hassfest.XXXXXX")"
trap 'rm -rf "$HASSFEST_TMP_DIR"' EXIT
HASSFEST_INTEGRATION="$HASSFEST_TMP_DIR/oig_cloud"
mkdir -p "$HASSFEST_INTEGRATION"
rsync -a --exclude=node_modules --exclude=coverage \
  "$INTEGRATION_PATH/" "$HASSFEST_INTEGRATION/"

PYTHONPATH="$HA_CORE_DIR${PYTHONPATH:+:$PYTHONPATH}" \
  "$HASSFEST_PYTHON" -m script.hassfest --integration-path "$HASSFEST_INTEGRATION"
