"""Tests for resolve_grid_delivery_live_state helper."""
from __future__ import annotations

import pytest

from custom_components.oig_cloud.entities.data_sensor import (
    GridDeliveryLiveState,
    resolve_grid_delivery_live_state,
)


class TestResolveGridDeliveryLiveState:
    """Test canonical grid-delivery live-state resolver."""

    # ========== King (non-queen) Tests ==========

    def test_king_off_via_grid_enabled(self):
        """King: grid_enabled=0 should return off."""
        raw = {
            "box_prms": {"crcte": 0},
            "invertor_prm1": {"p_max_feed_grid": 15000},
            "invertor_prms": {"to_grid": 1},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="off", limit=0)

    def test_king_off_via_to_grid(self):
        """King: to_grid=0 should return off."""
        raw = {
            "box_prms": {"crcte": 1},
            "invertor_prm1": {"p_max_feed_grid": 15000},
            "invertor_prms": {"to_grid": 0},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="off", limit=0)

    def test_king_on(self):
        """King: to_grid=1 and p_max_feed_grid >= 10000 should return on."""
        raw = {
            "box_prms": {"crcte": 1},
            "invertor_prm1": {"p_max_feed_grid": 15000},
            "invertor_prms": {"to_grid": 1},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="on", limit=15000)

    def test_king_limited(self):
        """King: to_grid=1 and p_max_feed_grid <= 9999 should return limited."""
        raw = {
            "box_prms": {"crcte": 1},
            "invertor_prm1": {"p_max_feed_grid": 5000},
            "invertor_prms": {"to_grid": 1},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="limited", limit=5000)

    def test_king_limited_at_boundary(self):
        """King: p_max_feed_grid=9999 should return limited."""
        raw = {
            "box_prms": {"crcte": 1},
            "invertor_prm1": {"p_max_feed_grid": 9999},
            "invertor_prms": {"to_grid": 1},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="limited", limit=9999)

    def test_king_on_at_boundary(self):
        """King: p_max_feed_grid=10000 should return on."""
        raw = {
            "box_prms": {"crcte": 1},
            "invertor_prm1": {"p_max_feed_grid": 10000},
            "invertor_prms": {"to_grid": 1},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="on", limit=10000)

    def test_king_uses_crct_fallback(self):
        """King: should fall back to crct when crcte is missing."""
        raw = {
            "box_prms": {"crct": 1},
            "invertor_prm1": {"p_max_feed_grid": 5000},
            "invertor_prms": {"to_grid": 1},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="limited", limit=5000)

    # ========== Queen Tests ==========

    def test_queen_off(self):
        """Queen: to_grid=0 and p_max_feed_grid=0 should return off."""
        raw = {
            "queen": True,
            "box_prms": {"crcte": 1},
            "invertor_prm1": {"p_max_feed_grid": 0},
            "invertor_prms": {"to_grid": 0},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="off", limit=0)

    def test_queen_limited(self):
        """Queen: to_grid=0 and p_max_feed_grid>0 should return limited."""
        raw = {
            "queen": True,
            "box_prms": {"crcte": 1},
            "invertor_prm1": {"p_max_feed_grid": 3000},
            "invertor_prms": {"to_grid": 0},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="limited", limit=3000)

    def test_queen_on(self):
        """Queen: to_grid=1 should return on."""
        raw = {
            "queen": True,
            "box_prms": {"crcte": 1},
            "invertor_prm1": {"p_max_feed_grid": 5000},
            "invertor_prms": {"to_grid": 1},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="on", limit=5000)

    # ========== Unknown Tests ==========

    def test_unknown_missing_box_prms(self):
        """Missing box_prms should return unknown."""
        raw = {
            "invertor_prm1": {"p_max_feed_grid": 5000},
            "invertor_prms": {"to_grid": 1},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="unknown", limit=None)

    def test_unknown_missing_crcte_and_crct(self):
        """Missing both crcte and crct should return unknown."""
        raw = {
            "box_prms": {},
            "invertor_prm1": {"p_max_feed_grid": 5000},
            "invertor_prms": {"to_grid": 1},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="unknown", limit=None)

    def test_unknown_missing_invertor_prm1(self):
        """Missing invertor_prm1 should return unknown."""
        raw = {
            "box_prms": {"crcte": 1},
            "invertor_prms": {"to_grid": 1},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="unknown", limit=None)

    def test_unknown_missing_p_max_feed_grid(self):
        """Missing p_max_feed_grid should return unknown."""
        raw = {
            "box_prms": {"crcte": 1},
            "invertor_prm1": {},
            "invertor_prms": {"to_grid": 1},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="unknown", limit=None)

    def test_unknown_missing_invertor_prms(self):
        """Missing invertor_prms should return unknown."""
        raw = {
            "box_prms": {"crcte": 1},
            "invertor_prm1": {"p_max_feed_grid": 5000},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="unknown", limit=None)

    def test_unknown_missing_to_grid(self):
        """Missing to_grid should return unknown."""
        raw = {
            "box_prms": {"crcte": 1},
            "invertor_prm1": {"p_max_feed_grid": 5000},
            "invertor_prms": {},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="unknown", limit=None)

    def test_unknown_non_numeric_values(self):
        """Non-numeric values should return unknown."""
        raw = {
            "box_prms": {"crcte": "invalid"},
            "invertor_prm1": {"p_max_feed_grid": 5000},
            "invertor_prms": {"to_grid": 1},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="unknown", limit=None)

    def test_unknown_none_values(self):
        """None values should return unknown."""
        raw = {
            "box_prms": {"crcte": None},
            "invertor_prm1": {"p_max_feed_grid": 5000},
            "invertor_prms": {"to_grid": 1},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="unknown", limit=None)

    def test_unknown_empty_raw_values(self):
        """Empty dict should return unknown."""
        result = resolve_grid_delivery_live_state({})
        assert result == GridDeliveryLiveState(mode="unknown", limit=None)

    # ========== Edge Cases ==========

    def test_queen_with_boolean_true(self):
        """Queen flag as boolean True should work."""
        raw = {
            "queen": True,
            "box_prms": {"crcte": 1},
            "invertor_prm1": {"p_max_feed_grid": 5000},
            "invertor_prms": {"to_grid": 1},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result["mode"] == "on"

    def test_queen_with_int_one(self):
        """Queen flag as integer 1 should work."""
        raw = {
            "queen": 1,
            "box_prms": {"crcte": 1},
            "invertor_prm1": {"p_max_feed_grid": 5000},
            "invertor_prms": {"to_grid": 1},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result["mode"] == "on"

    def test_invalid_to_grid_value(self):
        """to_grid value other than 0 or 1 should return unknown."""
        raw = {
            "box_prms": {"crcte": 1},
            "invertor_prm1": {"p_max_feed_grid": 5000},
            "invertor_prms": {"to_grid": 2},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="unknown", limit=None)

    def test_zero_limit_is_valid(self):
        """Limit of 0 should be valid for off state."""
        raw = {
            "box_prms": {"crcte": 0},
            "invertor_prm1": {"p_max_feed_grid": 0},
            "invertor_prms": {"to_grid": 0},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="off", limit=0)

    def test_string_numbers_parsed(self):
        """String numeric values should be parsed correctly."""
        raw = {
            "box_prms": {"crcte": "1"},
            "invertor_prm1": {"p_max_feed_grid": "5000"},
            "invertor_prms": {"to_grid": "1"},
        }
        result = resolve_grid_delivery_live_state(raw)
        assert result == GridDeliveryLiveState(mode="limited", limit=5000)
