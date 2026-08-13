"""Release regressions for Sonar source classification and install safety."""

import json
from pathlib import Path

ROOT = Path(__file__).parents[1]


def test_release_metadata_targets_version_2_4_1() -> None:
    """The integration manifest and release documents must name the same release."""
    manifest = json.loads(
        (ROOT / "custom_components/oig_cloud/manifest.json").read_text(encoding="utf-8")
    )
    changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    release_notes = (ROOT / "RELEASE_NOTES_v2.4.1.md").read_text(encoding="utf-8")

    assert manifest["version"] == "2.4.1"
    assert "## [2.4.1]" in changelog
    assert "vydání 2.4.1" in release_notes


def test_sonar_classifies_e2e_and_tooling_outside_product_coverage() -> None:
    """Coverage must measure product code, not E2E specs or build tooling."""
    workflow = (ROOT / ".github/workflows/sonarcloud.yml").read_text(encoding="utf-8")
    assert "custom_components/oig_cloud/www_v2/playwright" in workflow
    assert "**/*.spec.ts" in workflow
    assert "scripts/**" in workflow
    assert "custom_components/oig_cloud/www_v2/scripts/**" in workflow
    assert "custom_components/oig_cloud/www_v2/vite.config.ts" in workflow


def test_all_frontend_installs_disable_lifecycle_scripts() -> None:
    """Release tooling must not execute dependency lifecycle scripts."""
    local_checks = (ROOT / "scripts/run_local_checks.sh").read_text(encoding="utf-8")
    pre_commit = (ROOT / ".github/workflows/pre-commit.yml").read_text(encoding="utf-8")
    assert 'npm --prefix "$FRONTEND_DIR" ci --ignore-scripts' in local_checks
    assert "run: npm ci --ignore-scripts" in pre_commit
