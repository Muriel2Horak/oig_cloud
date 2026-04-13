"""Backend regression gap tests for shield validation and queue completion.

These tests cover high-risk scenarios that may not be fully tested elsewhere:
1. Suffix `_2` parity in validation - when suffixed entities exist for King/Queen inverters
2. Local proxy + King edge cases - unavailable/malformed data for multi-inverter setups
3. Queue completion false-positive prevention - ensuring completion doesn't falsely succeed
4. Malformed sensor data handling - graceful handling of bad data

This test suite addresses gaps identified in the regression analysis.
"""

from __future__ import annotations

from types import SimpleNamespace
from datetime import datetime

from custom_components.oig_cloud.shield import validation as validation_module
from custom_components.oig_cloud.shield import queue as queue_module
from custom_components.oig_cloud.shield import dispatch as dispatch_module


class DummyState:
    def __init__(self, entity_id, state):
        self.entity_id = entity_id
        self.state = state


class DummyStates:
    def __init__(self, states):
        self._entities = states if isinstance(states, list) else []
        self._map = {s.entity_id: s for s in self._entities}

    def async_all(self, domain=None):
        return self._entities

    def get(self, entity_id):
        return self._map.get(entity_id)


class DummyHass:
    def __init__(self, states):
        self.states = DummyStates(states) if not isinstance(states, DummyStates) else states
        self.data = {"oig_cloud": {}}


class DummyEntry:
    def __init__(self, options=None, data=None):
        self.options = options or {}
        self.data = data or {}


class DummyShield:
    def __init__(self, hass, entry):
        self.hass = hass
        self.entry = entry
        self.last_checked_entity_id = None
        self.queue = []
        self.pending = {}
        self.running = None
        self._is_checking = False

    def _normalize_value(self, val):
        return validation_module.normalize_value(val)


class TestSuffixParityInValidation:
    """Tests for suffix `_2` parity in validation path."""

    def test_find_entity_by_suffix_only_suffixed_entity_exists(self):
        """When only _2 suffixed entity exists (no base), it should be found."""
        entities = [
            DummyState("sensor.oig_123_invertor_prms_to_grid_2", "Omezeno"),
            DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid_2", "500"),
        ]
        hass = DummyHass(entities)
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        result = validation_module._find_entity_by_suffix(
            shield, "123", "_invertor_prms_to_grid"
        )

        assert result == "sensor.oig_123_invertor_prms_to_grid_2"

    def test_find_entity_by_suffix_base_takes_precedence_over_suffixed(self):
        """When both base and _2 exist, base should be preferred."""
        entities = [
            DummyState("sensor.oig_123_invertor_prms_to_grid", "Zapnuto"),
            DummyState("sensor.oig_123_invertor_prms_to_grid_2", "Omezeno"),
        ]
        hass = DummyHass(entities)
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        result = validation_module._find_entity_by_suffix(
            shield, "123", "_invertor_prms_to_grid"
        )

        assert result == "sensor.oig_123_invertor_prms_to_grid"

    def test_extract_expected_grid_mode_with_only_suffixed_entity(self):
        """Mode extraction works when only suffixed entity exists (King inverter)."""
        entities = [
            DummyState("sensor.oig_123_invertor_prms_to_grid_2", "Zapnuto"),
        ]
        hass = DummyHass(entities)
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        result = validation_module.extract_expected_entities(
            shield, "oig_cloud.set_grid_delivery", {"mode": "limited"}
        )

        assert result == {"sensor.oig_123_invertor_prms_to_grid_2": "Omezeno"}

    def test_extract_expected_grid_limit_with_only_suffixed_entity(self):
        """Limit extraction works when only suffixed entity exists (King inverter)."""
        entities = [
            DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid_2", "500"),
        ]
        hass = DummyHass(entities)
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        result = validation_module.extract_expected_entities(
            shield, "oig_cloud.set_grid_delivery", {"limit": 750}
        )

        assert result == {"sensor.oig_123_invertor_prm1_p_max_feed_grid_2": "750"}

    def test_extract_expected_grid_mode_suffixed_when_both_exist(self):
        """Mode extraction uses base entity when both base and suffixed exist."""
        entities = [
            DummyState("sensor.oig_123_invertor_prms_to_grid", "Zapnuto"),
            DummyState("sensor.oig_123_invertor_prms_to_grid_2", "Omezeno"),
        ]
        hass = DummyHass(entities)
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        result = validation_module.extract_expected_entities(
            shield, "oig_cloud.set_grid_delivery", {"mode": "limited"}
        )

        assert result == {"sensor.oig_123_invertor_prms_to_grid": "Omezeno"}


