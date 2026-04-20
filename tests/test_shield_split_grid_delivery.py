"""Tests for ordered split grid-delivery flow in ServiceShield.

These tests verify that:
1. set_grid_delivery(mode+limit) is split into two ordered steps
2. Mode=limited is ALWAYS first
3. Numeric limit is ALWAYS second
4. The limit step is NOT skipped due to intermediate state
5. Step metadata is properly tracked
"""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

from custom_components.oig_cloud.shield import dispatch as dispatch_module
from custom_components.oig_cloud.shield import validation as validation_module
from custom_components.oig_cloud.shield import queue as queue_module


class DummyState:
    def __init__(self, entity_id, state):
        self.entity_id = entity_id
        self.state = state


class DummyStates:
    def __init__(self, states):
        self._states = {state.entity_id: state for state in states}

    def get(self, entity_id):
        return self._states.get(entity_id)

    def async_all(self, domain=None):
        if domain is None:
            return list(self._states.values())
        prefix = f"{domain}."
        return [state for entity_id, state in self._states.items() if entity_id.startswith(prefix)]


class DummyHass:
    def __init__(self, states):
        self.states = states
        self.data = {"oig_cloud": {}}

    def async_create_task(self, task):
        return task


class DummyShield:
    def __init__(self, hass, entry):
        self.hass = hass
        self.entry = entry
        self.last_checked_entity_id = None
        self.queue = []
        self.pending = {}
        self.running = None
        self.queue_metadata = {}
        self._is_checking = False

    def _normalize_value(self, val):
        return validation_module.normalize_value(val)


class DummyInterceptShield(DummyShield):
    def __init__(self, hass, entry):
        super().__init__(hass, entry)
        self.extract_expected_entities = lambda _service_name, _params: {
            "sensor.oig_123_box_prms_mode": "Home 1"
        }
        self._extract_api_info = lambda _service_name, _params: {}
        self._log_security_event = lambda *_args, **_kwargs: None
        self._notify_state_change = lambda: None
        self._check_loop = lambda _when: None
        self._log_event = AsyncMock()
        self._log_telemetry = AsyncMock()


class TestSplitGridDeliveryParams:
    """Tests for _split_grid_delivery_params function."""

    def test_split_both_mode_and_limit(self):
        """When both mode and limit are present, split into ordered steps."""
        params = {"mode": "limited", "limit": 500, "acknowledgement": True, "warning": True}

        result = dispatch_module._split_grid_delivery_params(params)

        assert result is not None
        assert len(result) == 2

        # Step 1: Mode only, with step metadata
        step1 = result[0]
        assert "limit" not in step1
        assert step1["mode"] == "limited"
        assert step1["_grid_delivery_step"] == "mode"
        assert step1["acknowledgement"] is True

        # Step 2: Limit only, with step metadata
        step2 = result[1]
        assert "mode" not in step2
        assert step2["limit"] == 500
        assert step2["_grid_delivery_step"] == "limit"
        assert step2["warning"] is True

    def test_split_preserves_other_params(self):
        """Splitting preserves all other parameters."""
        params = {"mode": "limited", "limit": 1000, "device_id": "123", "acknowledgement": True, "warning": True}

        result = dispatch_module._split_grid_delivery_params(params)

        assert result is not None
        assert len(result) == 2

        # Both steps should preserve device_id
        assert result[0]["device_id"] == "123"
        assert result[1]["device_id"] == "123"

    def test_no_split_when_only_mode(self):
        """When only mode is present, no split occurs."""
        params = {"mode": "on"}

        result = dispatch_module._split_grid_delivery_params(params)

        assert result is None

    def test_no_split_when_only_limit(self):
        """When only limit is present, no split occurs."""
        params = {"limit": 500}

        result = dispatch_module._split_grid_delivery_params(params)

        assert result is None


