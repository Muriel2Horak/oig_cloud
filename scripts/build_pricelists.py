"""Maintainer-side ERU XLSX -> bundled pricelist JSON compiler.

Output JSON schema (v1):

{
  "schema_version": 1,
  "generated_at": "2026-07-19T00:00:00Z",
  "year": 2026,
  "sources": {
    "<source_file_name>": {
      "source_url": "file:///abs/path/price_file.xlsx",
      "fetched_at": "2026-07-19T00:00:00Z",
      "sha256": "..."
    }
  },
  "distributors": {
    "cez": {
      "VT": {"unit": "Kc/A/mesic", "price_incl_vat": 12.34, "price_excl_vat": 9.5},
      "NT": {"unit": "Kc/A/mesic", "price_incl_vat": 9.1, "price_excl_vat": 7.4},
      "POZE": {"unit": "Kc/A/mesic", "price_incl_vat": 2.1, "price_excl_vat": 1.6}
    },
    "egd": { ... },
    "pre": { ... }
  },
  "valid_from_snapshots": [
    {
      "valid_from": "2026-01-01",
      "distributors": {
        "cez": {
          "VT": {"unit": "Kc/A/mesic", "price_incl_vat": 12.34, "price_excl_vat": 9.5},
          "NT": {"unit": "Kc/A/mesic", "price_incl_vat": 9.1, "price_excl_vat": 7.4},
          "POZE": {"unit": "Kc/A/mesic", "price_incl_vat": 2.1, "price_excl_vat": 1.6}
        },
        "egd": { ... },
        "pre": { ... }
      },
      "sources": {
        "cez": "price_file.xlsx",
        "egd": "price_file.xlsx",
        "pre": "price_file.xlsx"
      }
    }
  ]
}

Reader behavior:
- Sheets are discovered by header text, not by fixed index.
- Price rows are resolved by column headers and converted as:
    - bold cell -> price_incl_vat
    - parenthesised string "(...) -> price_excl_vat
- Unit must be "Kc/A/mesic" (never "Kc/MWh").
- Tariff coverage must be complete for every required distributor (cez, egd, pre)
  and every discovered tariff in each snapshot.
- Any per-tariff price movement > 30% vs previous valid_from snapshot causes failure,
  unless --allow-large-moves is supplied.
- On any validation/build failure, output path is never created or modified.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import tempfile
from dataclasses import dataclass
from datetime import datetime, date, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote
import os

from openpyxl import load_workbook
from openpyxl.cell import Cell
from openpyxl.worksheet.worksheet import Worksheet

REQUIRED_DSOS = {"cez", "egd", "pre"}
TARIFF_PRICE_FIELDS = ("price_incl_vat", "price_excl_vat")
REQUIRED_HEADER_COLUMNS = ("tariff", "unit", "price", "valid_from")

HEADER_PATTERNS: Dict[str, Tuple[str, ...]] = {
    "distributor": ("distributor", "provider", "dso", "supplier"),
    "tariff": ("tariff", "tarifa", "sazba"),
    "unit": ("unit", "jednotka"),
    "price": ("price", "cena", "amount", "value"),
    "valid_from": (
        "valid",
        "platna_od",
        "platnost",
        "platnost_od",
        "as_of",
        "date",
    ),
}


def _parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build bundled pricelists JSON from ERU XLSX files.")
    parser.add_argument(
        "--output",
        required=True,
        type=Path,
        help="Output JSON path",
    )
    parser.add_argument(
        "--allow-large-moves",
        action="store_true",
        help=(
            "Allow price changes greater than 30% against previous snapshot. "
            "Required only for intentional tariff changes."
        ),
    )
    parser.add_argument("files", nargs="+", type=Path, help="Versioned ERU XLSX source files")
    return parser.parse_args(argv)


class BuildError(RuntimeError):
    """Domain-specific build error raised for non-zero exit conditions."""


@dataclass(frozen=True)
class SourceMeta:
    source_file: str
    source_url: str
    fetched_at: str
    sha256: str


@dataclass
class PricePoint:
    unit: str
    price_incl_vat: Optional[float] = None
    price_excl_vat: Optional[float] = None
    source_file: Optional[str] = None

    def to_payload(self) -> Dict[str, Any]:
        return {
            "unit": self.unit,
            "price_incl_vat": self.price_incl_vat,
            "price_excl_vat": self.price_excl_vat,
        }


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", "", str(value).strip().lower())


def _normalize_dso(value: Any) -> str:
    normalized = _normalize_text(value)
    if not normalized:
        return ""
    if "cez" in normalized:
        return "cez"
    if "egd" in normalized:
        return "egd"
    if "pre" in normalized:
        return "pre"
    return ""


def _normalize_unit(raw: Any) -> str:
    normalized = re.sub(r"\s+", "", str(raw)).replace("Kč", "Kc").replace("měsíc", "mesic")
    return normalized


def _normalize_header_token(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"[^a-z]", "", str(value).strip().lower())


def _parse_date(raw: Any) -> str:
    if isinstance(raw, datetime):
        return raw.date().isoformat()
    if isinstance(raw, date):
        return raw.isoformat()
    if isinstance(raw, int):
        raise BuildError(f"valid_from value {raw!r} is invalid date format")

    if raw is None:
        raise BuildError("valid_from value is missing")

    text = str(raw).strip()
    if not text:
        raise BuildError("valid_from value is missing")

    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        return text
    raise BuildError(f"valid_from value {raw!r} is not ISO-8601 date")


def _parse_price(cell: Cell) -> Tuple[Optional[str], float]:
    raw = cell.value
    if raw is None:
        raise BuildError("price cell is empty")

    text = str(raw).strip()
    is_excl = False
    if text.startswith("(") and text.endswith(")"):
        is_excl = True
        text = text[1:-1].strip()

    if not text:
        raise BuildError("price cell is empty")

    try:
        price = float(text.replace(",", "."))
    except ValueError as exc:
        raise BuildError(f"price cell {raw!r} is not numeric") from exc

    is_incl = bool(cell.font and cell.font.bold)
    if cell.number_format and "(" in str(cell.number_format) and ")" in str(cell.number_format):
        if not is_excl:
            is_excl = True
        is_incl = False

    if is_excl == is_incl:
        raise BuildError("price cell is neither explicitly incl nor excl via bold/parentheses")

    return ("price_excl_vat" if is_excl else "price_incl_vat"), price


def _find_header_columns(worksheet: Worksheet) -> Tuple[Optional[Dict[str, int]], Optional[int]]:
    max_row = min(worksheet.max_row or 1, 40)
    max_column = worksheet.max_column or 1

    for row_idx in range(1, max_row + 1):
        row = list(worksheet.iter_rows(min_row=row_idx, max_row=row_idx, max_col=max_column, values_only=False))[0]
        column_map: Dict[str, int] = {}
        for column_idx, cell in enumerate(row, start=1):
            token = _normalize_header_token(cell.value)
            if not token:
                continue
            for key, aliases in HEADER_PATTERNS.items():
                if any(alias in token for alias in aliases) and key not in column_map:
                    column_map[key] = column_idx

        missing = [name for name in REQUIRED_HEADER_COLUMNS if name not in column_map]
        if not missing:
            return column_map, row_idx
    return None, None


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _read_source_metadata(path: Path) -> SourceMeta:
    stat = path.stat()
    fetched = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).replace(microsecond=0).isoformat()
    return SourceMeta(
        source_file=path.name,
        source_url=f"file://{quote(str(path.resolve()))}",
        fetched_at=fetched,
        sha256=_sha256(path),
    )


def _build_snapshot_map(
    files: List[Path],
) -> Tuple[
    Dict[str, Dict[str, Dict[str, PricePoint]]],
    Dict[str, str],
    Dict[str, SourceMeta],
]:
    source_files: Dict[str, SourceMeta] = {}
    # valid_from -> distributor -> tariff -> price point
    snapshots: Dict[str, Dict[str, Dict[str, PricePoint]]] = {}
    # valid_from -> distributor -> source_file
    snapshot_sources: Dict[str, str] = {}

    for path in files:
        if not path.exists():
            raise BuildError(f"input file does not exist: {path}")
        metadata = _read_source_metadata(path)
        source_files[metadata.source_file] = metadata

        workbook = load_workbook(path, data_only=True)
        if not workbook.worksheets:
            raise BuildError(f"input file has no sheets: {path}")

        for worksheet in workbook.worksheets:
            header_columns, header_row = _find_header_columns(worksheet)
            if not header_columns:
                continue

            for row in worksheet.iter_rows(min_row=header_row + 1, values_only=False):
                if all(cell.value in (None, "") for cell in row):
                    continue
                dso_raw = row[header_columns["distributor"] - 1].value if "distributor" in header_columns else None
                dso = _normalize_dso(dso_raw or worksheet.title)
                if not dso:
                    raise BuildError(f"could not resolve distributor in {worksheet.title}")
                if dso not in REQUIRED_DSOS:
                    raise BuildError(f"unexpected distributor {dso_raw!r} in {worksheet.title}")

                tariff_raw = row[header_columns["tariff"] - 1].value
                if tariff_raw in (None, ""):
                    continue
                tariff = str(tariff_raw).strip()
                if not tariff:
                    continue

                unit_raw = row[header_columns["unit"] - 1].value
                unit = _normalize_unit(unit_raw)
                if unit != "Kc/A/mesic":
                    raise BuildError(f"unsupported unit {unit!r} for {dso}/{tariff}")

                valid_from_raw = row[header_columns["valid_from"] - 1].value
                valid_from = _parse_date(valid_from_raw)

                price_cell = row[header_columns["price"] - 1]
                price_key, price = _parse_price(price_cell)

                snapshot = snapshots.setdefault(valid_from, {})
                snapshot.setdefault(dso, {})
                point = snapshot[dso].setdefault(tariff, PricePoint(unit=unit, source_file=metadata.source_file))
                if getattr(point, price_key) is not None:
                    raise BuildError(f"duplicate {price_key} for {dso}/{tariff}/{valid_from}")
                setattr(point, price_key, price)
                snapshot_sources.setdefault(valid_from, metadata.source_file)

            # no row-level break; multiple sheets can contribute to different distributors
        workbook.close()

    if not snapshots:
        raise BuildError("no valid price rows were parsed from any worksheet")
    return snapshots, snapshot_sources, source_files


def _snapshot_coverage_complete(
    snapshots: Dict[str, Dict[str, Dict[str, PricePoint]]],
) -> None:
    for valid_from, distributors in snapshots.items():
        missing_dsos = REQUIRED_DSOS - distributors.keys()
        if missing_dsos:
            raise BuildError(
                f"snapshot {valid_from} misses required distributor(s): {", ".join(sorted(missing_dsos))}"
            )

        tariff_union = set()
        for dso_data in distributors.values():
            tariff_union.update(dso_data.keys())
        if not tariff_union:
            raise BuildError(f"snapshot {valid_from} contains no tariff rows")

        for distributor, dso_data in distributors.items():
            missing_tariffs = tariff_union - dso_data.keys()
            if missing_tariffs:
                raise BuildError(
                    f"{distributor} snapshot {valid_from} missing tariff(s): {", ".join(sorted(missing_tariffs))}"
                )

            for tariff, point in dso_data.items():
                if point.unit != "Kc/A/mesic":
                    raise BuildError(
                        f"{distributor} snapshot {valid_from} {tariff} unit must be Kc/A/mesic"
                    )
                for field in TARIFF_PRICE_FIELDS:
                    if getattr(point, field) is None:
                        raise BuildError(
                            f"{distributor} snapshot {valid_from} {tariff} missing field {field}"
                        )


def _check_price_movement(
    snapshots: Dict[str, Dict[str, Dict[str, PricePoint]]], allow_large_moves: bool
) -> None:
    if allow_large_moves:
        return

    sorted_dates = sorted(snapshots.keys())
    if len(sorted_dates) <= 1:
        return

    for prev_date, cur_date in zip(sorted_dates[:-1], sorted_dates[1:]):
        prev = snapshots[prev_date]
        cur = snapshots[cur_date]
        for distributor in sorted(REQUIRED_DSOS):
            for tariff in sorted(prev[distributor].keys()):
                prev_point = prev[distributor][tariff]
                cur_point = cur[distributor][tariff]
                for field in TARIFF_PRICE_FIELDS:
                    previous = getattr(prev_point, field)
                    current = getattr(cur_point, field)
                    if previous is None or current is None:
                        continue
                    if previous == 0:
                        raise BuildError(
                            f"{distributor}/{tariff} {field} moved from zero to {current} without override"
                        )
                    if abs(current - previous) / previous > 0.3:
                        raise BuildError(
                            f"{distributor}/{tariff} {field} moved >30% from {previous} on {prev_date} to {current} on {cur_date}"
                        )


def _build_payload(snapshots: Dict[str, Dict[str, Dict[str, PricePoint]]], source_files: Dict[str, SourceMeta]) -> Dict[str, Any]:
    sorted_dates = sorted(snapshots.keys())
    latest = snapshots[sorted_dates[-1]]

    def convert_distributor_data(data: Dict[str, Dict[str, PricePoint]]) -> Dict[str, Any]:
        result: Dict[str, Any] = {}
        for tariff, point in sorted(data.items()):
            result[tariff] = point.to_payload()
        return result

    valid_from_snapshots = []
    for valid_from in sorted_dates:
        snapshot_distributors = snapshots[valid_from]
        valid_from_snapshots.append(
            {
                "valid_from": valid_from,
                "distributors": {
                    distributor: convert_distributor_data(snapshot_distributors[distributor])
                    for distributor in sorted(snapshot_distributors)
                },
                "sources": {
                    distributor: snapshot_distributors[distributor][next(iter(snapshot_distributors[distributor]))].source_file
                    for distributor in sorted(snapshot_distributors)
                },
            }
        )

    year = int(sorted_dates[-1][:4])
    payload = {
        "schema_version": 1,
        "generated_at": datetime.now(tz=timezone.utc).replace(microsecond=0).isoformat(),
        "year": year,
        "sources": {
            source_file: {
                "source_url": data.source_url,
                "fetched_at": data.fetched_at,
                "sha256": data.sha256,
            }
            for source_file, data in sorted(source_files.items(), key=lambda item: item[0])
        },
        "distributors": {distributor: convert_distributor_data(latest[distributor]) for distributor in sorted(latest)},
        "valid_from_snapshots": valid_from_snapshots,
    }
    return payload


def _write_payload(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", delete=False, dir=path.parent, suffix=".tmp", encoding="utf-8") as tmp:
        json.dump(payload, tmp, ensure_ascii=False, indent=2, sort_keys=True)
        tmp.flush()
        temp_path = Path(tmp.name)
    os.replace(temp_path, path)


def build(argv: Optional[List[str]] = None) -> int:
    args = _parse_args(argv)
    snapshots: Dict[str, Dict[str, Dict[str, PricePoint]]]
    snapshot_sources: Dict[str, str]
    source_files: Dict[str, SourceMeta]
    try:
        snapshots, snapshot_sources, source_files = _build_snapshot_map(args.files)
        _snapshot_coverage_complete(snapshots)
        _check_price_movement(snapshots, args.allow_large_moves)
    except BuildError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    try:
        payload = _build_payload(snapshots, source_files)
    except BuildError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    _write_payload(args.output, payload)
    return 0


def main(argv: Optional[List[str]] = None) -> int:
    return build(argv)


if __name__ == "__main__":
    raise SystemExit(main())
