"""Test maintainer-side ERU pricelist compiler script."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "build_pricelists.py"
PYTHON = ROOT / ".venv" / "bin" / "python"
FIXTURES = ROOT / "tests" / "fixtures" / "pricelists"
MANIFEST = ROOT / "custom_components" / "oig_cloud" / "manifest.json"
REQUIREMENTS_DEV = ROOT / "requirements-dev.in"

REQUIRED_DSOS = {"cez", "egd", "pre"}
REQUIRED_TARIFFS = {"VT", "NT", "POZE"}


def _run_builder(files: list[Path], output: Path, *args: str) -> subprocess.CompletedProcess[str]:
    command = [
        str(PYTHON),
        str(SCRIPT),
        "--output",
        str(output),
        *args,
    ] + [str(item) for item in files]
    return subprocess.run(command, capture_output=True, text=True)


def _load_payload(output: Path) -> dict[str, Any]:
    return json.loads(output.read_text(encoding="utf-8"))


def _assert_complete_payload(payload: dict[str, Any]) -> None:
    assert payload["year"] >= 2026
    assert payload["schema_version"] == 1
    assert set(payload["distributors"].keys()) == REQUIRED_DSOS

    snapshots = payload["valid_from_snapshots"]
    assert isinstance(snapshots, list)
    assert snapshots

    for snapshot in snapshots:
        assert {"valid_from", "distributors", "sources"} <= set(snapshot)
        snapshot_dists = snapshot["distributors"]
        assert set(snapshot_dists.keys()) == REQUIRED_DSOS
        snapshot_sources = snapshot["sources"]

        for dso in REQUIRED_DSOS:
            dso_payload = snapshot_dists[dso]
            assert set(dso_payload.keys()) == REQUIRED_TARIFFS
            for tariff in REQUIRED_TARIFFS:
                rate = dso_payload[tariff]
                assert set(rate) == {"unit", "price_incl_vat", "price_excl_vat"}
                assert rate["unit"] == "Kc/A/mesic"
                assert rate["price_incl_vat"] is not None
                assert rate["price_excl_vat"] is not None

            assert snapshot_sources[dso] in payload["sources"]
            source = payload["sources"][snapshot_sources[dso]]
            assert set(source.keys()) == {"source_url", "fetched_at", "sha256"}
            assert source["source_url"].startswith("file://")

    # POZE unit assertion
    assert payload["distributors"]["cez"]["POZE"]["unit"] == "Kc/A/mesic"
    assert payload["distributors"]["egd"]["POZE"]["unit"] == "Kc/A/mesic"
    assert payload["distributors"]["pre"]["POZE"]["unit"] == "Kc/A/mesic"


def _assert_command_failed(result: subprocess.CompletedProcess[str], output: Path) -> None:
    assert result.returncode != 0
    assert "ERROR:" in result.stderr
    assert output.exists()


def test_happy_path_builds_complete_dataset_with_renamed_sheet(tmp_path: Path) -> None:
    output = tmp_path / "pricelists.json"
    result = _run_builder([FIXTURES / "renamed_sheet.xlsx"], output)

    assert result.returncode == 0
    payload = _load_payload(output)
    _assert_complete_payload(payload)

    cez_vt = payload["distributors"]["cez"]["VT"]
    assert cez_vt["price_incl_vat"] == 12.4
    assert cez_vt["price_excl_vat"] == 9.5


def test_rejects_missing_column_and_does_not_write_output(tmp_path: Path) -> None:
    output = tmp_path / "pricelists.json"
    output.write_text("preserve-me", encoding="utf-8")

    result = _run_builder([FIXTURES / "missing_column.xlsx"], output)
    _assert_command_failed(result, output)
    assert output.read_text(encoding="utf-8") == "preserve-me"


def test_rejects_schema_mismatch_unit_and_does_not_write_output(tmp_path: Path) -> None:
    output = tmp_path / "pricelists.json"
    output.write_text("keep-this", encoding="utf-8")

    result = _run_builder([FIXTURES / "schema_mismatch.xlsx"], output)
    _assert_command_failed(result, output)
    assert output.read_text(encoding="utf-8") == "keep-this"


def test_rejects_incomplete_coverage(tmp_path: Path) -> None:
    output = tmp_path / "pricelists.json"
    output.write_text("no-change", encoding="utf-8")

    result = _run_builder([FIXTURES / "incomplete_coverage.xlsx"], output)
    _assert_command_failed(result, output)
    assert output.read_text(encoding="utf-8") == "no-change"


def test_rejects_large_price_move_without_override(tmp_path: Path) -> None:
    output = tmp_path / "pricelists.json"
    output.write_text("unchanged", encoding="utf-8")

    result = _run_builder(
        [FIXTURES / "price_jump_prev.xlsx", FIXTURES / "price_jump_next.xlsx"],
        output,
    )
    _assert_command_failed(result, output)
    assert output.read_text(encoding="utf-8") == "unchanged"


def test_allows_large_price_move_with_override_flag(tmp_path: Path) -> None:
    output = tmp_path / "pricelists.json"
    result = _run_builder(
        [FIXTURES / "price_jump_prev.xlsx", FIXTURES / "price_jump_next.xlsx"],
        output,
        "--allow-large-moves",
    )

    assert result.returncode == 0
    payload = _load_payload(output)
    snapshots = payload["valid_from_snapshots"]
    assert [item["valid_from"] for item in snapshots] == ["2026-01-01", "2026-02-01"]
    assert payload["distributors"]["cez"]["VT"]["price_incl_vat"] == 18.6


def test_manifest_excludes_openpyxl_requirement() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    requirements = manifest["requirements"]
    assert all(not str(req).startswith("openpyxl") for req in requirements)


def test_build_requirements_mark_openpyxl_as_dev_dependency() -> None:
    text = REQUIREMENTS_DEV.read_text(encoding="utf-8")
    assert "openpyxl" in text
