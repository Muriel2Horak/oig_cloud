#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UV_BIN="${UV_BIN:-uv}"
UV_VERSION="0.11.31"
PYTHON_VERSION="3.14.3"
RESOLUTION_CUTOFF="2026-08-10T00:00:00Z"

if [[ "$UV_BIN" == */* && "$UV_BIN" != /* ]]; then
  UV_BIN="$ROOT_DIR/$UV_BIN"
fi

run_uv() {
  env -i \
    HOME="${HOME:-$ROOT_DIR}" \
    PATH="${PATH:-/usr/bin:/bin}" \
    "$UV_BIN" "$@"
}

actual_uv_version="$(run_uv --version | awk '{print $2}')"
if [[ "$actual_uv_version" != "$UV_VERSION" ]]; then
  echo "Dependency generation requires uv $UV_VERSION; found ${actual_uv_version:-unknown}." >&2
  exit 1
fi

COMMON_ARGS=(
  --python-version "$PYTHON_VERSION"
  --prerelease explicit
  --exclude-newer "$RESOLUTION_CUTOFF"
  --default-index https://pypi.org/simple
  --index-strategy first-index
  --refresh
  --upgrade
  --refresh-package pytest-homeassistant-custom-component
  --generate-hashes
)

compile_lock() {
  local input_file="$1"
  local output_file="$2"
  local platform_args=(--universal)

  if [[ "$output_file" == "requirements.txt" ]]; then
    platform_args=(--python-platform x86_64-manylinux_2_28)
  fi

  run_uv --no-config pip compile \
    "${COMMON_ARGS[@]}" \
    "${platform_args[@]}" \
    --no-sources \
    --output-file "$output_file" \
    "$input_file"
}

generate_locks() {
  local destination="$1"
  mkdir -p "$destination"
  cp "$ROOT_DIR/requirements.in" "$destination/requirements.in"
  cp "$ROOT_DIR/requirements-dev.in" "$destination/requirements-dev.in"
  (
    cd "$destination"
    compile_lock "requirements.in" "requirements.txt"
    compile_lock "requirements-dev.in" "requirements-dev.txt"
  )
}

if [[ "${1:-}" == "--check" ]]; then
  first_generation="$(mktemp -d)"
  second_generation="$(mktemp -d)"
  trap 'rm -rf "$first_generation" "$second_generation"' EXIT

  generate_locks "$first_generation"
  generate_locks "$second_generation"

  cmp "$first_generation/requirements.txt" "$second_generation/requirements.txt"
  cmp "$first_generation/requirements-dev.txt" "$second_generation/requirements-dev.txt"
  cmp "$ROOT_DIR/requirements.txt" "$first_generation/requirements.txt"
  cmp "$ROOT_DIR/requirements-dev.txt" "$first_generation/requirements-dev.txt"
  exit 0
fi

if [[ $# -ne 0 ]]; then
  echo "Usage: $0 [--check]" >&2
  exit 2
fi

cd "$ROOT_DIR"
compile_lock "requirements.in" "requirements.txt"
compile_lock "requirements-dev.in" "requirements-dev.txt"
