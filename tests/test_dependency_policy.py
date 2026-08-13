"""Static contracts for reproducible Home Assistant test dependencies."""

from __future__ import annotations

import ast
import json
import os
from pathlib import Path
import re
import subprocess

import pytest


ROOT = Path(__file__).parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
CANONICAL_PYTHON = "3.14.3"
CANONICAL_PLUGIN = "pytest-homeassistant-custom-component==0.13.355"
RESOLUTION_CUTOFF = "2026-08-10T00:00:00Z"
CANONICAL_UV = "0.11.31"
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
            if re.search(
                r"pip\s+install\s+(?:--require-hashes\s+)?-r\s+requirements-dev\.txt",
                body,
            ):
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
        if not re.search(
            r"pip\s+install\s+(?:--require-hashes\s+)?-r\s+requirements-dev\.txt",
            body,
        )
    ]
    assert not failures, "pytest jobs missing requirements-dev.txt: " + ", ".join(failures)


def test_every_dev_lock_consumer_verifies_hashes_and_environment() -> None:
    """CI must install only locked artifacts and reject dependency conflicts."""
    failures = []
    for workflow, job_name, body in _dev_lock_consumers():
        if not re.search(
            r"(?:python\s+-m\s+)?pip\s+install\s+--require-hashes\s+-r\s+requirements-dev\.txt",
            body,
        ):
            failures.append(f"{workflow.name}:{job_name} lacks --require-hashes")
        if not re.search(r"(?:python\s+-m\s+)?pip\s+check\b", body):
            failures.append(f"{workflow.name}:{job_name} lacks pip check")
        if re.search(r"pip\s+install\s+--upgrade\s+pip", body):
            failures.append(f"{workflow.name}:{job_name} upgrades pip outside the lock")

    assert not failures, "\n".join(failures)


def test_ci_executes_canonical_lock_regeneration_check() -> None:
    """A required workflow must execute the same lock check developers run."""
    jobs = [
        (workflow, job_name, body)
        for workflow in sorted(WORKFLOWS.glob("*.yml"))
        for job_name, body in _workflow_jobs(workflow).items()
        if "./scripts/generate_requirements.sh --check" in body
    ]
    assert jobs, "no workflow executes the canonical lock check"

    for workflow, job_name, body in jobs:
        assert CANONICAL_PYTHON in body, f"{workflow.name}:{job_name} lacks Python pin"
        assert re.search(
            r"(?:python\s+-m\s+)?pip\s+install\s+--require-hashes\s+-r\s+requirements-dev\.txt",
            body,
        ), f"{workflow.name}:{job_name} does not hash-install the uv-bearing lock"
        assert f"uv {CANONICAL_UV}" in body, (
            f"{workflow.name}:{job_name} does not verify exact uv"
        )


def test_dev_input_uses_supported_home_assistant_harness() -> None:
    """The canonical dev input must select the plugin matching HA 2026.8.1."""
    content = (ROOT / "requirements-dev.in").read_text(encoding="utf-8")
    assert CANONICAL_PLUGIN in content
    assert f"uv=={CANONICAL_UV}" in content


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
    assert "env -i" in content
    assert "--no-config" in content
    assert "--no-sources" in content
    assert re.search(r"(?m)^  --refresh$", content)
    assert re.search(r"(?m)^  --upgrade$", content)
    assert "--refresh-package pytest-homeassistant-custom-component" in content
    assert 'compile_lock "requirements.in" "requirements.txt"' in content
    assert 'compile_lock "requirements-dev.in" "requirements-dev.txt"' in content
    assert "--check" in content


def _write_fake_uv(path: Path, *, version: str) -> None:
    """Write a deterministic uv double that enforces the generator boundary."""
    path.write_text(
        f"""#!/usr/bin/env python3
import os
from pathlib import Path
import shutil
import sys

if "--version" in sys.argv:
    print("uv {version} (test-double)")
    raise SystemExit(0)

for hostile in ("UV_CONFIG_FILE", "UV_CONSTRAINT"):
    if hostile in os.environ:
        print(f"hostile environment leaked: {{hostile}}", file=sys.stderr)
        raise SystemExit(41)

if "--no-config" not in sys.argv or "--no-sources" not in sys.argv:
    print("generator did not disable config and project sources", file=sys.stderr)
    raise SystemExit(42)

output = Path(sys.argv[sys.argv.index("--output-file") + 1])
source = Path({str(ROOT)!r}) / output.name
shutil.copyfile(source, output)
""",
        encoding="utf-8",
    )
    path.chmod(0o755)


