from __future__ import annotations

from custom_components.oig_cloud.const import HOME_I, HOME_II
from custom_components.oig_cloud.physics import simulate_interval


def _base_kwargs():
    return {
        "solar_kwh": 0.0,
        "load_kwh": 0.0,
        "battery_soc_kwh": 1.0,
        "capacity_kwh": 10.0,
        "hw_min_capacity_kwh": 0.0,
        "charge_efficiency": 1.0,
        "discharge_efficiency": 1.0,
        "home_charge_rate_kwh_15min": 0.0,
    }


def test_home_i_grid_import_on_remaining_deficit():
    kwargs = _base_kwargs()
    kwargs.update({"solar_kwh": 0.5, "load_kwh": 2.0, "battery_soc_kwh": 1.0})
    result = simulate_interval(mode=HOME_I, **kwargs)
    assert result.grid_import_kwh > 0


def test_night_optimization_uses_battery_and_grid():
    kwargs = _base_kwargs()
    kwargs.update({"solar_kwh": 0.0, "load_kwh": 2.0, "battery_soc_kwh": 1.0})
    result = simulate_interval(mode=HOME_I, **kwargs)
    assert result.battery_discharge_kwh > 0
    assert result.grid_import_kwh > 0


def test_home_i_surplus_charges_and_exports():
    kwargs = _base_kwargs()
    kwargs.update({"solar_kwh": 5.0, "load_kwh": 0.0, "battery_soc_kwh": 9.9})
    result = simulate_interval(mode=HOME_I, **kwargs)
    assert result.battery_charge_kwh > 0
    assert result.grid_export_kwh > 0


def test_home_ii_grid_export_on_remaining_surplus():
    kwargs = _base_kwargs()
    kwargs.update({"solar_kwh": 2.0, "load_kwh": 0.0, "battery_soc_kwh": 9.9})
    result = simulate_interval(mode=HOME_II, **kwargs)
    assert result.grid_export_kwh > 0


def test_home_ii_deficit_imports_from_grid():
    kwargs = _base_kwargs()
    kwargs.update({"solar_kwh": 0.2, "load_kwh": 1.0})
    result = simulate_interval(mode=HOME_II, **kwargs)
    assert result.grid_import_kwh > 0


def test_home_iii_charges_and_exports():
    kwargs = _base_kwargs()
    kwargs.update({"solar_kwh": 2.0, "load_kwh": 1.0, "battery_soc_kwh": 9.9})
    result = simulate_interval(mode=2, **kwargs)
    assert result.battery_charge_kwh > 0
    assert result.grid_export_kwh > 0
    assert result.grid_import_kwh > 0


def test_home_ups_charges_from_solar_and_grid():
    kwargs = _base_kwargs()
    kwargs.update(
        {
            "solar_kwh": 0.2,
            "load_kwh": 1.0,
            "battery_soc_kwh": 9.0,
            "home_charge_rate_kwh_15min": 0.5,
        }
    )
    result = simulate_interval(mode=3, **kwargs)
    assert result.battery_charge_kwh > 0
    assert result.grid_charge_kwh > 0
    assert result.grid_import_kwh > 0


def test_home_ups_exports_remaining_solar():
    kwargs = _base_kwargs()
    kwargs.update(
        {
            "solar_kwh": 2.0,
            "load_kwh": 0.0,
            "battery_soc_kwh": 9.5,
            "home_charge_rate_kwh_15min": 0.5,
        }
    )
    result = simulate_interval(mode=3, **kwargs)
    assert result.grid_export_kwh > 0


def test_unknown_mode_falls_back_to_home_i():
    kwargs = _base_kwargs()
    kwargs.update({"solar_kwh": 1.0, "load_kwh": 0.5})
    result_unknown = simulate_interval(mode=999, **kwargs)
    result_home_i = simulate_interval(mode=HOME_I, **kwargs)
    assert result_unknown == result_home_i
