from __future__ import annotations

import pytest

from custom_components.oig_cloud.config import steps as steps_module
from custom_components.oig_cloud.config.steps import WizardMixin


class DummyWizard(WizardMixin):
    def __init__(self):
        super().__init__()
        self._wizard_data = {}
        self._step_history = []
        self._current_step = None

    def async_show_form(self, **kwargs):
        return {"type": "form", "step_id": kwargs.get("step_id", "dummy")}

    async def _handle_back_button(self, step: str):
        return {"type": "form", "step_id": step}

    def _get_next_step(self, current_step: str) -> str:
        return current_step.replace("wizard_", "")

    async def async_step_boiler(self):
        return {"type": "form", "step_id": "boiler"}


@pytest.mark.asyncio
async def test_async_step_wizard_boiler_with_go_back(monkeypatch):
    wizard = DummyWizard()

    result = await wizard.async_step_wizard_boiler({"go_back": True})
    
    assert result["type"] == "form"
    assert result["step_id"] == "wizard_boiler"


@pytest.mark.asyncio
async def test_async_step_wizard_boiler_with_user_input(monkeypatch):
    wizard = DummyWizard()
    
    user_input = {
        "boiler_volume_l": 200.0,
        "boiler_heater_power_kw": 3.0,
    }
    
    result = await wizard.async_step_wizard_boiler(user_input)
    
    assert "boiler_volume_l" in wizard._wizard_data
    assert "boiler_heater_power_kw" in wizard._wizard_data
    assert "wizard_boiler" in wizard._step_history
