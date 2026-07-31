"""Test maintainer-side ERU pricelist compiler script."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "build_pricelists.py"
_VENV_PYTHON = ROOT / ".venv" / "bin" / "python"
# Fall back to the running interpreter when a repo-local .venv is absent
# (e.g. worktrees that use an external HA env); openpyxl is a dev dependency.
PYTHON = _VENV_PYTHON if _VENV_PYTHON.exists() else Path(sys.executable)
FIXTURES = ROOT / "tests" / "fixtures" / "pricelists"
MANIFEST = ROOT / "custom_components" / "oig_cloud" / "manifest.json"
REQUIREMENTS_DEV = ROOT / "requirements-dev.in"

# Shipped, bundled dataset (the real ERU-derived artifact users receive).
SHIPPED_JSON = ROOT / "custom_components" / "oig_cloud" / "remote_config" / "data" / "pricelists.json"
ERU_SOURCE_XLSX = ROOT / "scripts" / "data_sources" / "ceny-nn26-1.xlsx"
ERU_SOURCE_URL = "https://eru.gov.cz/sites/default/files/obsah/prilohy/ceny-nn26-1.xlsx"

REQUIRED_DSOS = {"cez", "egd", "pre"}
REQUIRED_TARIFFS = {"VT", "NT", "POZE"}
# Household D-tariffs the 14/2025 (věstník 18/2025) NN decree lists.
REQUIRED_D_TARIFFS = {
    "D01d", "D02d", "D25d", "D26d", "D27d", "D35d", "D45d", "D56d", "D57d", "D61d",
}
# Two-tariff sazby carry a distinct NT (low-tariff) distribution price.
TWO_TARIFF_D_CODES = {"D25d", "D26d", "D27d", "D35d", "D45d", "D56d", "D57d", "D61d"}


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


# --- shipped dataset guards (audit gap O3) ------------------------------------
# These assert the SHIPPED bundle, not a fixture, so a fixture-built or
# hand-typed artifact can never be released silently again.


def _load_shipped() -> dict[str, Any]:
    return json.loads(SHIPPED_JSON.read_text(encoding="utf-8"))


def test_shipped_pricelists_sources_are_real_https_never_file() -> None:
    payload = _load_shipped()
    assert payload["sources"], "shipped dataset must record its source"
    for name, meta in payload["sources"].items():
        url = meta["source_url"]
        assert url.startswith("https://"), f"{name} source_url must be https, got {url!r}"
        assert not url.startswith("file://"), f"{name} must not ship a file:// URL"
        assert "eru.gov.cz" in url, f"{name} must come from the ERU regulator, got {url!r}"
        assert meta["sha256"] and len(meta["sha256"]) == 64
        assert meta["fetched_at"]


def test_shipped_pricelists_has_full_d_tariff_coverage() -> None:
    payload = _load_shipped()
    distributors = payload["distributors"]
    assert set(distributors.keys()) == REQUIRED_DSOS
    for dso in REQUIRED_DSOS:
        codes = set(distributors[dso].keys())
        missing = REQUIRED_D_TARIFFS - codes
        assert not missing, f"{dso} shipped dataset missing D-tariff(s): {sorted(missing)}"


def test_shipped_pricelists_unit_rules() -> None:
    """VT/NT distribution prices are Kc/MWh; only POZE is per-ampere Kc/A/mesic."""
    payload = _load_shipped()
    for dso, rates in payload["distributors"].items():
        for code in REQUIRED_D_TARIFFS:
            rate = rates[code]
            assert rate["unit"] == "Kc/MWh", f"{dso}/{code} must be Kc/MWh"
            assert rate["price_incl_vat"] is not None
            assert rate["price_excl_vat"] is not None
            # canonical VT leg
            assert rate["vt"]["unit"] == "Kc/MWh"
            if code in TWO_TARIFF_D_CODES:
                assert "nt" in rate, f"{dso}/{code} is two-tariff, needs an NT leg"
                assert rate["nt"]["unit"] == "Kc/MWh"
        poze = rates["POZE"]
        assert poze["unit"] == "Kc/A/mesic", f"{dso} POZE must be Kc/A/mesic"

    # No VT/NT distribution rate may masquerade as the per-ampere unit.
    def _walk(node: Any):
        if isinstance(node, dict):
            if node.get("unit") == "Kc/A/mesic":
                yield node
            for value in node.values():
                yield from _walk(value)
    perampere = list(_walk(payload["distributors"]))
    # exactly the three POZE entries carry Kc/A/mesic
    assert len(perampere) == len(REQUIRED_DSOS)


def test_shipped_pricelists_has_tariff_descriptions() -> None:
    """Owner UX rev item 2: each D-tariff carries the ERU decree's own short
    description (used by the wizard's step 4 tariff-select copy), identical
    across all three distributors since the sazba is a decree-wide fact."""
    payload = _load_shipped()
    for dso in REQUIRED_DSOS:
        rates = payload["distributors"][dso]
        for code in REQUIRED_D_TARIFFS:
            description = rates[code].get("description")
            assert description, f"{dso}/{code} missing tariff description"
    descriptions_by_code = {
        code: payload["distributors"]["cez"][code]["description"] for code in REQUIRED_D_TARIFFS
    }
    for dso in REQUIRED_DSOS - {"cez"}:
        for code in REQUIRED_D_TARIFFS:
            assert payload["distributors"][dso][code]["description"] == descriptions_by_code[code], (
                f"{dso}/{code} description diverges from cez — should be distributor-independent"
            )
    assert descriptions_by_code["D01d"] == "Jednotarifová sazba (pro malou spotřebu)"


def test_shipped_pricelists_has_regulated_components() -> None:
    """Owner D57d bug: the wizard's suggested fee dropped system_services and
    electricity_tax, using only the distribution leg. Both extra per-MWh
    regulated charges must ship as a top-level section, separate from
    `distributors` (which POZE-only readers must not have to touch)."""
    payload = _load_shipped()
    components = payload["regulated_components"]
    system_services = components["system_services"]
    assert system_services["unit"] == "Kc/MWh"
    assert system_services["price_excl_vat"] == 164.24
    assert system_services["price_incl_vat"] == pytest.approx(164.24 * 1.21, abs=0.01)
    assert system_services["source"] == "ceny-nn26-1.xlsx"

    electricity_tax = components["electricity_tax"]
    assert electricity_tax["unit"] == "Kc/MWh"
    assert electricity_tax["price_excl_vat"] == 28.30
    assert electricity_tax["price_incl_vat"] == pytest.approx(28.30 * 1.21, abs=0.01)
    assert "261/2007" in electricity_tax["source"]


def test_shipped_pricelists_regulated_components_reproducible_from_committed_source() -> None:
    """Rebuilding from the committed ERU XLSX reproduces the shipped
    regulated_components section exactly (guards against hand-edited prices)."""
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "rebuilt.json"
        result = _run_builder(
            [ERU_SOURCE_XLSX],
            out,
            "--source-url",
            f"ceny-nn26-1.xlsx={ERU_SOURCE_URL}",
            "--valid-from",
            "2026-01-01",
        )
        assert result.returncode == 0, result.stderr
        rebuilt = _load_payload(out)

    shipped = _load_shipped()
    assert rebuilt["regulated_components"] == shipped["regulated_components"]


def test_shipped_pricelists_snapshots_have_valid_from() -> None:
    payload = _load_shipped()
    snapshots = payload["valid_from_snapshots"]
    assert isinstance(snapshots, list) and snapshots
    for snap in snapshots:
        assert snap["valid_from"], "every snapshot must carry valid_from"
        assert set(snap["distributors"].keys()) == REQUIRED_DSOS
    assert payload["year"] >= 2026
    assert payload["schema_version"] >= 2


def test_shipped_pricelists_is_reproducible_from_committed_source() -> None:
    """Rebuilding from the committed ERU XLSX reproduces the shipped rates.

    Guards against hand-edited prices: the shipped distributors/snapshots must be
    exactly what the compiler emits from the real source file.
    """
    if not ERU_SOURCE_XLSX.exists():  # pragma: no cover - source must be committed
        raise AssertionError("committed ERU source XLSX is missing")
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "rebuilt.json"
        result = _run_builder(
            [ERU_SOURCE_XLSX],
            out,
            "--source-url",
            f"ceny-nn26-1.xlsx={ERU_SOURCE_URL}",
            "--valid-from",
            "2026-01-01",
        )
        assert result.returncode == 0, result.stderr
        rebuilt = _load_payload(out)

    shipped = _load_shipped()
    assert rebuilt["distributors"] == shipped["distributors"]
    assert rebuilt["valid_from_snapshots"] == shipped["valid_from_snapshots"]
    assert (
        rebuilt["sources"]["ceny-nn26-1.xlsx"]["source_url"]
        == shipped["sources"]["ceny-nn26-1.xlsx"]["source_url"]
    )


def test_eru_mode_refuses_without_real_source_url(tmp_path: Path) -> None:
    """ERU-decree mode must fail loudly rather than emit a file:// provenance."""
    output = tmp_path / "pricelists.json"
    output.write_text("keep", encoding="utf-8")
    result = _run_builder([ERU_SOURCE_XLSX], output, "--eru-decree")
    assert result.returncode != 0
    assert "source-url" in result.stderr
    assert output.read_text(encoding="utf-8") == "keep"
