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
"$PYTHON_BIN" -m pip_audit --disable-pip --no-deps -r requirements-dev.txt

echo "==> Running safety"
if [[ -n "${SAFETY_API_KEY:-}" ]]; then
  "$PYTHON_BIN" -m safety scan -r requirements.txt -r requirements-dev.txt
else
  "$PYTHON_BIN" -m safety check -r requirements.txt -r requirements-dev.txt
fi

echo "==> Running flake8"
"$PYTHON_BIN" -m flake8

if [[ -f "package.json" ]]; then
  echo "==> Installing frontend lint dependencies"
  npm install --no-audit --no-fund
  echo "==> Running frontend lint"
  npm run lint
fi

echo "==> Running pytest + coverage"
"$PYTHON_BIN" -m pytest -q --cov=custom_components/oig_cloud --cov-report=term-missing --cov-report=xml
echo "Wrote: coverage.xml"
