"""Anonymous 15-minute energy slots for tuning the planner across installs.

Only with the user's consent (option ``share_energy_data``, off by default).
A batch says, per finished 15-minute slot: backup load, non-backup load, PV,
grid import and export, battery SoC, box mode, import and export price; and
once per batch the box facts the planner depends on (capacity, bat_min, grid
charge power). Nothing else: no entity ids, no names, no location, and not the
box's serial number. The install is identified by a salted HMAC of the serial,
with the salt kept only in the install, so one box's slots can be joined with
each other but not traced to a box or a customer.

Pure: dicts in, dicts out. The transport (TLS only) is
``shared.energy_publisher``; collecting the slots is
``battery_forecast.planning.energy_telemetry_job``.
"""

from __future__ import annotations

import hashlib
import hmac
import math
import re
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Mapping, Optional

SCHEMA_VERSION = 1
_INSTALL_ID_RE = re.compile(r"^[0-9a-f]{24}$")
# A slot whose counters say more than this was not measured right (the box's
# day counters jump on reset and on reconnect).
_MAX_SLOT_KWH = 25.0
_MAX_PRICE = 100.0


def install_hash(box_id: str, salt: str) -> str:
    """Salted, one-way install id (24 hex characters)."""
    digest = hmac.new(salt.encode(), str(box_id).encode(), hashlib.sha256).hexdigest()
    return digest[:24]


def _energy(value: Any) -> Optional[float]:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    if not math.isfinite(number) or number < 0 or number > _MAX_SLOT_KWH:
        return None
    return round(number, 3)


def _price(value: Any) -> Optional[float]:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    if not math.isfinite(number) or abs(number) > _MAX_PRICE:
        return None
    return round(number, 3)


def slot_from_history(start: datetime, row: Mapping[str, Any]) -> Optional[Dict[str, Any]]:
    """One slot from ``history.fetch_interval_from_history``; None if broken."""
    values = {
        "load_kwh": _energy(row.get("consumption_kwh")),
        "nonbackup_kwh": _energy(row.get("nonbackup_kwh")),
        "pv_kwh": _energy(row.get("solar_kwh")),
        "import_kwh": _energy(row.get("grid_import")),
        "export_kwh": _energy(row.get("grid_export")),
        "import_price": _price(row.get("spot_price")),
        "export_price": _price(row.get("export_price")),
    }
    soc = row.get("battery_soc")
    mode = row.get("mode")
    if any(v is None for v in values.values()):
        return None
    if isinstance(soc, bool) or not isinstance(soc, (int, float)) or not 0 <= soc <= 100:
        return None
    if isinstance(mode, bool) or not isinstance(mode, int) or not 0 <= mode <= 9:
        return None
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    return {
        "t": int(start.timestamp()),
        "load_kwh": values["load_kwh"],
        "nonbackup_kwh": values["nonbackup_kwh"],
        "pv_kwh": values["pv_kwh"],
        "import_kwh": values["import_kwh"],
        "export_kwh": values["export_kwh"],
        "soc_pct": round(float(soc), 1),
        "mode": mode,
        "import_price": values["import_price"],
        "export_price": values["export_price"],
    }


def _box_number(value: Any) -> Optional[float]:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return round(number, 2) if math.isfinite(number) and number >= 0 else None


def build_energy_batch(
    *,
    install_id: str,
    slots: Iterable[Optional[Dict[str, Any]]],
    capacity_kwh: Any,
    bat_min_pct: Any,
    charge_kw: Any,
    integration_version: str,
    sent_at: Optional[datetime] = None,
) -> Optional[Dict[str, Any]]:
    """The payload for one batch, or None when no slot is valid."""
    if not _INSTALL_ID_RE.fullmatch(str(install_id)):
        raise ValueError("install_id must be an install_hash(), never a box serial")
    valid = [slot for slot in slots if slot]
    if not valid:
        return None
    sent = sent_at or datetime.now(timezone.utc)
    return {
        "schema": SCHEMA_VERSION,
        "install_id": install_id,
        "sent_at": int(sent.timestamp()),
        "integration_version": str(integration_version)[:20],
        "box": {
            "capacity_kwh": _box_number(capacity_kwh),
            "bat_min_pct": _box_number(bat_min_pct),
            "charge_kw": _box_number(charge_kw),
        },
        "slots": sorted(valid, key=lambda slot: slot["t"]),
    }
