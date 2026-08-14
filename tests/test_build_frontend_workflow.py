"""Behavioral regression tests for the frontend build workflow."""

from __future__ import annotations

import os
from pathlib import Path
import subprocess

import yaml


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "build-frontend.yml"


def _git(*args: str, cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ("git", *args),
        cwd=cwd,
        check=True,
        capture_output=True,
        text=True,
    )


def test_commit_step_pushes_ignored_frontend_dist(tmp_path: Path) -> None:
    """A fresh ignored build output must still be committed and pushed."""
    workflow = yaml.safe_load(WORKFLOW.read_text(encoding="utf-8"))
    steps = workflow["jobs"]["build"]["steps"]
    commit_step = next(step for step in steps if step.get("name") == "Commit and push dist")

    repo = tmp_path / "repo"
    remote = tmp_path / "remote.git"
    frontend = repo / commit_step["working-directory"]
    frontend.mkdir(parents=True)
    (repo / ".gitignore").write_text("dist/\n", encoding="utf-8")
    (frontend / "package.json").write_text("{}\n", encoding="utf-8")

    _git("init", "--bare", str(remote), cwd=tmp_path)
    _git("init", "-b", "main", cwd=repo)
    _git("config", "user.name", "Test User", cwd=repo)
    _git("config", "user.email", "test@example.invalid", cwd=repo)
    _git("add", ".gitignore", str(frontend.relative_to(repo) / "package.json"), cwd=repo)
    _git("commit", "-m", "initial", cwd=repo)
    _git("remote", "add", "origin", str(remote), cwd=repo)
    _git("push", "-u", "origin", "main", cwd=repo)

    built_file = frontend / "dist" / "index.html"
    built_file.parent.mkdir()
    built_file.write_text("release artifact\n", encoding="utf-8")

    env = os.environ.copy()
    isolated_home = tmp_path / "home"
    isolated_home.mkdir()
    env["HOME"] = str(isolated_home)
    result = subprocess.run(
        ("bash", "-e", "-c", commit_step["run"]),
        cwd=frontend,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stdout + result.stderr
    stored = _git(
        "--git-dir",
        str(remote),
        "show",
        "main:custom_components/oig_cloud/www_v2/dist/index.html",
        cwd=tmp_path,
    )
    assert stored.stdout == "release artifact\n"
