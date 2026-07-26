from __future__ import annotations

from custom_components.oig_cloud.battery_forecast import config as config_module


def test_simulator_config_properties():
    cfg = config_module.SimulatorConfig(max_capacity_kwh=10.0, min_capacity_kwh=2.5)
    assert cfg.usable_capacity_kwh == 7.5


def test_hybrid_config_removed():
    assert not hasattr(config_module, "HybridConfig")


def test_balancing_config_removed():
    assert not hasattr(config_module, "BalancingConfig")