class TestLocalProxyKingEdgeCases:
    """Tests for Local proxy + King edge cases."""

    def test_mode_unavailable_with_suffixed_entity_returns_expected(self):
        """When suffixed mode entity is unavailable, expected value should be returned."""
        entities = [
            DummyState("sensor.oig_123_invertor_prms_to_grid_2", "unavailable"),
        ]
        hass = DummyHass(entities)
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        result = validation_module.extract_expected_entities(
            shield, "oig_cloud.set_grid_delivery", {"mode": "limited"}
        )

        assert result == {"sensor.oig_123_invertor_prms_to_grid_2": "Omezeno"}

    def test_limit_unavailable_with_suffixed_entity_returns_expected(self):
        """When suffixed limit entity is unavailable, expected value should be returned."""
        entities = [
            DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid_2", "unavailable"),
        ]
        hass = DummyHass(entities)
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        result = validation_module.extract_expected_entities(
            shield, "oig_cloud.set_grid_delivery", {"limit": 750}
        )

        assert result == {"sensor.oig_123_invertor_prm1_p_max_feed_grid_2": "750"}

    def test_both_queen_and_king_available_parity_check(self):
        """When both Queen and King are available, base (Queen) takes precedence."""
        entities = [
            DummyState("sensor.oig_123_invertor_prms_to_grid", "Zapnuto"),
            DummyState("sensor.oig_123_invertor_prms_to_grid_2", "Omezeno"),
            DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "1000"),
            DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid_2", "500"),
        ]
        hass = DummyHass(entities)
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        mode_result = validation_module.extract_expected_entities(
            shield, "oig_cloud.set_grid_delivery", {"mode": "limited"}
        )

        limit_result = validation_module.extract_expected_entities(
            shield, "oig_cloud.set_grid_delivery", {"limit": 750}
        )

        assert "sensor.oig_123_invertor_prms_to_grid" in mode_result
        assert "sensor.oig_123_invertor_prm1_p_max_feed_grid" in limit_result


class TestQueueCompletionFalsePositivePrevention:
    """Tests ensuring queue completion does not falsely succeed."""

    def test_limit_step_fails_when_mode_entity_unknown(self):
        """Limit step should not complete when mode entity shows unknown."""
        limit_entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "500")
        mode_entity = DummyState("sensor.oig_123_invertor_prms_to_grid", "unknown")
        hass = DummyHass([limit_entity, mode_entity])
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        info = {
            "entities": {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"},
            "params": {"_grid_delivery_step": "limit", "limit": 500},
            "called_at": datetime.now(),
        }

        result = queue_module._entities_match(
            shield, "oig_cloud.set_grid_delivery", info, 15
        )

        assert result is False

    def test_split_flow_neither_step_completes_when_both_unavailable(self):
        """Neither mode nor limit step should complete when both are unavailable."""
        mode_entity = DummyState("sensor.oig_123_invertor_prms_to_grid", "unavailable")
        limit_entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "unavailable")
        hass = DummyHass([mode_entity, limit_entity])
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        mode_info = {
            "entities": {"sensor.oig_123_invertor_prms_to_grid": "Omezeno"},
            "params": {"_grid_delivery_step": "mode", "mode": "limited"},
            "called_at": datetime.now(),
        }

        limit_info = {
            "entities": {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"},
            "params": {"_grid_delivery_step": "limit", "limit": 500},
            "called_at": datetime.now(),
        }

        mode_result = queue_module._entities_match(
            shield, "oig_cloud.set_grid_delivery", mode_info, 15
        )
        limit_result = queue_module._entities_match(
            shield, "oig_cloud.set_grid_delivery", limit_info, 15
        )

        assert mode_result is False
        assert limit_result is False

    def test_regular_service_not_affected_by_grid_lag_checks(self):
        """Non-grid-delivery services should not be affected by grid lag checks."""
        box_mode = DummyState("sensor.oig_123_box_prms_mode", "Home 1")
        grid_mode = DummyState("sensor.oig_123_invertor_prms_to_grid", "unknown")
        grid_limit = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "unavailable")
        hass = DummyHass([box_mode, grid_mode, grid_limit])
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        info = {
            "entities": {"sensor.oig_123_box_prms_mode": "Home 1"},
            "params": {"mode": "home_1"},
            "called_at": datetime.now(),
        }

        result = queue_module._entities_match(
            shield, "oig_cloud.set_box_mode", info, 15
        )

        assert result is True


