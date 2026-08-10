"""Static and executable contracts for Pylint and pre-commit gates."""

from __future__ import annotations

import configparser
import os
from pathlib import Path
import re
import subprocess
import sys

import json


ROOT = Path(__file__).parents[1]
PYLINT_CONFIG = ROOT / ".pylintrc"
PRE_COMMIT_CONFIG = ROOT / ".pre-commit-config.yaml"
PRE_COMMIT_WORKFLOW = ROOT / ".github" / "workflows" / "pre-commit.yml"
PYLINT_RUNNER = ROOT / "scripts" / "run_pylint.sh"
PYLINT_CONFIGURATION_DIAGNOSTICS = {
    "bad-configuration-section",
    "bad-inline-option",
    "bad-plugin-value",
    "config-parse-error",
    "deprecated-option",
    "unknown-option-value",
    "unrecognized-inline-option",
    "unrecognized-option",
    "useless-option-value",
}
EXPECTED_DISABLED_RULES = {
    "duplicate-code",
    "fixme",
    "no-member",
    "no-self-use",
    "protected-access",
    "too-few-public-methods",
    "too-many-arguments",
    "too-many-boolean-expressions",
    "too-many-branches",
    "too-many-locals",
    "too-many-public-methods",
    "too-many-return-statements",
    "too-many-statements",
}


def _pylint_parser() -> configparser.ConfigParser:
    parser = configparser.ConfigParser()
    parser.read(PYLINT_CONFIG, encoding="utf-8")
    return parser


def test_pylint_disable_list_is_well_formed_and_unchanged() -> None:
    """The intended inherited exceptions must parse without rule expansion."""
    disabled = {
        rule.strip().removesuffix(",")
        for rule in _pylint_parser()["MESSAGES CONTROL"]["disable"].splitlines()
        if rule.strip()
    }
    assert disabled == EXPECTED_DISABLED_RULES
    assert not any(rule.startswith("-") for rule in disabled)


def test_pylint_enforces_score_and_every_error_or_fatal() -> None:
    """Pylint must reject low scores and every E/F diagnostic."""
    settings = _pylint_parser()["MASTER"]
    assert float(settings["fail-under"]) >= 9.50
    fail_on = {category.strip() for category in settings["fail-on"].split(",")}
    assert {"E", "F"} <= fail_on


def test_pylint_configuration_emits_no_diagnostics() -> None:
    """Every known Pylint configuration diagnostic must be absent."""
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "pylint",
            f"--rcfile={PYLINT_CONFIG}",
            "--fail-under=0",
            "--output-format=json2",
            "custom_components/oig_cloud/config_deprecation.py",
        ],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )

    report = json.loads(result.stdout)
    diagnostics = [
        message
        for message in report["messages"]
        if message["symbol"] in PYLINT_CONFIGURATION_DIAGNOSTICS
    ]

    assert not diagnostics
    assert not result.stderr
    assert result.returncode == 0


def test_pylint_returns_nonzero_for_injected_error(tmp_path: Path) -> None:
    """The configured command must block an otherwise high-scoring E diagnostic."""
    broken_module = tmp_path / "broken.py"
    broken_module.write_text(
        '"""Injected Pylint error fixture."""\n\ndef broken() -> object:\n'
        "    \"\"\"Return an undefined object.\"\"\"\n"
        "    return missing_name\n",
        encoding="utf-8",
    )

    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "pylint",
            f"--rcfile={PYLINT_CONFIG}",
            "--output-format=json2",
            str(broken_module),
        ],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode != 0
    report = json.loads(result.stdout)
    assert any(message["type"] == "error" for message in report["messages"])
    assert not any(
        message["symbol"] in PYLINT_CONFIGURATION_DIAGNOSTICS
        for message in report["messages"]
    )


def test_pylint_reports_no_error_or_fatal_in_known_regression_modules() -> None:
    """Previously unsafe callable/subscript assumptions must remain repaired."""
    targets = [
        "custom_components/oig_cloud/boiler/sensors.py",
        "custom_components/oig_cloud/boiler/runtime.py",
        "custom_components/oig_cloud/api/ha_rest_api.py",
    ]
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "pylint",
            f"--rcfile={PYLINT_CONFIG}",
            "--fail-under=0",
            "--output-format=json2",
            *targets,
        ],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    report = json.loads(result.stdout)
    errors = [
        message
        for message in report["messages"]
        if message["type"] in {"error", "fatal"}
    ]

    assert not errors
    assert result.returncode == 0


