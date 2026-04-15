from __future__ import annotations

from datetime import datetime

import pytest

from custom_components.oig_cloud.core.local_mapper import LocalUpdateApplier
from custom_components.oig_cloud.entities.data_sensor import (
    GridDeliveryLiveState,
    resolve_grid_delivery_live_state,
)


BOX_ID = "2206237016"

SWITCH_TO_GRID = f"switch.oig_local_{BOX_ID}_tbl_invertor_prms_to_grid_cfg"
NUMBER_P_MAX_FEED_GRID = f"number.oig_local_{BOX_ID}_tbl_invertor_prm1_p_max_feed_grid_cfg"
SWITCH_CRCT = f"switch.oig_local_{BOX_ID}_tbl_box_prms_crct_cfg"
SELECT_MODE = f"select.oig_local_{BOX_ID}_tbl_box_prms_mode_cfg"


class TestGridDeliveryProxySemantics:
    @pytest.fixture
    def applier(self):
        return LocalUpdateApplier(BOX_ID)

    @pytest.fixture
    def now(self):
        return datetime.now()

    def _build_payload(self, applier, now):
        payload = {}

        def _apply(entity_id, state):
            changed = applier.apply_state(payload, entity_id, state, now)
            assert changed is True, f"Expected {entity_id} to change payload"

        return payload, _apply

    def test_grid_delivery_off_via_proxy_controls(self, applier, now):
        payload, apply = self._build_payload(applier, now)
        apply(SWITCH_CRCT, 1)
        apply(SWITCH_TO_GRID, "off")
        apply(NUMBER_P_MAX_FEED_GRID, 10000)

        result = resolve_grid_delivery_live_state(payload[BOX_ID])
        assert result == GridDeliveryLiveState(mode="off", limit=0)

    def test_grid_delivery_on_via_proxy_controls(self, applier, now):
        payload, apply = self._build_payload(applier, now)
        apply(SWITCH_CRCT, 1)
        apply(SWITCH_TO_GRID, "on")
        apply(NUMBER_P_MAX_FEED_GRID, 10000)

        result = resolve_grid_delivery_live_state(payload[BOX_ID])
        assert result == GridDeliveryLiveState(mode="on", limit=10000)

    def test_grid_delivery_limited_via_proxy_controls(self, applier, now):
        payload, apply = self._build_payload(applier, now)
        apply(SWITCH_CRCT, 1)
        apply(SWITCH_TO_GRID, "on")
        apply(NUMBER_P_MAX_FEED_GRID, 5000)

        result = resolve_grid_delivery_live_state(payload[BOX_ID])
        assert result == GridDeliveryLiveState(mode="limited", limit=5000)


class TestNonGridProxySemantics:
    def test_box_mode_applied_via_select_control_cfg(self):
        applier = LocalUpdateApplier(BOX_ID)
        payload = {}
        now = datetime.now()

        changed = applier.apply_state(payload, SELECT_MODE, "Home 2", now)
        assert changed is True
        assert payload[BOX_ID]["box_prms"]["mode"] == 1
