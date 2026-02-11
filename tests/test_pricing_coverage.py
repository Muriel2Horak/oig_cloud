"""Additional tests for pricing module to improve coverage to 100%."""

from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest


class DummyConfigEntry:
    """Mock ConfigEntry."""
    def __init__(self):
        self.options = {}
        self.entry_id = "test_entry"


def test_get_sensor_component_returns_none_when_hass_none():
    """Test _get_sensor_component returns None when hass is None."""
    from custom_components.oig_cloud.battery_forecast.data.pricing import _get_sensor_component

    result = _get_sensor_component(None)
    assert result is None


def test_get_sensor_component_returns_none_when_hass_data_not_dict():
    """Test _get_sensor_component returns None when hass_data is not dict."""
    from custom_components.oig_cloud.battery_forecast.data.pricing import _get_sensor_component

    hass = SimpleNamespace(data="not_dict")
    result = _get_sensor_component(hass)
    assert result is None


def test_get_sensor_component_returns_sensor_from_entity_components():
    """Test _get_sensor_component returns sensor from entity_components."""
    from custom_components.oig_cloud.battery_forecast.data.pricing import _get_sensor_component

    sensor_obj = SimpleNamespace()
    hass = SimpleNamespace(data={"entity_components": {"sensor": sensor_obj}})

    result = _get_sensor_component(hass)
    assert result is sensor_obj


def test_find_entity_returns_none_when_component_none():
    """Test _find_entity returns None when component is None."""
    from custom_components.oig_cloud.battery_forecast.data.pricing import _find_entity

    result = _find_entity(None, "sensor.test")
    assert result is None


def test_find_entity_returns_entity_by_get_entity():
    """Test _find_entity returns entity via get_entity method."""
    from custom_components.oig_cloud.battery_forecast.data.pricing import _find_entity

    entity_obj = SimpleNamespace(entity_id="sensor.test")
    component = SimpleNamespace(get_entity=lambda eid: entity_obj if eid == "sensor.test" else None)

    result = _find_entity(component, "sensor.test")
    assert result is entity_obj


def test_find_entity_returns_entity_from_entities_list():
    """Test _find_entity returns entity from entities list."""
    from custom_components.oig_cloud.battery_forecast.data.pricing import _find_entity

    entity_obj = SimpleNamespace(entity_id="sensor.test")
    entities = [SimpleNamespace(entity_id="other", other_attr="value")]
    entities[0] = entity_obj  # Replace first

    component = SimpleNamespace(entities=entities)

    result = _find_entity(component, "sensor.test")
    assert result is entity_obj


def test_get_price_sensor_entity_returns_none_when_hass_none():
    """Test _get_price_sensor_entity returns None when hass is None."""
    from custom_components.oig_cloud.battery_forecast.data.pricing import _get_price_sensor_entity

    sensor = SimpleNamespace(_box_id="123", _hass=None)
    result = _get_price_sensor_entity(sensor, price_type="spot")
    assert result is None


def test_get_price_sensor_entity_returns_export_sensor():
    """Test _get_price_sensor_entity returns correct export sensor ID."""
    from custom_components.oig_cloud.battery_forecast.data.pricing import _get_price_sensor_entity

    hass = SimpleNamespace(data={"entity_components": {"sensor": SimpleNamespace(get_entity=lambda eid: SimpleNamespace(entity_id=eid))}})
    sensor = SimpleNamespace(_box_id="123", _hass=hass)

    result = _get_price_sensor_entity(sensor, price_type="export")
    assert result is not None


def test_get_price_sensor_entity_returns_spot_sensor():
    """Test _get_price_sensor_entity returns correct spot sensor ID."""
    from custom_components.oig_cloud.battery_forecast.data.pricing import _get_price_sensor_entity

    hass = SimpleNamespace(data={"entity_components": {"sensor": SimpleNamespace(get_entity=lambda eid: SimpleNamespace(entity_id=eid))}})
    sensor = SimpleNamespace(_box_id="123", _hass=hass)

    result = _get_price_sensor_entity(sensor, price_type="spot")
    assert result is not None


def test_derive_export_prices_with_percentage_model():
    """Test _derive_export_prices with percentage model."""
    from custom_components.oig_cloud.battery_forecast.data.pricing import _derive_export_prices

    config_entry = DummyConfigEntry()
    config_entry.options = {"export_pricing_model": "percentage"}

    spot_prices_dict = {
        "2025-01-01T00:00:00": 100.0,
        "2025-01-01T01:00:00": 110.0,
    }

    result = _derive_export_prices(spot_prices_dict, config_entry.options)

    assert isinstance(result, dict)
    assert len(result) == 2
    assert result["2025-01-01T00:00:00"] == 85.0
    assert result["2025-01-01T01:00:00"] == 93.5


def test_derive_export_prices_with_none_export_price_raises():
    """Test _derive_export_prices raises for invalid None spot price."""
    from custom_components.oig_cloud.battery_forecast.data.pricing import _derive_export_prices

    config_entry = DummyConfigEntry()
    config_entry.options = {"export_pricing_model": "percentage"}

    spot_prices_dict = {"2025-01-01T00:00:00": None}

    with pytest.raises(TypeError):
        _derive_export_prices(spot_prices_dict, config_entry.options)
