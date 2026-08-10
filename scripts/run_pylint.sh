#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON_BIN:-python}"
PYLINT_REPORT="${PYLINT_REPORT:-${TMPDIR:-/tmp}/oig-cloud-pylint-report.json}"

"$PYTHON_BIN" -m pylint \
  custom_components/oig_cloud \
  --rcfile=.pylintrc \
  "--output-format=text,json2:${PYLINT_REPORT}"
