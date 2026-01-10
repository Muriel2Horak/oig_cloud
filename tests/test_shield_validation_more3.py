from __future__ import annotations

from types import SimpleNamespace

from custom_components.oig_cloud.shield import validation as module


class DummyStates:
    def __init__(self, entities):
        self._entities = entities
        self._map = {e.entity_id: e for e in entities}

    def async_all(self):
        return self._entities

    def get(self, entity_id):
        return self._map.get(entity_id)


class DummyHass:
    def __init__(self, entities):
        self.states = DummyStates(entities)
        self.data = {}


class DummyEntry:
    def __init__(self, options=None, data=None):
        self.options = options or {}
        self.data = data or {}


class DummyEntity:
    def __init__(self, entity_id, state):
        self.entity_id = entity_id
        self.state = state


class DummyShield:
    def __init__(self, hass, entry):
        self.hass = hass
        self.entry = entry
        self.last_checked_entity_id = None


def test_extract_expected_entities_skips_invalid_entries():
    hass = DummyHass([])
    entry = DummyEntry()
    shield = DummyShield(hass, entry)
    hass.data = {
        "oig_cloud": {
            "bad": "oops",
            "wrong": {"service_shield": object(), "coordinator": object()},
        }
    }

    expected = module.extract_expected_entities(
        shield, module.SERVICE_SET_BOX_MODE, {"mode": "Home 2"}
    )
    assert expected == {}


def test_extract_expected_entities_resolve_box_id_error(monkeypatch):
    hass = DummyHass([])
    entry = DummyEntry()
    shield = DummyShield(hass, entry)
    hass.data = {
        "oig_cloud": {"entry": {"service_shield": shield, "coordinator": object()}}
    }

    def boom(_coord):
        raise RuntimeError("nope")

    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.base_sensor.resolve_box_id",
        boom,
        raising=False,
    )

    expected = module.extract_expected_entities(
        shield, module.SERVICE_SET_BOX_MODE, {"mode": "Home 2"}
    )
    assert expected == {}


def test_extract_expected_entities_box_mode_no_entity_match():
    hass = DummyHass([])
    entry = DummyEntry(options={"box_id": "123"})
    shield = DummyShield(hass, entry)

    expected = module.extract_expected_entities(
        shield, module.SERVICE_SET_BOX_MODE, {"mode": "Home 2"}
    )
    assert expected == {}


def test_extract_expected_entities_box_mode_none():
    entity = DummyEntity("sensor.oig_123_box_prms_mode", "Home 1")
    hass = DummyHass([entity])
    entry = DummyEntry(options={"box_id": "123"})
    shield = DummyShield(hass, entry)

    expected = module.extract_expected_entities(
        shield, module.SERVICE_SET_BOX_MODE, {"mode": "None"}
    )
    assert expected == {}


def test_extract_expected_entities_boiler_mode_same():
    entity = DummyEntity("sensor.oig_123_boiler_manual_mode", "Manuální")
    hass = DummyHass([entity])
    entry = DummyEntry(options={"box_id": "123"})
    shield = DummyShield(hass, entry)

    expected = module.extract_expected_entities(
        shield, "oig_cloud.set_boiler_mode", {"mode": "Manual"}
    )
    assert expected == {}


def test_extract_expected_entities_grid_limit_bad_state():
    entity = DummyEntity("sensor.oig_123_invertor_prm1_p_max_feed_grid", "bad")
    hass = DummyHass([entity])
    entry = DummyEntry(options={"box_id": "123"})
    shield = DummyShield(hass, entry)

    expected = module.extract_expected_entities(
        shield, "oig_cloud.set_grid_delivery", {"limit": 50}
    )
    assert expected == {"sensor.oig_123_invertor_prm1_p_max_feed_grid": "50"}


def test_check_entity_state_change_grid_modes_and_numeric_errors():
    entities = [
        DummyEntity("sensor.oig_123_invertor_prms_to_grid", "Vypnuto"),
        DummyEntity("binary_sensor.oig_123_invertor_prms_to_grid", "Omezeno"),
        DummyEntity("sensor.oig_123_invertor_prms_to_grid_2", "Omezeno"),
        DummyEntity("sensor.oig_123_invertor_prm1_p_max_feed_grid", "bad"),
        DummyEntity("sensor.oig_123_custom", "abc"),
    ]
    hass = DummyHass(entities)
    shield = SimpleNamespace(hass=hass)

    assert module.check_entity_state_change(
        shield, "sensor.oig_123_invertor_prms_to_grid", 0
    )
    assert module.check_entity_state_change(
        shield, "binary_sensor.oig_123_invertor_prms_to_grid", 1
    )
    assert module.check_entity_state_change(
        shield, "sensor.oig_123_invertor_prms_to_grid_2", "omezeno"
    )
    assert (
        module.check_entity_state_change(
            shield, "sensor.oig_123_invertor_prm1_p_max_feed_grid", 10
        )
        is False
    )
    assert module.check_entity_state_change(shield, "sensor.oig_123_custom", "abc")


def test_extract_expected_entities_unknown_service():
    hass = DummyHass([])
    shield = DummyShield(hass, DummyEntry())
    expected = module.extract_expected_entities(shield, "oig_cloud.unknown", {})
    assert expected == {}


def test_check_entity_state_change_grid_mode_unknown_expected():
    entities = [DummyEntity("sensor.oig_123_invertor_prms_to_grid", "Zapnuto")]
    hass = DummyHass(entities)
    shield = SimpleNamespace(hass=hass)
    assert (
        module.check_entity_state_change(
            shield, "sensor.oig_123_invertor_prms_to_grid", "invalid"
        )
        is False
    )
