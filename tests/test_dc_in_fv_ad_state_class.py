"""State-class contract for ``dc_in_fv_ad`` (PV Output Today).

``dc_in_fv_ad`` reads the inverter's ``dc_in.fv_ad`` node -- "FVE aktual
denni", the daily photovoltaic production accumulator in watt-hours. It is a
*periodic accumulator*: it resets to 0 at midnight and the inverter may
re-aggregate the running daily total downward by a small amount during the
day (the recorder saw it decrease by ~3 units in production).

HA semantics:
  - ``TOTAL_INCREASING`` is for monotonic meters -- any decrease is treated as
    a meter reset and fragments the sum. Wrong for a daily accumulator that
    can dip a few Wh: the Energy Dashboard would split the day into spurious
    sub-totals and the recorder logs a state-class violation on each dip.
  - ``TOTAL`` records the value verbatim and lets the dashboard sum deltas,
    handling the midnight reset at the day boundary. Correct for a daily
    accumulator.

Every other daily/monthly/yearly energy accumulator in this integration
(battery charge/discharge today, this month, this year, ...) already declares
``TOTAL``. ``dc_in_fv_ad`` is the sole daily accumulator mis-declared as
``TOTAL_INCREASING``.
"""
from __future__ import annotations

from homeassistant.components.sensor import SensorStateClass

from custom_components.oig_cloud.sensors.SENSOR_TYPES_DC_IN import (
    SENSOR_TYPES_DC_IN,
)


def _config():
    cfg = SENSOR_TYPES_DC_IN["dc_in_fv_ad"]
    assert cfg is not None, "dc_in_fv_ad missing from SENSOR_TYPES_DC_IN"
    return cfg


def test_dc_in_fv_ad_is_daily_accumulator_source():
    """Confirm the source mapping: dc_in.fv_ad, energy in Wh."""
    cfg = _config()
    assert cfg["node_id"] == "dc_in"
    assert cfg["node_key"] == "fv_ad"
    from homeassistant.components.sensor import SensorDeviceClass
    from homeassistant.const import UnitOfEnergy

    assert cfg["device_class"] == SensorDeviceClass.ENERGY
    assert cfg["unit_of_measurement"] == UnitOfEnergy.WATT_HOUR


def test_dc_in_fv_ad_uses_total_not_total_increasing():
    """A daily accumulator must be TOTAL, never TOTAL_INCREASING."""
    cfg = _config()
    assert cfg["state_class"] == SensorStateClass.TOTAL, (
        "dc_in_fv_ad is a daily accumulator (resets at midnight, may dip a few "
        "Wh during re-aggregation). TOTAL_INCREASING mis-treats any decrease as "
        "a meter reset, fragmenting the Energy Dashboard and tripping the "
        "recorder state-class warning."
    )


def test_dc_in_fv_ad_daily_siblings_use_total():
    """Every daily/monthly/yearly energy accumulator in the integration is TOTAL.

    Guards consistency: dc_in_fv_ad must match its siblings' contract, so a
    future revert to TOTAL_INCREASING fails alongside any sibling change.
    """
    from custom_components.oig_cloud.sensor_types import SENSOR_TYPES
    from homeassistant.components.sensor import SensorDeviceClass

    daily_accumulators = {
        key
        for key, conf in SENSOR_TYPES.items()
        if conf.get("device_class") == SensorDeviceClass.ENERGY
        and conf.get("sensor_type_category") == "computed"
        and ("today" in (conf.get("name", "") or "").lower()
             or "this month" in (conf.get("name", "") or "").lower()
             or "this year" in (conf.get("name", "") or "").lower())
    }
    assert daily_accumulators, "expected sibling daily accumulators for comparison"
    for key in daily_accumulators:
        assert SENSOR_TYPES[key]["state_class"] == SensorStateClass.TOTAL, (
            f"{key} daily accumulator must be TOTAL, not "
            f"{SENSOR_TYPES[key]['state_class']}"
        )
