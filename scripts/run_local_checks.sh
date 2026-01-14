#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VENV_DIR="${VENV_DIR:-.ha-env}"
PYTHON_BIN="${VENV_DIR}/bin/python"
PIP_BIN="${VENV_DIR}/bin/pip"

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "Missing venv at ${VENV_DIR}. Create it first (expected ${PYTHON_BIN})."
  exit 1
fi

echo "==> Installing security tools (pip-audit, safety)"
"$PIP_BIN" install -q pip-audit safety

echo "==> Installing dev dependencies"
"$PIP_BIN" install -q -r requirements-dev.txt

echo "==> Running pip-audit (requirements.txt)"
"$PYTHON_BIN" -m pip_audit --disable-pip --no-deps -r requirements.txt
echo "==> Running pip-audit (requirements-dev.txt)"
DEV_PIP_AUDIT_IGNORES=(
  CVE-2025-53643
  CVE-2025-69223
  CVE-2025-69224
  CVE-2025-69228
  CVE-2025-69229
  CVE-2025-69230
  CVE-2025-69226
  CVE-2025-69227
  CVE-2025-69225
  CVE-2024-12797
  CVE-2025-62172
  CVE-2025-65713
  CVE-2025-27516
  CVE-2024-47081
  CVE-2025-50181
  CVE-2025-66418
  CVE-2025-66471
  CVE-2026-21441
  CVE-2025-54368
  GHSA-w476-p2h3-79g9
  GHSA-pqhf-p39g-3x64
)
PIP_AUDIT_IGNORE_ARGS=()
for vuln_id in "${DEV_PIP_AUDIT_IGNORES[@]}"; do
  PIP_AUDIT_IGNORE_ARGS+=(--ignore-vuln "$vuln_id")
done
"$PYTHON_BIN" -m pip_audit --disable-pip --no-deps "${PIP_AUDIT_IGNORE_ARGS[@]}" -r requirements-dev.txt

echo "==> Running safety"
SAFETY_DEV_POLICY="scripts/safety-dev-policy.yml"
if [[ -n "${SAFETY_API_KEY:-}" ]]; then
  echo "==> Running safety (requirements.txt)"
  "$PYTHON_BIN" -m safety scan -r requirements.txt
  echo "==> Running safety (requirements-dev.txt with policy)"
  "$PYTHON_BIN" -m safety scan -r requirements-dev.txt --policy-file "$SAFETY_DEV_POLICY"
else
  echo "==> Running safety (requirements.txt)"
  "$PYTHON_BIN" -m safety check -r requirements.txt
  echo "==> Running safety (requirements-dev.txt with policy)"
  "$PYTHON_BIN" -m safety check -r requirements-dev.txt --policy-file "$SAFETY_DEV_POLICY"
fi

echo "==> Running flake8"
"$PYTHON_BIN" -m flake8

if [[ -f "package.json" ]]; then
  echo "==> Installing frontend lint dependencies"
  npm install --no-audit --no-fund
  echo "==> Running frontend lint"
  npm run lint
  echo "==> Running frontend unit tests"
  npm run test:fe:unit
fi

echo "==> Running hassfest"
scripts/run_hassfest.sh

echo "==> Running pytest + coverage"
"$PYTHON_BIN" -m pytest -q --cov=custom_components/oig_cloud --cov-report=term-missing --cov-report=xml
echo "Wrote: coverage.xml"
