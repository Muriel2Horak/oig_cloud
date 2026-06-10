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
async def test_wizard_battery_invalid_percentile_low():
    flow = DummyWizard()
    result = await flow.async_step_wizard_battery(
        {"charge_rate_kw": 2.8, "expensive_percentile_pct": 40}
    )

    assert result["type"] == "form"
    assert result["errors"]["expensive_percentile_pct"] == "invalid_percentile"


@pytest.mark.asyncio
async def test_wizard_battery_invalid_percentile_high():
    flow = DummyWizard()
    result = await flow.async_step_wizard_battery(
        {"charge_rate_kw": 2.8, "expensive_percentile_pct": 99}
    )

    assert result["type"] == "form"
    assert result["errors"]["expensive_percentile_pct"] == "invalid_percentile"


@pytest.mark.asyncio
async def test_wizard_battery_invalid_charge_rate():
    flow = DummyWizard()
    result = await flow.async_step_wizard_battery(
        {"charge_rate_kw": 0.1, "expensive_percentile_pct": 70}
    )

    assert result["type"] == "form"
    assert result["errors"]["charge_rate_kw"] == "invalid_charge_rate_kw"


