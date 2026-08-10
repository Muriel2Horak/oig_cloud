"""Static contracts for reproducible Home Assistant test dependencies."""

from __future__ import annotations

import ast
from pathlib import Path
import re

import pytest


ROOT = Path(__file__).parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
CANONICAL_PYTHON = "3.14.3"
CANONICAL_PLUGIN = "pytest-homeassistant-custom-component==0.13.355"
RESOLUTION_CUTOFF = "2026-08-10T00:00:00Z"
PLUGIN_OWNED_TEST_REQUIREMENTS = {
    "coverage",
    "freezegun",
    "license-expression",
    "mock-open",
    "numpy",
    "paho-mqtt",
    "pipdeptree",
    "pytest",
    "pytest-aiohttp",
    "pytest-asyncio",
    "pytest-cov",
    "pytest-freezer",
    "pytest-github-actions-annotate-failures",
    "pytest-picked",
    "pytest-socket",
    "pytest-timeout",
    "pytest-unordered",
    "pytest-xdist",
    "requests-mock",
    "respx",
    "syrupy",
}


def _workflow_jobs(path: Path) -> dict[str, str]:
    """Return top-level job bodies from a GitHub Actions workflow."""
    content = path.read_text(encoding="utf-8")
    jobs = content.split("\njobs:\n", maxsplit=1)[1]
    starts = list(re.finditer(r"(?m)^  ([a-zA-Z0-9_-]+):\s*$", jobs))
    return {
        match.group(1): jobs[match.start() : starts[index + 1].start()]
        if index + 1 < len(starts)
        else jobs[match.start() :]
        for index, match in enumerate(starts)
    }


def _dev_lock_consumers() -> list[tuple[Path, str, str]]:
    """Collect jobs that install the canonical development lock."""
    consumers = []
    for workflow in sorted(WORKFLOWS.glob("*.yml")):
        for job_name, body in _workflow_jobs(workflow).items():
            if re.search(r"pip\s+install\s+-r\s+requirements-dev\.txt", body):
                consumers.append((workflow, job_name, body))
    return consumers


def _pytest_jobs() -> list[tuple[Path, str, str]]:
    """Collect jobs that execute pytest rather than merely mentioning it."""
    jobs = []
    for workflow in sorted(WORKFLOWS.glob("*.yml")):
        for job_name, body in _workflow_jobs(workflow).items():
            if re.search(r"(?m)^\s+(?:python\s+-m\s+)?pytest\b", body):
                jobs.append((workflow, job_name, body))
    return jobs


def test_every_dev_lock_consumer_uses_supported_python() -> None:
    """A job installing HA 2026.8 must not select an older Python runtime."""
    consumers = _dev_lock_consumers()
    assert consumers, "at least one workflow must consume requirements-dev.txt"

    failures = []
    for workflow, job_name, body in consumers:
        match = re.search(r"python-version:\s*[\"']?([^\"'\s]+)", body)
        version = match.group(1) if match else "missing"
        if version != CANONICAL_PYTHON:
            failures.append(f"{workflow.name}:{job_name} uses Python {version}")

    assert not failures, "\n".join(failures)


def test_every_pytest_job_installs_the_canonical_dev_lock() -> None:
    """Every pytest execution must load the supported HA test harness transitively."""
    jobs = _pytest_jobs()
    assert jobs, "at least one workflow must run pytest"
    failures = [
        f"{workflow.name}:{job_name}"
        for workflow, job_name, body in jobs
        if not re.search(r"pip\s+install\s+-r\s+requirements-dev\.txt", body)
    ]
    assert not failures, "pytest jobs missing requirements-dev.txt: " + ", ".join(failures)


def test_dev_input_uses_supported_home_assistant_harness() -> None:
    """The canonical dev input must select the plugin matching HA 2026.8.1."""
    content = (ROOT / "requirements-dev.in").read_text(encoding="utf-8")
    assert CANONICAL_PLUGIN in content