def test_pylint_runner_preserves_exit_and_requests_json2_report(tmp_path: Path) -> None:
    """The report wrapper must return Pylint's exact failing exit status."""
    fake_python = tmp_path / "python"
    argv_file = tmp_path / "argv.txt"
    fake_python.write_text(
        "#!/bin/sh\nprintf '%s\\n' \"$@\" > \"$TASK2_ARGV_FILE\"\nexit 23\n",
        encoding="utf-8",
    )
    fake_python.chmod(0o755)
    environment = {
        **os.environ,
        "PYTHON_BIN": str(fake_python),
        "PYLINT_REPORT": str(tmp_path / "pylint.json"),
        "TASK2_ARGV_FILE": str(argv_file),
    }

    result = subprocess.run(
        ["bash", str(PYLINT_RUNNER)],
        cwd=ROOT,
        env=environment,
        check=False,
    )

    assert result.returncode == 23
    argv = argv_file.read_text(encoding="utf-8")
    assert "-m\npylint\n" in f"\n{argv}"
    assert "--output-format=text,json2:" in argv
    assert "custom_components/oig_cloud" in argv


def test_pre_commit_has_exact_blocking_quality_hooks() -> None:
    """Pre-commit must run every required repository gate."""
    content = PRE_COMMIT_CONFIG.read_text(encoding="utf-8")
    for hook_id in (
        "trailing-whitespace",
        "end-of-file-fixer",
        "check-json",
        "check-yaml",
        "flake8",
        "mypy",
        "v2-eslint-errors",
        "v2-typecheck",
        "pylint",
    ):
        assert re.search(rf"(?m)^\s+- id: {re.escape(hook_id)}\s*$", content)
    assert "npm --prefix custom_components/oig_cloud/www_v2 run lint -- --quiet" in content
    assert "npm --prefix custom_components/oig_cloud/www_v2 run typecheck" in content
    assert (
        "python -m mypy custom_components/oig_cloud --ignore-missing-imports "
        "--explicit-package-bases"
    ) in content
    assert "language: system" in content
    assert len(re.findall(r"(?m)^\s+rev:\s+[0-9a-f]{40}\b", content)) >= 2
    assert "custom_components/oig_cloud/**" not in content


def test_pre_commit_ci_uses_locked_tools_and_propagates_failure() -> None:
    """CI must install exact inputs and may not neutralize hook failures."""
    content = PRE_COMMIT_WORKFLOW.read_text(encoding="utf-8")
    assert re.search(r'python-version:\s*["\']3\.14\.3["\']', content)
    assert "python -m pip install --require-hashes -r requirements-dev.txt" in content
    assert "python -m pip check" in content
    assert "npm ci" in content
    assert "custom_components/oig_cloud/www_v2" in content
    assert "python -m pre_commit run --all-files --show-diff-on-failure" in content
    assert "pylint-report.json" in content
    assert "if: always()" in content
    for swallowed_exit in ("|| true", "|| echo", "continue-on-error"):
        assert swallowed_exit not in content


def test_every_workflow_pylint_invocation_is_canonical_and_blocking() -> None:
    """Every workflow must use the report wrapper without swallowing its exit."""
    workflow_paths = sorted((ROOT / ".github" / "workflows").glob("*.y*ml"))
    invocation_pattern = re.compile(
        r"(?m)^\s*(?:(?:python\s+-m\s+)?pylint\b|"
        r"(?:bash\s+)?(?:\./)?scripts/run_pylint\.sh)"
    )
    invocations: list[tuple[Path, str]] = []

    for workflow_path in workflow_paths:
        content = workflow_path.read_text(encoding="utf-8")
        for step in re.split(r"(?m)^(?=      - name:)", content):
            if not invocation_pattern.search(step):
                continue
            invocations.append((workflow_path, step))
            assert "scripts/run_pylint.sh" in step
            assert "python -m pylint" not in step
            assert "PYLINT_REPORT:" in step
            for swallowed_exit in ("|| true", "|| echo", "continue-on-error"):
                assert swallowed_exit not in step

    assert invocations
    quality_workflow = (ROOT / ".github" / "workflows" / "quality.yml").read_text(
        encoding="utf-8"
    )
    assert "scripts/run_pylint.sh" in quality_workflow
    assert re.search(
        r"(?ms)- name: Upload Pylint report\n\s+if: always\(\)", quality_workflow
    )


def test_canonical_dev_input_pins_pylint_and_pre_commit() -> None:
    """CI entry-point tools must come from the canonical generated lock."""
    content = (ROOT / "requirements-dev.in").read_text(encoding="utf-8")
    assert re.search(r"(?m)^pylint==\d", content)
    assert re.search(r"(?m)^pre-commit==\d", content)
