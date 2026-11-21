"""Anonymous energy slots for tuning the planner across installs."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import pytest

from custom_components.oig_cloud.shared.energy_telemetry import (
    SCHEMA_VERSION,
    build_energy_batch,
    install_hash,
    slot_from_history,
)

T0 = datetime(2026, 11, 15, 17, 0, tzinfo=timezone.utc)


def _history(**overrides):
    row = {
        "consumption_kwh": 1.625,
        "nonbackup_kwh": 0.05,
        "solar_kwh": 0.0,
        "grid_import": 1.7,
        "grid_export": 0.0,
        "battery_soc": 100.0,
        "mode": 3,
        "mode_name": "HOME UPS",
        "spot_price": 7.3,
        "export_price": 3.9,
        "battery_kwh": 15.36,
        "net_cost": 12.4,
        "backup_grid_import_kwh": 1.6,
        "backup_net_cost": 11.7,
    }
    row.update(overrides)
    return row


def test_install_hash_is_stable_salted_and_not_the_box_number():
    first = install_hash("2206237016", "salt-a")
    assert first == install_hash("2206237016", "salt-a")
    assert first != install_hash("2206237016", "salt-b")
    assert "2206237016" not in first
    assert len(first) == 24 and all(c in "0123456789abcdef" for c in first)


def test_slot_keeps_only_the_allowlisted_measurements():
    slot = slot_from_history(T0, _history())

    assert slot == {
        "t": int(T0.timestamp()),
        "load_kwh": 1.625,
        "nonbackup_kwh": 0.05,
        "pv_kwh": 0.0,
        "import_kwh": 1.7,
        "export_kwh": 0.0,
        "soc_pct": 100.0,
        "mode": 3,
        "import_price": 7.3,
        "export_price": 3.9,
    }


@pytest.mark.parametrize(
    "bad",
    [
        {"consumption_kwh": None},
        {"consumption_kwh": float("nan")},
        {"consumption_kwh": -0.5},
        {"consumption_kwh": 60.0},  # 240 kW in 15 minutes is a broken counter
        {"battery_soc": 140.0},
        {"mode": "HOME UPS"},
    ],
)
def test_a_broken_measurement_drops_the_slot(bad):
    assert slot_from_history(T0, _history(**bad)) is None


def test_batch_carries_the_install_and_box_facts_and_nothing_else():
    slots = [slot_from_history(T0 + timedelta(minutes=15 * i), _history()) for i in range(4)]
    batch = build_energy_batch(
        install_id=install_hash("2206237016", "salt"),
        slots=slots,
        capacity_kwh=15.36,
        bat_min_pct=20.0,
        charge_kw=2.6,
        integration_version="2.5.0",
        sent_at=T0 + timedelta(hours=1),
    )

    assert batch["schema"] == SCHEMA_VERSION
    assert batch["install_id"] == install_hash("2206237016", "salt")
    assert batch["box"] == {"capacity_kwh": 15.36, "bat_min_pct": 20.0, "charge_kw": 2.6}
    assert len(batch["slots"]) == 4
    text = json.dumps(batch)
    for leak in ("2206237016", "sensor.", "oig_", "HOME UPS", "entity"):
        assert leak not in text


def test_batch_without_valid_slots_is_none():
    assert (
        build_energy_batch(
            install_id="a" * 24,
            slots=[None, None],
            capacity_kwh=15.36,
            bat_min_pct=20.0,
            charge_kw=2.6,
            integration_version="2.5.0",
        )
        is None
    )


def test_batch_refuses_an_install_id_that_is_not_a_hash():
    with pytest.raises(ValueError):
        build_energy_batch(
            install_id="2206237016",
            slots=[slot_from_history(T0, _history())],
            capacity_kwh=15.36,
            bat_min_pct=20.0,
            charge_kw=2.6,
            integration_version="2.5.0",
        )