def test_dev_input_leaves_plugin_owned_test_versions_to_the_plugin() -> None:
    """Plugin metadata must own the exact versions of its test dependencies."""
    direct_names = {
        re.split(r"[<>=!~;\[]", line, maxsplit=1)[0].strip().lower()
        for line in (ROOT / "requirements-dev.in").read_text(encoding="utf-8").splitlines()
        if line and not line.startswith(("#", "-r "))
    }
    assert not (direct_names & PLUGIN_OWNED_TEST_REQUIREMENTS)


def test_runtime_input_explicitly_pins_the_sdk_owned_prerelease() -> None:
    """Only the beta dependency required exactly by stable OTel may be resolved."""
    content = (ROOT / "requirements.in").read_text(encoding="utf-8")
    assert "opentelemetry-semantic-conventions==0.50b0" in content


def test_split_plugin_overlay_and_no_deps_installs_are_forbidden() -> None:
    """The plugin must resolve normally as part of the canonical development lock."""
    obsolete = [
        ROOT / "requirements-ha-test-plugin.in",
        ROOT / "requirements-ha-test-plugin.txt",
    ]
    assert not [path.name for path in obsolete if path.exists()]

    offenders = []
    for workflow in sorted(WORKFLOWS.glob("*.yml")):
        content = workflow.read_text(encoding="utf-8")
        if "--no-deps" in content or "requirements-ha-test-plugin" in content:
            offenders.append(workflow.name)
    assert not offenders, "obsolete plugin overlays: " + ", ".join(offenders)


def test_root_conftest_does_not_override_canonical_harness_cleanup() -> None:
    """The supported plugin must own event-loop and HA cleanup semantics."""
    tree = ast.parse((ROOT / "tests" / "conftest.py").read_text(encoding="utf-8"))
    defined_fixtures = {
        node.name
        for node in tree.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    }
    plugin_fixtures = {
        "enable_event_loop_debug",
        "expected_lingering_tasks",
        "expected_lingering_timers",
        "verify_cleanup",
    }
    assert not (defined_fixtures & plugin_fixtures)


@pytest.mark.parametrize("lock_name", ["requirements.txt", "requirements-dev.txt"])
def test_lock_provenance_disallows_prereleases(lock_name: str) -> None:
    """Committed resolution must not select unrequested prereleases globally."""
    header = (ROOT / lock_name).read_text(encoding="utf-8")[:2000]
    assert "--prerelease=allow" not in header
    assert "--prerelease allow" not in header
    assert "--prerelease explicit" in header


@pytest.mark.parametrize("lock_name", ["requirements.txt", "requirements-dev.txt"])
def test_lock_provenance_uses_the_sealed_cutoff(lock_name: str) -> None:
    """Committed locks must record the immutable package publication cutoff."""
    header = (ROOT / lock_name).read_text(encoding="utf-8")[:2000]
    assert f"--exclude-newer {RESOLUTION_CUTOFF}" in header


@pytest.mark.parametrize("lock_name", ["requirements.txt", "requirements-dev.txt"])
def test_committed_locks_require_hash_verification(lock_name: str) -> None:
    """Both canonical locks must contain hashes suitable for pip verification."""
    content = (ROOT / lock_name).read_text(encoding="utf-8")
    assert "--generate-hashes" in content[:2000]
    assert "--hash=sha256:" in content


def test_canonical_lock_generator_seals_and_refreshes_resolution() -> None:
    """One generator must own both locks and refresh the previously stale plugin."""
    generator = ROOT / "scripts" / "generate_requirements.sh"
    assert generator.is_file()
    content = generator.read_text(encoding="utf-8")
    assert f'RESOLUTION_CUTOFF="{RESOLUTION_CUTOFF}"' in content
    assert "--prerelease explicit" in content
    assert "--default-index https://pypi.org/simple" in content
    assert "-u UV_INDEX -u UV_INDEX_URL -u UV_EXTRA_INDEX_URL" in content
    assert re.search(r"(?m)^  --refresh$", content)
    assert re.search(r"(?m)^  --upgrade$", content)
    assert "--refresh-package pytest-homeassistant-custom-component" in content
    assert 'compile_lock "requirements.in" "requirements.txt"' in content
    assert 'compile_lock "requirements-dev.in" "requirements-dev.txt"' in content
    assert "--check" in content
