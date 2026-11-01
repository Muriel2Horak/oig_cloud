"""Regression tests for the release workflow's commit-bound CI gate."""

from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import textwrap


ROOT = Path(__file__).parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "release.yml"


def _gate_script() -> str:
    workflow = WORKFLOW.read_text(encoding="utf-8")
    gate_step = workflow.split(
        "      - name: Evaluate required CI checks", 1
    )[1]
    block = gate_step.split("        run: |\n", 1)[1].split(
        "\n\n      - name: Gate verdict", 1
    )[0]
    return textwrap.dedent(block)


def _run_gate(tmp_path: Path, runs: list[dict[str, object]]) -> subprocess.CompletedProcess[str]:
    response = tmp_path / "runs.json"
    # `gh api --paginate --slurp` returns an array containing one page.
    response.write_text(json.dumps([{"workflow_runs": runs}]), encoding="utf-8")

    fake_gh = tmp_path / "gh"
    fake_gh.write_text("#!/bin/sh\ncat \"$FAKE_GH_RESPONSE\"\n", encoding="utf-8")
    fake_gh.chmod(0o755)

    summary = tmp_path / "summary.md"
    output = tmp_path / "output.txt"
    environment = {
        **os.environ,
        "PATH": f"{tmp_path}:{os.environ['PATH']}",
        "FAKE_GH_RESPONSE": str(response),
        "GITHUB_STEP_SUMMARY": str(summary),
        "GITHUB_OUTPUT": str(output),
        "REPO": "example/repo",
        "SHA": "a" * 40,
        "BYPASS": "false",
        "RELEASE_GATE_MAX_POLLS": "0",
        "RELEASE_GATE_POLL_SECONDS": "0",
    }
    return subprocess.run(
        ["bash", "-c", _gate_script()],
        cwd=ROOT,
        env=environment,
        check=False,
        capture_output=True,
        text=True,
    )


def test_tag_uses_the_gated_commit_and_its_version() -> None:
    """The tag must use the gated SHA and version from that SHA."""
    workflow = WORKFLOW.read_text(encoding="utf-8")

    assert "prepare:" not in workflow
    assert "SHA: ${{ github.sha }}" in workflow
    assert "ref: ${{ github.sha }}" in workflow
    assert 'VERSION="$(jq -er' in workflow
    assert "git push origin \"HEAD:${GITHUB_REF_NAME}\"" not in workflow
    assert "git tag -a \"v${{ steps.version.outputs.version }}\"" in workflow
    assert "git push origin \"v${{ steps.version.outputs.version }}\"" in workflow

    release_job = workflow.split("\n  release:\n", 1)[1]
    assert 'git rev-parse HEAD)" != "${{ github.sha }}' in release_job
    assert "git commit" not in release_job


def test_gate_selects_latest_completed_attempt_per_workflow(tmp_path: Path) -> None:
    """A successful rerun supersedes an earlier failed attempt."""
    result = _run_gate(
        tmp_path,
        [
            {
                "id": 101,
                "status": "completed",
                "conclusion": "failure",
                "run_attempt": 1,
                "created_at": "2026-09-09T10:00:00Z",
                "head_sha": "a" * 40,
            },
            {
                "id": 102,
                "status": "completed",
                "conclusion": "success",
                "run_attempt": 2,
                "created_at": "2026-09-09T10:05:00Z",
                "head_sha": "a" * 40,
            },
        ],
    )

    assert result.returncode == 0, result.stderr


def test_gate_blocks_a_required_workflow_with_no_completed_run(tmp_path: Path) -> None:
    """No completed result remains a blocking verdict."""
    result = _run_gate(tmp_path, [])

    assert result.returncode != 0
    assert "no completed run" in (tmp_path / "summary.md").read_text(encoding="utf-8")


def test_required_set_includes_blocking_secret_and_pre_commit_workflows() -> None:
    """Required-workflow documentation and implementation must agree."""
    workflow = WORKFLOW.read_text(encoding="utf-8")
    docs = (ROOT / "CI_CD.md").read_text(encoding="utf-8")

    for required_workflow in ("secret-scanning.yml", "pre-commit.yml"):
        assert required_workflow in workflow
        assert required_workflow in docs
