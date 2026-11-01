"""Home 5/6 has its own setup step, which explains the modes and writes nothing.

The window can only be set on the box display: the OIG portal refuses writes to
box_prm2.hgvi_s/e with every value format.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from custom_components.oig_cloud.config import steps as steps_module
from custom_components.oig_cloud.config.steps import WizardMixin
from custom_components.oig_cloud.onboarding.state import ONBOARDING_STEPS

COMPONENT = Path(steps_module.__file__).parents[1]


def _wizard(**data):
    wizard = WizardMixin()
    wizard._wizard_data = data
    return wizard


def test_shown_only_with_the_switch_on():
    assert _wizard(box_has_home56=True)._should_skip_step("wizard_home56") is False
    assert _wizard(box_has_home56=False)._should_skip_step("wizard_home56") is True


def test_wizard_routes_through_the_step():
    assert _wizard(box_has_home56=True)._get_next_step("wizard_battery") == "wizard_home56"


def test_step_count_includes_the_step():
    without = _wizard(box_has_home56=False)._get_total_steps()

    assert _wizard(box_has_home56=True)._get_total_steps() == without + 1
    assert "wizard_home56" in _wizard(box_has_home56=True)._build_step_sequence(False)


def test_onboarding_tracks_the_step():
    assert "home56" in ONBOARDING_STEPS


@pytest.mark.asyncio
async def test_step_stores_nothing():
    wizard = _wizard(box_has_home56=True)
    wizard._step_history = []
    wizard.async_show_form = lambda **kwargs: {"type": "form", **kwargs}
    wizard._get_step_placeholders = lambda *_a, **_k: {}

    async def _next():
        return {"type": "next"}

    wizard.async_step_wizard_summary = _next

    form = await wizard.async_step_wizard_home56()
    assert {str(key) for key in form["data_schema"].schema} == {"go_back"}

    result = await wizard.async_step_wizard_home56({"go_back": False})

    assert result == {"type": "next"}
    assert wizard._wizard_data == {"box_has_home56": True}


@pytest.mark.parametrize(
    "catalog", ["strings.json", "translations/cs.json", "translations/en.json"]
)
def test_catalogs_explain_where_the_window_is_set(catalog):
    data = json.loads((COMPONENT / catalog).read_text(encoding="utf-8"))

    for section in ("config", "options"):
        step = data[section]["step"]["wizard_home56"]
        assert "Home Grid VI" in step["description"]
    assert data["options"]["step"]["init"]["menu_options"]["section_home56"]