class TestMalformedSensorDataHandling:
    """Tests for handling malformed sensor data."""

    def test_mode_entity_non_standard_text_value_returns_expected(self):
        """Mode entity with non-standard text should not match unexpectedly."""
        entity = DummyState("sensor.oig_123_invertor_prms_to_grid", "some weird value")
        hass = DummyHass([entity])
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        result = validation_module.extract_expected_entities(
            shield, "oig_cloud.set_grid_delivery", {"mode": "limited"}
        )

        assert result == {"sensor.oig_123_invertor_prms_to_grid": "Omezeno"}

    def test_limit_entity_malformed_non_numeric_string_returns_expected(self):
        """Limit entity with non-numeric string should not cause crash."""
        entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "not-a-number")
        hass = DummyHass([entity])
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        result = validation_module.extract_expected_entities(
            shield, "oig_cloud.set_grid_delivery", {"limit": 500}
        )

        assert result == {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"}

    def test_limit_entity_float_rounds_correctly(self):
        """Limit entity with float precision should round correctly."""
        entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "500.7")
        hass = DummyHass([entity])
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        result = validation_module.extract_expected_entities(
            shield, "oig_cloud.set_grid_delivery", {"limit": 501}
        )

        assert result == {}

    def test_queue_completion_rejects_mode_with_non_standard_value(self):
        """Queue should not complete when mode has non-standard value during lag."""
        mode_entity = DummyState("sensor.oig_123_invertor_prms_to_grid", "stale-value")
        limit_entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "500")
        hass = DummyHass([mode_entity, limit_entity])
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        info = {
            "entities": {"sensor.oig_123_invertor_prms_to_grid": "Omezeno"},
            "params": {"_grid_delivery_step": "mode", "mode": "limited"},
            "called_at": datetime.now(),
        }

        result = queue_module._entities_match(
            shield, "oig_cloud.set_grid_delivery", info, 15
        )

        assert result is False

    def test_normalize_entity_values_handles_malformed_mode(self):
        """_normalize_entity_values should handle malformed mode gracefully."""
        entity_id = "sensor.oig_123_invertor_prms_to_grid"
        expected = "Omezeno"
        current = "malformed"

        hass = DummyHass([])
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        norm_expected, norm_current = queue_module._normalize_entity_values(
            shield, entity_id, expected, current
        )

        assert norm_expected == "omezeno"
        assert norm_current == "malformed"


class TestSplitTransitionLagHandling:
    """Tests for split transition lag handling."""

    def test_limit_step_rejects_when_mode_shows_wrong_state(self):
        """Limit step should reject when mode shows state inconsistent with limited."""
        mode_entity = DummyState("sensor.oig_123_invertor_prms_to_grid", "Zapnuto")
        limit_entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "500")
        hass = DummyHass([mode_entity, limit_entity])
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        info = {
            "entities": {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"},
            "params": {"_grid_delivery_step": "limit", "limit": 500},
            "called_at": datetime.now(),
        }

        result = queue_module._entities_match(
            shield, "oig_cloud.set_grid_delivery", info, 15
        )

        assert result is False

    def test_limit_step_accepts_when_mode_shows_limited(self):
        """Limit step should accept when mode shows limited."""
        mode_entity = DummyState("sensor.oig_123_invertor_prms_to_grid", "Omezeno")
        limit_entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "500")
        hass = DummyHass([mode_entity, limit_entity])
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        info = {
            "entities": {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"},
            "params": {"_grid_delivery_step": "limit", "limit": 500},
            "called_at": datetime.now(),
        }

        result = queue_module._entities_match(
            shield, "oig_cloud.set_grid_delivery", info, 15
        )

        assert result is True

    def test_transition_lag_window_limit_matches_but_mode_not(self):
        """Edge case: limit matches but mode hasn't updated - should wait."""
        mode_entity = DummyState("sensor.oig_123_invertor_prms_to_grid", "Zapnuto")
        limit_entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "500")
        hass = DummyHass([mode_entity, limit_entity])
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        info = {
            "entities": {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"},
            "params": {"_grid_delivery_step": "limit", "limit": 500},
            "called_at": datetime.now(),
        }

        result = queue_module._entities_match(
            shield, "oig_cloud.set_grid_delivery", info, 15
        )

        assert result is False

    def test_mode_step_rejects_when_mode_not_matching(self):
        """Mode step should reject when mode entity doesn't match expected."""
        mode_entity = DummyState("sensor.oig_123_invertor_prms_to_grid", "Zapnuto")
        limit_entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "500")
        hass = DummyHass([mode_entity, limit_entity])
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        info = {
            "entities": {"sensor.oig_123_invertor_prms_to_grid": "Omezeno"},
            "params": {"_grid_delivery_step": "mode", "mode": "limited"},
            "called_at": datetime.now(),
        }

        result = queue_module._entities_match(
            shield, "oig_cloud.set_grid_delivery", info, 15
        )

        assert result is False

    def test_mode_step_accepts_when_mode_already_matches(self):
        """Mode step should accept when mode entity already matches."""
        mode_entity = DummyState("sensor.oig_123_invertor_prms_to_grid", "Omezeno")
        hass = DummyHass([mode_entity])
        entry = DummyEntry(options={"box_id": "123"})
        shield = DummyShield(hass, entry)

        info = {
            "entities": {"sensor.oig_123_invertor_prms_to_grid": "Omezeno"},
            "params": {"_grid_delivery_step": "mode", "mode": "limited"},
            "called_at": datetime.now(),
        }

        result = queue_module._entities_match(
            shield, "oig_cloud.set_grid_delivery", info, 15
        )

        assert result is True