class TestEntitiesAlreadyMatch:
    """Tests for _entities_already_match with grid delivery step handling."""

    def test_limit_step_never_skipped_early(self):
        """Limit step (step 2) should NOT be skipped even if entities match."""
        entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "500")
        hass = DummyHass(DummyStates([entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        # Even though current value matches expected, limit step should NOT skip
        expected_entities = {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"}
        params = {"_grid_delivery_step": "limit", "limit": 500}

        result = dispatch_module._entities_already_match(shield, expected_entities, params)

        # Should return False (don't skip) because this is a limit step
        assert result is False

    def test_regular_step_can_skip_if_matches(self):
        """Regular steps (not limit step) can skip if entities already match."""
        entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "500")
        hass = DummyHass(DummyStates([entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        expected_entities = {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"}
        params = {"limit": 500}  # No step metadata

        result = dispatch_module._entities_already_match(shield, expected_entities, params)

        # Should return True (skip) because values match and it's not a special step
        assert result is True

    def test_mode_step_can_skip_if_matches(self):
        """Mode step can skip if entities already match."""
        entity = DummyState("sensor.oig_123_invertor_prms_to_grid", "Omezeno")
        hass = DummyHass(DummyStates([entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        expected_entities = {"sensor.oig_123_invertor_prms_to_grid": "Omezeno"}
        params = {"_grid_delivery_step": "mode", "mode": "limited"}

        result = dispatch_module._entities_already_match(shield, expected_entities, params)

        # Mode step can skip if already matching
        assert result is True

    def test_no_params_regular_behavior(self):
        """When no params passed, regular behavior (for backward compat)."""
        entity = DummyState("sensor.oig_123_box_prms_mode", "Home 2")
        hass = DummyHass(DummyStates([entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        expected_entities = {"sensor.oig_123_box_prms_mode": "Home 2"}

        result = dispatch_module._entities_already_match(shield, expected_entities)

        assert result is True


class TestExpectedGridDeliveryValidation:
    """Tests for validation module grid delivery handling."""

    def test_expected_grid_delivery_mode_with_step_metadata(self):
        """Mode extraction includes step metadata in logging."""
        entity = DummyState("sensor.oig_123_invertor_prms_to_grid", "Zapnuto")
        hass = DummyHass(DummyStates([entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        def find_entity(suffix):
            if suffix == "_invertor_prms_to_grid":
                return "sensor.oig_123_invertor_prms_to_grid"
            return None

        data = {"mode": "limited", "_grid_delivery_step": "mode"}
        result = validation_module._expected_grid_delivery_mode(shield, data, find_entity)

        assert result == {"sensor.oig_123_invertor_prms_to_grid": "Omezeno"}

    def test_expected_grid_delivery_limit_with_step_metadata(self):
        """Limit extraction includes step metadata in logging."""
        entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "200")
        hass = DummyHass(DummyStates([entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        def find_entity(suffix):
            if suffix == "_invertor_prm1_p_max_feed_grid":
                return "sensor.oig_123_invertor_prm1_p_max_feed_grid"
            return None

        data = {"limit": 500, "_grid_delivery_step": "limit"}
        result = validation_module._expected_grid_delivery_limit(shield, data, find_entity)

        assert result == {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"}

    def test_expected_grid_delivery_mode_skips_if_already_match(self):
        """Mode extraction returns empty if already in desired state."""
        entity = DummyState("sensor.oig_123_invertor_prms_to_grid", "Omezeno")
        hass = DummyHass(DummyStates([entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        def find_entity(suffix):
            if suffix == "_invertor_prms_to_grid":
                return "sensor.oig_123_invertor_prms_to_grid"
            return None

        data = {"mode": "limited"}
        result = validation_module._expected_grid_delivery_mode(shield, data, find_entity)

        # Already Omezeno, so no change needed
        assert result == {}


class TestQueueEntitiesMatch:
    """Tests for _entities_match in queue module with grid delivery."""

    def test_entities_match_logs_grid_step(self, caplog):
        """Queue entities_match logs grid delivery step when present."""
        import logging

        entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "500")
        hass = DummyHass(DummyStates([entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        info = {
            "entities": {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"},
            "params": {"_grid_delivery_step": "limit", "limit": 500},
            "called_at": __import__('datetime').datetime.now(),
        }

        # Set logging level to capture INFO logs
        with caplog.at_level(logging.INFO):
            result = queue_module._entities_match(
                shield, "oig_cloud.set_grid_delivery", info, 15
            )

        # Should match since values are equal
        assert result is True
        # Step info should be logged
        assert "Grid delivery split step detected: limit" in caplog.text


class TestIntegrationSplitFlow:
    """Integration tests for the complete split flow."""

    def test_split_flow_ordering(self):
        """Verify split flow always orders mode before limit."""
        # This test verifies the internal structure without full async execution
        params = {"mode": "limited", "limit": 750, "acknowledgement": True, "warning": True}

        result = dispatch_module._split_grid_delivery_params(params)

        assert result is not None
        assert len(result) == 2

        # First step MUST be mode
        assert result[0]["_grid_delivery_step"] == "mode"
        assert "mode" in result[0]
        assert "limit" not in result[0]

        # Second step MUST be limit
        assert result[1]["_grid_delivery_step"] == "limit"
        assert "limit" in result[1]
        assert "mode" not in result[1]

    def test_step_metadata_preserved_through_validation(self):
        """Step metadata is preserved through validation."""
        entity1 = DummyState("sensor.oig_123_invertor_prms_to_grid", "Zapnuto")
        entity2 = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "200")
        hass = DummyHass(DummyStates([entity1, entity2]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        # Test mode step
        mode_data = {"mode": "limited", "_grid_delivery_step": "mode"}
        mode_result = validation_module._expected_grid_delivery(shield, mode_data, lambda s: f"sensor.oig_123{s}")

        assert mode_result == {"sensor.oig_123_invertor_prms_to_grid": "Omezeno"}

        # Test limit step
        limit_data = {"limit": 500, "_grid_delivery_step": "limit"}
        limit_result = validation_module._expected_grid_delivery(shield, limit_data, lambda s: f"sensor.oig_123{s}")

        assert limit_result == {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"}

    def test_handle_split_grid_delivery_queues_both_steps_in_order(self, monkeypatch):
        """Split handler forwards mode step first and limit step second."""
        hass = DummyHass(DummyStates([]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)
        recorded_calls = []

        async def fake_intercept(*args):
            recorded_calls.append(args[3]["params"])

        monkeypatch.setattr(dispatch_module, "intercept_service_call", fake_intercept)

        result = asyncio.run(
            dispatch_module._handle_split_grid_delivery(
                shield,
                "oig_cloud",
                "set_grid_delivery",
                {"mode": "limited", "limit": 750, "acknowledgement": True, "warning": True},
                AsyncMock(),
                False,
                None,
            )
        )

        assert result is True
        assert recorded_calls == [
            {"mode": "limited", "acknowledgement": True, "warning": True, "_grid_delivery_step": "mode"},
            {"limit": 750, "acknowledgement": True, "warning": True, "_grid_delivery_step": "limit"},
        ]

    def test_intercept_service_call_skips_when_entities_already_match(self):
        """Intercept logs skipped telemetry/event when target state is already reached."""
        entity = DummyState("sensor.oig_123_box_prms_mode", "Home 1")
        hass = DummyHass(DummyStates([entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyInterceptShield(hass, entry)
        original_call = AsyncMock()

        asyncio.run(
            dispatch_module.intercept_service_call(
                shield,
                "oig_cloud",
                "set_box_mode",
                {"params": {"mode": "home_1"}},
                original_call,
                False,
                None,
            )
        )

        original_call.assert_not_awaited()
        shield._log_telemetry.assert_not_awaited()
        shield._log_event.assert_awaited_once()

        event_call = shield._log_event.await_args

        assert event_call is not None

        event_payload = event_call.args[2]

        assert event_call.args[0] == "skipped"
        assert event_payload["entities"] == {"sensor.oig_123_box_prms_mode": "Home 1"}


class TestIsDuplicate:
    """Tests for _is_duplicate function - checks queue and pending for duplicate services."""

    def test_duplicate_in_queue(self):
        """When same service/params/entities found in queue, return 'queue'."""
        entity = DummyState("sensor.oig_123_box_prms_mode", "Home 1")
        hass = DummyHass(DummyStates([entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        shield.queue.append((
            "oig_cloud.set_box_mode",
            {"mode": "home_1"},
            {"sensor.oig_123_box_prms_mode": "Home 1"},
            None,
            "switch",
            "oig_cloud.set_box_mode",
            False,
            None,
        ))

        result = dispatch_module._is_duplicate(
            shield,
            "oig_cloud.set_box_mode",
            {"mode": "home_1"},
            {"sensor.oig_123_box_prms_mode": "Home 1"},
        )

        assert result == "queue"


class TestQueueTelemetryLagHandling:
    """Regression tests for queue completion with telemetry lag / mismatch windows."""

    def test_limit_step_not_complete_when_mode_not_limited(self):
        """Limit step must wait when mode sensor hasn't updated to 'limited' yet."""
        limit_entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "500")
        mode_entity = DummyState("sensor.oig_123_invertor_prms_to_grid", "Zapnuto")
        hass = DummyHass(DummyStates([limit_entity, mode_entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        info = {
            "entities": {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"},
            "params": {"_grid_delivery_step": "limit", "limit": 500},
            "called_at": __import__('datetime').datetime.now(),
        }

        result = queue_module._entities_match(
            shield, "oig_cloud.set_grid_delivery", info, 15
        )

        # Should NOT complete because mode is still "Zapnuto", not "Omezeno"
        assert result is False

    def test_limit_step_completes_when_mode_is_limited(self):
        """Limit step can complete when mode already shows 'limited'."""
        limit_entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "500")
        mode_entity = DummyState("sensor.oig_123_invertor_prms_to_grid", "Omezeno")
        hass = DummyHass(DummyStates([limit_entity, mode_entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        info = {
            "entities": {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"},
            "params": {"_grid_delivery_step": "limit", "limit": 500},
            "called_at": __import__('datetime').datetime.now(),
        }

        result = queue_module._entities_match(
            shield, "oig_cloud.set_grid_delivery", info, 15
        )

        # Should complete because limit matches AND mode is already "Omezeno"
        assert result is True

    def test_limit_step_completes_when_mode_entity_missing(self):
        """Limit step can complete when mode entity doesn't exist (backward compat)."""
        limit_entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "500")
        hass = DummyHass(DummyStates([limit_entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        info = {
            "entities": {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"},
            "params": {"_grid_delivery_step": "limit", "limit": 500},
            "called_at": __import__('datetime').datetime.now(),
        }

        result = queue_module._entities_match(
            shield, "oig_cloud.set_grid_delivery", info, 15
        )

        assert result is True

    def test_unavailable_value_prevents_completion(self):
        """Unavailable current value must not cause false completion."""
        limit_entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "unavailable")
        hass = DummyHass(DummyStates([limit_entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        info = {
            "entities": {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"},
            "params": {"_grid_delivery_step": "limit", "limit": 500},
            "called_at": __import__('datetime').datetime.now(),
        }

        result = queue_module._entities_match(
            shield, "oig_cloud.set_grid_delivery", info, 15
        )

        assert result is False

    def test_unknown_value_prevents_completion(self):
        """Unknown current value must not cause false completion."""
        limit_entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "unknown")
        hass = DummyHass(DummyStates([limit_entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        info = {
            "entities": {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"},
            "params": {"_grid_delivery_step": "limit", "limit": 500},
            "called_at": __import__('datetime').datetime.now(),
        }

        result = queue_module._entities_match(
            shield, "oig_cloud.set_grid_delivery", info, 15
        )

        assert result is False

    def test_none_value_prevents_completion(self):
        """None current value (missing state) must not cause false completion."""
        limit_entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", None)
        hass = DummyHass(DummyStates([limit_entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        info = {
            "entities": {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"},
            "params": {"_grid_delivery_step": "limit", "limit": 500},
            "called_at": __import__('datetime').datetime.now(),
        }

        result = queue_module._entities_match(
            shield, "oig_cloud.set_grid_delivery", info, 15
        )

        assert result is False

    def test_malformed_numeric_value_prevents_completion(self):
        """Malformed current value must not cause false completion for limit entity."""
        limit_entity = DummyState("sensor.oig_123_invertor_prm1_p_max_feed_grid", "not-a-number")
        hass = DummyHass(DummyStates([limit_entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        info = {
            "entities": {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "500"},
            "params": {"_grid_delivery_step": "limit", "limit": 500},
            "called_at": __import__('datetime').datetime.now(),
        }

        result = queue_module._entities_match(
            shield, "oig_cloud.set_grid_delivery", info, 15
        )

        assert result is False

    def test_regular_entities_not_affected_by_telemetry_lag_checks(self):
        """Non-grid-delivery entities should complete normally regardless of unrelated states."""
        box_mode_entity = DummyState("sensor.oig_123_box_prms_mode", "Home 1")
        hass = DummyHass(DummyStates([box_mode_entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        info = {
            "entities": {"sensor.oig_123_box_prms_mode": "Home 1"},
            "params": {"mode": "home_1"},
            "called_at": __import__('datetime').datetime.now(),
        }

        result = queue_module._entities_match(
            shield, "oig_cloud.set_box_mode", info, 15
        )

        assert result is True


class TestNormalizeEntityValuesHardened:
    """Tests for hardened _normalize_entity_values with unavailable/malformed handling."""

    def test_limit_entity_unavailable_normalized_to_empty(self):
        """Unavailable limit values normalize to empty string for safe comparison."""
        entity_id = "sensor.oig_123_invertor_prm1_p_max_feed_grid"
        expected = "500"
        current = "unavailable"

        hass = DummyHass(DummyStates([]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        norm_expected, norm_current = queue_module._normalize_entity_values(
            shield, entity_id, expected, current
        )

        assert norm_expected == "500"
        assert norm_current == ""

    def test_limit_entity_none_normalized_to_empty(self):
        """None limit values normalize to empty string for safe comparison."""
        entity_id = "sensor.oig_123_invertor_prm1_p_max_feed_grid"
        expected = "500"
        current = None

        hass = DummyHass(DummyStates([]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        norm_expected, norm_current = queue_module._normalize_entity_values(
            shield, entity_id, expected, current
        )

        assert norm_expected == "500"
        assert norm_current == ""

    def test_limit_entity_numeric_rounding(self):
        """Numeric limit values are properly rounded."""
        entity_id = "sensor.oig_123_invertor_prm1_p_max_feed_grid"
        expected = "500.7"
        current = "500.3"

        hass = DummyHass(DummyStates([]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        norm_expected, norm_current = queue_module._normalize_entity_values(
            shield, entity_id, expected, current
        )

        assert norm_expected == "501"
        assert norm_current == "500"

    def test_limit_entity_malformed_falls_back_to_string(self):
        """Malformed limit values fall back to string comparison."""
        entity_id = "sensor.oig_123_invertor_prm1_p_max_feed_grid"
        expected = "abc"
        current = "def"

        hass = DummyHass(DummyStates([]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        norm_expected, norm_current = queue_module._normalize_entity_values(
            shield, entity_id, expected, current
        )

        assert norm_expected == "abc"
        assert norm_current == "def"

    def test_mode_entity_unavailable_uses_normalize_value(self):
        """Mode entity uses standard normalize_value even for unavailable."""
        entity_id = "sensor.oig_123_invertor_prms_to_grid"
        expected = "Omezeno"
        current = "unavailable"

        hass = DummyHass(DummyStates([]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        norm_expected, norm_current = queue_module._normalize_entity_values(
            shield, entity_id, expected, current
        )

        assert norm_expected == "omezeno"
        assert norm_current == "unavailable"

    def test_duplicate_in_queue_with_empty_params(self):
        """Empty params still matches correctly."""
        entity = DummyState("sensor.oig_123_box_prms_mode", "Home 1")
        hass = DummyHass(DummyStates([entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        shield.queue.append((
            "oig_cloud.set_box_mode",
            None,
            {"sensor.oig_123_box_prms_mode": "Home 1"},
            None,
            "switch",
            "oig_cloud.set_box_mode",
            False,
            None,
        ))

        result = dispatch_module._is_duplicate(
            shield,
            "oig_cloud.set_box_mode",
            None,
            {"sensor.oig_123_box_prms_mode": "Home 1"},
        )

        assert result == "queue"

    def test_duplicate_in_pending_missing_entities_key(self):
        """Pending entry without entities key should not match."""
        entity = DummyState("sensor.oig_123_box_prms_mode", "Home 1")
        hass = DummyHass(DummyStates([entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        shield.pending["oig_cloud.set_box_mode"] = {
            "params": {"mode": "home_1"},
            "called_at": __import__('datetime').datetime.now(),
        }

        result = dispatch_module._is_duplicate(
            shield,
            "oig_cloud.set_box_mode",
            {"mode": "home_1"},
            {"sensor.oig_123_box_prms_mode": "Home 1"},
        )

        assert result is None

    def test_different_service_in_queue_not_duplicate(self):
        """Different service name means not a duplicate even if params match."""
        entity = DummyState("sensor.oig_123_box_prms_mode", "Home 1")
        hass = DummyHass(DummyStates([entity]))
        entry = SimpleNamespace(options={"box_id": "123"}, data={})
        shield = DummyShield(hass, entry)

        shield.queue.append((
            "oig_cloud.set_boiler_mode",
            {"mode": "cbb"},
            {},
            None,
            "switch",
            "oig_cloud.set_boiler_mode",
            False,
            None,
        ))

        result = dispatch_module._is_duplicate(
            shield,
            "oig_cloud.set_box_mode",
            {"mode": "home_1"},
            {"sensor.oig_123_box_prms_mode": "Home 1"},
        )

        assert result is None
