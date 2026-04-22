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
RUNTIME_PIP_AUDIT_IGNORES=(
  CVE-2026-26007
  CVE-2026-34073
  CVE-2026-39892
  CVE-2026-32597
  CVE-2026-0994
  CVE-2026-25990
  CVE-2026-40192
  CVE-2025-67221
  CVE-2026-27448
  CVE-2026-27459
  GHSA-pjjw-68hj-v9mw
)
RUNTIME_PIP_AUDIT_IGNORE_ARGS=()
for vuln_id in "${RUNTIME_PIP_AUDIT_IGNORES[@]}"; do
  RUNTIME_PIP_AUDIT_IGNORE_ARGS+=(--ignore-vuln "$vuln_id")
done
"$PYTHON_BIN" -m pip_audit --disable-pip --no-deps "${RUNTIME_PIP_AUDIT_IGNORE_ARGS[@]}" -r requirements.txt
echo "==> Running pip-audit (requirements-dev.txt)"
DEV_PIP_AUDIT_IGNORES=(
  CVE-2026-34515
  CVE-2026-34513
  CVE-2026-34516
  CVE-2026-34517
  CVE-2026-34519
  CVE-2026-34518
  CVE-2026-34520
  CVE-2026-34525
  CVE-2026-22815
  CVE-2026-34514
  CVE-2026-32274
  CVE-2026-26007
  CVE-2026-34073
  CVE-2026-33044
  CVE-2025-67221
  ECHO-7f2f-e83a-5508
  CVE-2026-25990
  CVE-2026-40192
  CVE-2026-1703
  CVE-2026-32597
  CVE-2026-27448
  CVE-2026-27459
  CVE-2025-71176
  CVE-2026-25645
  CVE-2025-13327
  GHSA-pjjw-68hj-v9mw
  CVE-2026-24049
  ECHO-3d34-cec5-cf72
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
SAFETY_RUNTIME_POLICY="scripts/safety-runtime-policy.yml"
DEV_SAFETY_IGNORES="84961,80507,SFTY-20251021-47509,80986,79083,82331,82332,84031,77744,77680,SFTY-20260122-20373,89484,89421,89028,85681,86269,84963,75976,83245,80464,76170,86217,89047,83967,83957,83959,83958,83955,83956,83969,83968,78162"
if [[ -n "${SAFETY_API_KEY:-}" ]]; then
  echo "==> Running safety (requirements.txt)"
  "$PYTHON_BIN" -m safety scan -r requirements.txt --policy-file "$SAFETY_RUNTIME_POLICY"
  echo "==> Running safety (requirements-dev.txt with documented ignores)"
  "$PYTHON_BIN" -m safety scan -r requirements-dev.txt --ignore "$DEV_SAFETY_IGNORES"
else
  echo "==> Running safety (requirements.txt)"
  "$PYTHON_BIN" -m safety check -r requirements.txt --policy-file "$SAFETY_RUNTIME_POLICY"
  echo "==> Running safety (requirements-dev.txt with documented ignores)"
  "$PYTHON_BIN" -m safety check -r requirements-dev.txt --ignore "$DEV_SAFETY_IGNORES"
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
