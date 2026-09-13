"""Executable contract tests for the deployment script's selected-file mode."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pytest


SCRIPT = Path(__file__).resolve().parents[1] / "deploy_to_ha.sh"
SELECTED_FILE = "custom_components/oig_cloud/battery_forecast/planning/auto_switch.py"


def _make_repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    source = repo / SELECTED_FILE
    source.parent.mkdir(parents=True)
    source.write_text("VALUE = 1\n", encoding="utf-8")
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    subprocess.run(["git", "-C", str(repo), "add", SELECTED_FILE], check=True)
    return repo


def _blocked_commands(tmp_path: Path) -> tuple[Path, Path]:
    bin_dir = tmp_path / "bin"
    marker = tmp_path / "external-command-called"
    bin_dir.mkdir()
    for command in ("mount", "mount_smbfs", "cp", "curl", "ssh", "npx", "gzip", "sudo"):
        executable = bin_dir / command
        executable.write_text(
            "#!/bin/sh\nprintf '%s\\n' \"$0\" >> \"$DEPLOY_TEST_MARKER\"\nexit 99\n",
            encoding="utf-8",
        )
        executable.chmod(0o755)
    return bin_dir, marker


def _run(
    repo: Path,
    bin_dir: Path,
    marker: Path,
    *args: str,
    extra_env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    blocked_names = {
        "HA_CONFIG",
        "HA_TOKEN",
        "HA_URL",
        "HA_HOST",
        "SUDO_PASS",
        "LOCAL_PATH",
        "MANIFEST_FILE",
    }
    env = {
        key: value
        for key, value in os.environ.items()
        if key not in blocked_names and not key.startswith("SMB")
    }
    env |= {
        "PATH": f"{bin_dir}:{os.environ['PATH']}",
        "DEPLOY_TEST_MARKER": str(marker),
    }
    if extra_env:
        env |= extra_env
    return subprocess.run(
        [str(SCRIPT), *args],
        cwd=repo,
        env=env,
        text=True,
        capture_output=True,
        check=False,
        timeout=10,
    )


def test_selected_file_dry_run_reports_only_that_file_without_external_access(
    tmp_path: Path,
) -> None:
    """Removing selected mode would make a safe hotfix dry run impossible."""
    repo = _make_repo(tmp_path)
    bin_dir, marker = _blocked_commands(tmp_path)

    result = _run(repo, bin_dir, marker, "--file", SELECTED_FILE, "--dry-run")

    assert result.returncode == 0, result.stderr
    assert f"DRY-RUN COPY: {SELECTED_FILE}" in result.stdout
    assert not marker.exists()


def test_selected_file_rejects_traversal_before_mount_or_network(tmp_path: Path) -> None:
    """Dropping path validation would let a deploy escape the integration tree."""
    repo = _make_repo(tmp_path)
    bin_dir, marker = _blocked_commands(tmp_path)

    result = _run(
        repo,
        bin_dir,
        marker,
        "--file",
        "custom_components/oig_cloud/../outside.py",
    )

    assert result.returncode != 0
    assert "Invalid --file path" in result.stderr
    assert not marker.exists()


def test_selected_file_rejects_control_characters_before_mount_or_network(
    tmp_path: Path,
) -> None:
    """Permitting control characters would make path and command boundaries ambiguous."""
    repo = _make_repo(tmp_path)
    bin_dir, marker = _blocked_commands(tmp_path)

    result = _run(
        repo,
        bin_dir,
        marker,
        "--file",
        "custom_components/oig_cloud/battery_forecast/planning/auto\tswitch.py",
    )

    assert result.returncode != 0
    assert "Invalid --file path" in result.stderr
    assert not marker.exists()


@pytest.mark.parametrize(
    "path",
    [
        "/tmp/outside.py",
        "custom_components/oig_cloud//battery_forecast/planning/auto_switch.py",
        "custom_components/oig_cloud/battery_forecast/planning/untracked.py",
    ],
)
def test_selected_file_rejects_noncanonical_or_untracked_source_before_mount(
    tmp_path: Path, path: str
) -> None:
    """Relaxing the source allowlist could select a file outside the reviewed tree."""
    repo = _make_repo(tmp_path)
    bin_dir, marker = _blocked_commands(tmp_path)

    result = _run(repo, bin_dir, marker, "--file", path)

    assert result.returncode != 0
    assert not marker.exists()


def test_selected_file_rejects_force_and_missing_value_before_mount(tmp_path: Path) -> None:
    """Allowing force or an empty selection would defeat selected-file semantics."""
    repo = _make_repo(tmp_path)
    bin_dir, marker = _blocked_commands(tmp_path)

    force_result = _run(repo, bin_dir, marker, "--force", "--file", SELECTED_FILE)
    missing_result = _run(repo, bin_dir, marker, "--file")

    assert force_result.returncode != 0
    assert missing_result.returncode != 0
    assert not marker.exists()


def test_selected_file_deploy_backs_up_exact_target_and_preserves_other_manifest_entries(
    tmp_path: Path,
) -> None:
    """Removing the backup or replacing the manifest would make a hotfix destructive."""
    repo = _make_repo(tmp_path)
    mount = tmp_path / "mounted-config"
    target = mount / SELECTED_FILE
    target.parent.mkdir(parents=True)
    target.write_text("VALUE = 'deployed-before-hotfix'\n", encoding="utf-8")
    unrelated = "custom_components/oig_cloud/unrelated.py"
    (mount / unrelated).write_text("UNCHANGED = True\n", encoding="utf-8")
    (repo / ".deploy_manifest.json").write_text(
        json.dumps({"files": {SELECTED_FILE: "old", unrelated: "keep"}}), encoding="utf-8"
    )

    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    log = tmp_path / "commands.log"
    for command, body in {
        "mount": 'printf "mount %s present\\n" "$SMB_MOUNT"\n',
        "cp": 'printf "cp %s\\n" "$*" >> "$DEPLOY_TEST_MARKER"\nexec /bin/cp "$@"\n',
        "ssh": 'printf "ssh %s\\n" "$*" >> "$DEPLOY_TEST_MARKER"\nexit 0\n',
    }.items():
        executable = bin_dir / command
        executable.write_text(f"#!/bin/sh\n{body}", encoding="utf-8")
        executable.chmod(0o755)

    result = _run(
        repo,
        bin_dir,
        log,
        "--file",
        SELECTED_FILE,
        extra_env={"SMB_MOUNT": str(mount)},
    )

    assert result.returncode == 0, result.stderr
    assert target.read_text(encoding="utf-8") == "VALUE = 1\n"
    backups = list((mount / "custom_components/oig_cloud_backups").glob("selected.*"))
    assert len(backups) == 1
    assert (backups[0] / SELECTED_FILE).read_text(encoding="utf-8") == (
        "VALUE = 'deployed-before-hotfix'\n"
    )
    assert "Selected-file backup: /config/custom_components/oig_cloud_backups/selected." in result.stdout
    manifest = json.loads((repo / ".deploy_manifest.json").read_text(encoding="utf-8"))
    assert manifest["files"][unrelated] == "keep"
    assert "DELETE" not in result.stdout


def test_selected_files_do_not_partially_deploy_when_a_later_target_is_missing(
    tmp_path: Path,
) -> None:
    """Moving backup preflight into the copy loop would overwrite the first file."""
    repo = _make_repo(tmp_path)
    second = "custom_components/oig_cloud/battery_forecast/planning/mode_guard.py"
    (repo / second).write_text("SECOND = 2\n", encoding="utf-8")
    subprocess.run(["git", "-C", str(repo), "add", second], check=True)
    mount = tmp_path / "mounted-config"
    first_target = mount / SELECTED_FILE
    first_target.parent.mkdir(parents=True)
    first_target.write_text("VALUE = 'must-not-change'\n", encoding="utf-8")

    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    for command, body in {
        "mount": 'printf "mount %s present\\n" "$SMB_MOUNT"\n',
        "cp": 'exec /bin/cp "$@"\n',
    }.items():
        executable = bin_dir / command
        executable.write_text(f"#!/bin/sh\n{body}", encoding="utf-8")
        executable.chmod(0o755)

    result = _run(
        repo,
        bin_dir,
        tmp_path / "unused-marker",
        "--file",
        SELECTED_FILE,
        "--file",
        second,
        extra_env={"SMB_MOUNT": str(mount)},
    )

    assert result.returncode != 0
    assert first_target.read_text(encoding="utf-8") == "VALUE = 'must-not-change'\n"


def test_selected_files_do_not_deploy_when_backup_of_any_target_fails(tmp_path: Path) -> None:
    """Ignoring a backup error would make rollback unavailable after the first write."""
    repo = _make_repo(tmp_path)
    second = "custom_components/oig_cloud/battery_forecast/planning/mode_guard.py"
    (repo / second).write_text("SECOND = 2\n", encoding="utf-8")
    subprocess.run(["git", "-C", str(repo), "add", second], check=True)
    mount = tmp_path / "mounted-config"
    first_target = mount / SELECTED_FILE
    second_target = mount / second
    first_target.parent.mkdir(parents=True)
    first_target.write_text("VALUE = 'first-original'\n", encoding="utf-8")
    second_target.write_text("SECOND = 'second-original'\n", encoding="utf-8")

    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    for command, body in {
        "mount": 'printf "mount %s present\\n" "$SMB_MOUNT"\n',
        "cp": (
            'case "$3" in *custom_components/oig_cloud_backups/*mode_guard.py) exit 23;; esac\n'
            'exec /bin/cp "$@"\n'
        ),
    }.items():
        executable = bin_dir / command
        executable.write_text(f"#!/bin/sh\n{body}", encoding="utf-8")
        executable.chmod(0o755)

    result = _run(
        repo,
        bin_dir,
        tmp_path / "unused-marker",
        "--file",
        SELECTED_FILE,
        "--file",
        second,
        extra_env={"SMB_MOUNT": str(mount)},
    )

    assert result.returncode != 0
    assert first_target.read_text(encoding="utf-8") == "VALUE = 'first-original'\n"
    assert second_target.read_text(encoding="utf-8") == "SECOND = 'second-original'\n"


def test_selected_file_rejects_symlinked_remote_parent_before_external_write(
    tmp_path: Path,
) -> None:
    """Checking only the destination leaf would overwrite a path outside the mount."""
    repo = _make_repo(tmp_path)
    mount = tmp_path / "mounted-config"
    external = tmp_path / "outside-mount"
    external.mkdir()
    target_parent = mount / "custom_components/oig_cloud/battery_forecast"
    target_parent.mkdir(parents=True)
    (target_parent / "planning").symlink_to(external, target_is_directory=True)
    escaped_target = external / "auto_switch.py"
    escaped_target.write_text("VALUE = 'outside'\n", encoding="utf-8")
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    mount_command = bin_dir / "mount"
    mount_command.write_text('#!/bin/sh\nprintf "mount %s present\\n" "$SMB_MOUNT"\n', encoding="utf-8")
    mount_command.chmod(0o755)
    ssh_command = bin_dir / "ssh"
    ssh_command.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
    ssh_command.chmod(0o755)

    result = _run(
        repo,
        bin_dir,
        tmp_path / "unused-marker",
        "--file",
        SELECTED_FILE,
        extra_env={"SMB_MOUNT": str(mount)},
    )

    assert result.returncode != 0
    assert escaped_target.read_text(encoding="utf-8") == "VALUE = 'outside'\n"


def test_selected_file_rejects_symlinked_backup_root_before_source_overwrite(
    tmp_path: Path,
) -> None:
    """A backup-root symlink would send the recoverable copy outside the mount."""
    repo = _make_repo(tmp_path)
    mount = tmp_path / "mounted-config"
    target = mount / SELECTED_FILE
    target.parent.mkdir(parents=True)
    target.write_text("VALUE = 'original'\n", encoding="utf-8")
    external = tmp_path / "outside-mount"
    external.mkdir()
    backup_link = mount / "custom_components/oig_cloud_backups"
    backup_link.parent.mkdir(parents=True, exist_ok=True)
    backup_link.symlink_to(external, target_is_directory=True)
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    mount_command = bin_dir / "mount"
    mount_command.write_text('#!/bin/sh\nprintf "mount %s present\\n" "$SMB_MOUNT"\n', encoding="utf-8")
    mount_command.chmod(0o755)
    ssh_command = bin_dir / "ssh"
    ssh_command.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
    ssh_command.chmod(0o755)

    result = _run(
        repo,
        bin_dir,
        tmp_path / "unused-marker",
        "--file",
        SELECTED_FILE,
        extra_env={"SMB_MOUNT": str(mount)},
    )

    assert result.returncode != 0
    assert target.read_text(encoding="utf-8") == "VALUE = 'original'\n"
    assert not any(external.iterdir())