@pytest.mark.parametrize("hostile_name", ["UV_CONFIG_FILE", "UV_CONSTRAINT"])
def test_lock_generator_ignores_hostile_uv_inputs(
    tmp_path: Path, hostile_name: str
) -> None:
    """Ambient uv configuration must not change byte-identical lock checks."""
    fake_uv = tmp_path / "uv"
    _write_fake_uv(fake_uv, version=CANONICAL_UV)
    hostile = tmp_path / "hostile.toml"
    hostile.write_text("constraint-dependencies = ['blocked==0']\n", encoding="utf-8")
    env = os.environ.copy()
    env.update({"UV_BIN": str(fake_uv), hostile_name: str(hostile)})

    result = subprocess.run(
        [str(ROOT / "scripts" / "generate_requirements.sh"), "--check"],
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr


def test_lock_generator_rejects_wrong_uv_version(tmp_path: Path) -> None:
    """Different uv resolver versions must fail before writing lock output."""
    fake_uv = tmp_path / "uv"
    _write_fake_uv(fake_uv, version="0.11.30")
    env = os.environ.copy()
    env["UV_BIN"] = str(fake_uv)

    result = subprocess.run(
        [str(ROOT / "scripts" / "generate_requirements.sh"), "--check"],
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode != 0
    assert f"requires uv {CANONICAL_UV}" in result.stderr


def test_local_checks_reject_wrong_python_before_install(tmp_path: Path) -> None:
    """Local checks must reject interpreter drift before invoking pip."""
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    fake_python = bin_dir / "python"
    fake_python.write_text(
        "#!/usr/bin/env bash\necho 3.14.2\n",
        encoding="utf-8",
    )
    fake_python.chmod(0o755)
    fake_pip = bin_dir / "pip"
    fake_pip.write_text("#!/usr/bin/env bash\nexit 23\n", encoding="utf-8")
    fake_pip.chmod(0o755)

    result = subprocess.run(
        [str(ROOT / "scripts" / "run_local_checks.sh")],
        cwd=ROOT,
        env={**os.environ, "VENV_DIR": str(tmp_path)},
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode == 1
    assert "require Python 3.14.3; found 3.14.2" in result.stderr


def test_local_checks_hash_install_and_validate_canonical_lock() -> None:
    """Local setup must use the same dependency-integrity boundary as CI."""
    content = (ROOT / "scripts" / "run_local_checks.sh").read_text(encoding="utf-8")
    assert re.search(
        r'"\$PYTHON_BIN" -m pip install -q --require-hashes -r requirements-dev\.txt',
        content,
    )
    assert re.search(r'"\$PYTHON_BIN" -m pip check', content)


def _run_exception_policy(
    policy: Path, requirements: Path, *, today: str
) -> subprocess.CompletedProcess[str]:
    """Run the real audit-exception policy validator."""
    return subprocess.run(
        [
            os.environ.get("PYTHON", "python3"),
            str(ROOT / "scripts" / "validate_pip_audit_exceptions.py"),
            "--policy",
            str(policy),
            "--requirements",
            str(requirements),
            "--today",
            today,
            "--emit-vulnerability-ids",
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )


def test_cryptography_audit_exception_is_scoped_and_expiring() -> None:
    """Accepted advisories must be exact, visible, version-bound, and temporary."""
    result = _run_exception_policy(
        ROOT / "scripts" / "pip-audit-exceptions.json",
        ROOT / "requirements.txt",
        today="2026-08-13",
    )

    assert result.returncode == 0, result.stderr
    assert result.stdout.splitlines() == [
        "CVE-2026-69247",
        "CVE-2026-69248",
        "CVE-2026-69249",
    ]
    assert "ACCEPTED RISK" in result.stderr
    assert "cryptography==48.0.1" in result.stderr
    assert "expires=2026-09-12" in result.stderr


@pytest.mark.parametrize(
    ("version", "today", "expected_error"),
    [
        ("48.0.1", "2026-09-13", "expired on 2026-09-12"),
        ("49.0.0", "2026-08-13", "requires cryptography==48.0.1"),
    ],
)
def test_audit_exception_rejects_expiry_or_version_drift(
    tmp_path: Path, version: str, today: str, expected_error: str
) -> None:
    """An exception must fail closed when its bounded acceptance no longer applies."""
    policy = ROOT / "scripts" / "pip-audit-exceptions.json"
    requirements = tmp_path / "requirements.txt"
    requirements.write_text(f"cryptography=={version}\n", encoding="utf-8")

    result = _run_exception_policy(policy, requirements, today=today)

    assert result.returncode != 0
    assert expected_error in result.stderr


def _policy_copy(tmp_path: Path) -> tuple[Path, dict[str, object]]:
    policy_data = json.loads(
        (ROOT / "scripts" / "pip-audit-exceptions.json").read_text(encoding="utf-8")
    )
    return tmp_path / "policy.json", policy_data


def _write_policy(path: Path, data: dict[str, object]) -> None:
    path.write_text(json.dumps(data), encoding="utf-8")


def test_audit_exception_rejects_future_acceptance(tmp_path: Path) -> None:
    """An accepted risk must not activate before its approval date."""
    policy, data = _policy_copy(tmp_path)
    entry = data["exceptions"][0]  # type: ignore[index]
    entry["accepted_on"] = "2026-09-01"
    entry["expires_on"] = "2026-10-01"
    _write_policy(policy, data)

    result = _run_exception_policy(
        policy, ROOT / "requirements.txt", today="2026-08-13"
    )

    assert result.returncode != 0
    assert "does not begin until 2026-09-01" in result.stderr


def test_audit_exception_rejects_duplicate_or_marked_lock_entries(
    tmp_path: Path,
) -> None:
    """Policy matching must use one unambiguous unconditional lock entry."""
    requirements = tmp_path / "requirements.txt"
    requirements.write_text(
        'cryptography==48.0.1 ; python_version < "1.0"\n'
        'cryptography==47.0.0 ; python_version >= "1.0"\n',
        encoding="utf-8",
    )

    result = _run_exception_policy(
        ROOT / "scripts" / "pip-audit-exceptions.json",
        requirements,
        today="2026-08-13",
    )

    assert result.returncode != 0
    assert "exactly one unconditional cryptography pin" in result.stderr


@pytest.mark.parametrize("mutation", ["top_level", "duplicate_package", "blank_fix"])
def test_audit_exception_rejects_ambiguous_policy_schema(
    tmp_path: Path, mutation: str
) -> None:
    """Unknown or ambiguous policy records must never emit audit suppressions."""
    policy, data = _policy_copy(tmp_path)
    entries = data["exceptions"]  # type: ignore[index]
    entry = entries[0]
    if mutation == "top_level":
        data["unexpected"] = True
    elif mutation == "duplicate_package":
        duplicate = dict(entry)
        duplicate["vulnerability_ids"] = ["CVE-2099-1"]
        duplicate["fixed_versions"] = {"CVE-2099-1": "99.0.0"}
        entries.append(duplicate)
    else:
        entry["fixed_versions"]["CVE-2026-69247"] = "   "
    _write_policy(policy, data)

    result = _run_exception_policy(
        policy, ROOT / "requirements.txt", today="2026-08-13"
    )

    assert result.returncode != 0
    assert result.stdout == ""


def test_local_checks_load_validated_audit_exceptions() -> None:
    """Local CI must not contain unconditional inline cryptography suppressions."""
    content = (ROOT / "scripts" / "run_local_checks.sh").read_text(encoding="utf-8")
    assert "validate_pip_audit_exceptions.py" in content
    assert "pip-audit-exceptions.json" in content
    assert content.count("--requirements requirements.txt") == 1
    assert content.count("--requirements requirements-dev.txt") == 1
    assert "CVE-2026-69247" not in content
    assert "CVE-2026-69248" not in content
    assert "CVE-2026-69249" not in content


def test_local_checks_scope_flake8_to_repository_python() -> None:
    """Local Flake8 must not traverse task-specific virtual environments."""
    content = (ROOT / "scripts" / "run_local_checks.sh").read_text(encoding="utf-8")
    assert re.search(
        r'"\$PYTHON_BIN" -m flake8 custom_components/oig_cloud tests '
        r'--max-line-length=120',
        content,
    )


def test_local_checks_use_v2_frontend_quality_gates() -> None:
    """Local CI must run the real V2 frontend project, not the retired root package."""
    content = (ROOT / "scripts" / "run_local_checks.sh").read_text(encoding="utf-8")
    assert 'FRONTEND_DIR="custom_components/oig_cloud/www_v2"' in content
    assert 'npm --prefix "$FRONTEND_DIR" ci --no-audit --no-fund' in content
    assert 'npm --prefix "$FRONTEND_DIR" run lint -- --quiet' in content
    assert 'npm --prefix "$FRONTEND_DIR" run typecheck' in content
    assert 'npm --prefix "$FRONTEND_DIR" run test:unit:coverage' in content
    assert 'npm --prefix "$FRONTEND_DIR" run build:verify' in content
    assert "npm install --no-audit --no-fund" not in content


def test_local_hassfest_uses_supported_ha_and_locked_python() -> None:
    """Hassfest must use the supported HA source with the locked repository venv."""
    local_checks = (ROOT / "scripts" / "run_local_checks.sh").read_text(
        encoding="utf-8"
    )
    hassfest = (ROOT / "scripts" / "run_hassfest.sh").read_text(encoding="utf-8")
    assert 'HASSFEST_PYTHON="$PYTHON_BIN" scripts/run_hassfest.sh' in local_checks
    assert 'HA_CORE_REF="${HA_CORE_REF:-2026.8.1}"' in hassfest
    assert 'HASSFEST_PYTHON="${HASSFEST_PYTHON:-python3}"' in hassfest
    assert '"$HASSFEST_PYTHON" -m script.hassfest' in hassfest
    assert 'HASSFEST_TMP_DIR="$(mktemp -d' in hassfest
    assert "rsync -a --exclude=node_modules" in hassfest
    assert "pip install" not in hassfest
    assert 'rm -rf "$INTEGRATION_PATH"' not in hassfest
