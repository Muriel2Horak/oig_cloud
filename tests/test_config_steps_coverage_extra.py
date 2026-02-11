from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.config import steps as steps_module
from custom_components.oig_cloud.config.steps import WizardMixin


class DummyWizard(WizardMixin):
    def __init__(self):
        super().__init__()
        self.hass = SimpleNamespace(
            config=SimpleNamespace(latitude=50.0, longitude=14.0),
            states=SimpleNamespace(get=lambda _eid: None),
        )

    def async_show_form(self, **kwargs):
        return {"type": "form", **kwargs}

    async def async_step_wizard_summary(self, user_input=None):
        return {"type": "summary", "data": dict(self._wizard_data)}


def test_migrate_import_percentage_single_tariff_branch():
    migrated = {}
    data = {"spot_positive_fee_percent": 12.0, "spot_negative_fee_percent": 8.0}

    WizardMixin._migrate_import_percentage(data, migrated, dual_tariff=False)

    assert migrated["import_pricing_scenario"] == "spot_percentage_1tariff"
    assert migrated["import_spot_positive_fee_percent"] == 12.0
    assert migrated["import_spot_negative_fee_percent"] == 8.0


@pytest.mark.asyncio
async def test_wizard_battery_invalid_hysteresis_and_hold_hours():
    flow = DummyWizard()
    result = await flow.async_step_wizard_battery(
        {
            "min_capacity_percent": 20.0,
            "target_capacity_percent": 80.0,
            "max_ups_price_czk": 10.0,
            "price_hysteresis_czk": -0.1,
            "hw_min_hold_hours": 0.5,
        }
    )

    assert result["type"] == "form"
    assert result["errors"]["price_hysteresis_czk"] == "invalid_hysteresis"
    assert result["errors"]["hw_min_hold_hours"] == "invalid_hours"


@pytest.mark.asyncio
async def test_wizard_battery_hysteresis_too_high():
    flow = DummyWizard()
    result = await flow.async_step_wizard_battery(
        {
            "min_capacity_percent": 20.0,
            "target_capacity_percent": 80.0,
            "max_ups_price_czk": 10.0,
            "price_hysteresis_czk": 6.0,
        }
    )

    assert result["type"] == "form"
    assert result["errors"]["price_hysteresis_czk"] == "invalid_hysteresis"


@pytest.mark.asyncio
async def test_wizard_battery_hw_min_hold_hours_too_high():
    flow = DummyWizard()
    result = await flow.async_step_wizard_battery(
        {
            "min_capacity_percent": 20.0,
            "target_capacity_percent": 80.0,
            "max_ups_price_czk": 10.0,
            "hw_min_hold_hours": 25.0,
        }
    )

    assert result["type"] == "form"
    assert result["errors"]["hw_min_hold_hours"] == "invalid_hours"
