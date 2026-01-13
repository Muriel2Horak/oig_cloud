from __future__ import annotations

import pytest

from custom_components.oig_cloud.const import DOMAIN

pytestmark = pytest.mark.e2e_mock


@pytest.mark.e2e
async def test_auto_mode_switching(e2e_setup):
    hass, _entry = e2e_setup

    services = hass.services.async_services()
    assert "set_box_mode" in services[DOMAIN]

    await hass.services.async_call(
        DOMAIN,
        "set_box_mode",
        {"mode": "Home 2", "acknowledgement": True},
        blocking=True,
    )

    state = hass.states.get("sensor.oig_2206237016_box_prms_mode")
    assert state is not None
