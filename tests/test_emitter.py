from __future__ import annotations

import importlib
import importlib.util
import sys
import types
from pathlib import Path
from types import SimpleNamespace

import pytest


ROOT = Path(__file__).resolve().parents[1]
PACKAGE_ROOT = ROOT / "custom_components"
OIG_ROOT = PACKAGE_ROOT / "oig_cloud"
SHARED_ROOT = OIG_ROOT / "shared"
EMITTER_PATH = SHARED_ROOT / "emitter.py"
TEST_PACKAGE = "telemetry_testpkg"
INSTALL_ID_HASH = (
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
)


def _ensure_package(name: str, path: Path) -> None:
    module = sys.modules.get(name)
    if module is None:
        module = types.ModuleType(name)
        module.__path__ = [str(path)]
        sys.modules[name] = module


_ensure_package(TEST_PACKAGE, ROOT)
_ensure_package(f"{TEST_PACKAGE}.oig_cloud", OIG_ROOT)
_ensure_package(f"{TEST_PACKAGE}.oig_cloud.shared", SHARED_ROOT)

const_module = importlib.import_module(f"{TEST_PACKAGE}.oig_cloud.const")
contract_module = importlib.import_module(
    f"{TEST_PACKAGE}.oig_cloud.shared.cloud_contract"
)

DOMAIN = const_module.DOMAIN
CONF_NO_TELEMETRY = const_module.CONF_NO_TELEMETRY
CONF_TELEMETRY_MQTT_ENABLED = const_module.CONF_TELEMETRY_MQTT_ENABLED
CONF_TELEMETRY_MQTT_HOST = const_module.CONF_TELEMETRY_MQTT_HOST
CONF_TELEMETRY_MQTT_PORT = const_module.CONF_TELEMETRY_MQTT_PORT
CONF_TELEMETRY_MQTT_PREFIX = const_module.CONF_TELEMETRY_MQTT_PREFIX


def load_emitter_module():
    assert EMITTER_PATH.exists(), "custom_components/oig_cloud/shared/emitter.py must exist"

    module_name = f"{TEST_PACKAGE}.oig_cloud.shared.emitter"
    sys.modules.pop(module_name, None)
    spec = importlib.util.spec_from_file_location(module_name, EMITTER_PATH)
    assert spec is not None and spec.loader is not None

    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def _build_planner_event() -> dict[str, object]:
    return contract_module.build_producer_event(
        event_name="planner_run_completed",
        occurred_at="2026-04-20T12:00:00Z",
        device_id="12345",
        install_id_hash=INSTALL_ID_HASH,
        integration_version="2.3.34",
        run_id="planner-run-1",
        correlation_id="planner-run-1",
        diagnostics={
            "metric_target_soc_kwh": 8.4,
            "metric_planning_min_kwh": 3.2,
            "metric_total_cost_czk": 12.34,
            "metric_decisions_count": 1,
            "metric_home_i_count": 32,
            "metric_home_iii_count": 48,
            "metric_home_ups_count": 16,
            "metric_guard_override_count": 0,
            "metric_infeasible": False,
            "detail_strategy": "CHARGE_CHEAPEST",
            "detail_reason": "global_greedy",
        },
    )


class RecordingSink:
    def __init__(self, *, should_raise: bool = False, result: bool = True) -> None:
        self.should_raise = should_raise
        self.result = result
        self.cloud_events: list[dict[str, object]] = []
        self.raw_events: list[dict[str, object]] = []

    async def emit_cloud_event(self, event: dict[str, object]) -> bool:
        if self.should_raise:
            raise RuntimeError("sink boom")
        self.cloud_events.append(dict(event))
        return self.result

    async def emit_raw_event(self, event: dict[str, object]) -> bool:
        if self.should_raise:
            raise RuntimeError("sink boom")
        self.raw_events.append(dict(event))
        return self.result


def _make_entry(*, no_telemetry: bool = False, mqtt_enabled: bool = False):
    options = {
        CONF_TELEMETRY_MQTT_ENABLED: mqtt_enabled,
        CONF_TELEMETRY_MQTT_HOST: "mqtt.internal" if mqtt_enabled else "",
        CONF_TELEMETRY_MQTT_PORT: 1883,
        CONF_TELEMETRY_MQTT_PREFIX: "oig/cloud-telemetry",
    }
    if no_telemetry:
        options[CONF_NO_TELEMETRY] = True

    return SimpleNamespace(
        entry_id="entry-1",
        data={"username": "user@example.com"},
        options=options,
    )


@pytest.mark.asyncio
async def test_emit_cloud_event_validates_taxonomy_before_dispatch():
    emitter_module = load_emitter_module()
    mqtt_sink = RecordingSink()
    new_relic_sink = RecordingSink()
    emitter = emitter_module.SharedTelemetryEmitter(
        entry=_make_entry(),
        mqtt_sink=mqtt_sink,
        new_relic_sink=new_relic_sink,
    )
    event = _build_planner_event()
    event["event_name"] = "planner_run_custom"

    with pytest.raises(contract_module.CloudContractError, match="event_name"):
        await emitter.emit_cloud_event(event)

    assert mqtt_sink.cloud_events == []
    assert new_relic_sink.cloud_events == []


@pytest.mark.asyncio
async def test_emit_cloud_event_fans_out_with_transport_injected_per_sink():
    emitter_module = load_emitter_module()
    mqtt_sink = RecordingSink()
    new_relic_sink = RecordingSink()
    emitter = emitter_module.SharedTelemetryEmitter(
        entry=_make_entry(),
        mqtt_sink=mqtt_sink,
        new_relic_sink=new_relic_sink,
    )
    event = _build_planner_event()

    result = await emitter.emit_cloud_event(event)

    assert result is True
    assert event["event_name"] == "planner_run_completed"
    assert "transport" not in event
    assert mqtt_sink.cloud_events == [{**event, "transport": "mqtt"}]
    assert new_relic_sink.cloud_events == [{**event, "transport": "newrelic"}]


@pytest.mark.asyncio
async def test_emit_cloud_event_continues_when_one_sink_fails():
    emitter_module = load_emitter_module()
    mqtt_sink = RecordingSink(should_raise=True)
    new_relic_sink = RecordingSink()
    emitter = emitter_module.SharedTelemetryEmitter(
        entry=_make_entry(),
        mqtt_sink=mqtt_sink,
        new_relic_sink=new_relic_sink,
    )

    result = await emitter.emit_cloud_event(_build_planner_event())

    assert result is True
    assert new_relic_sink.cloud_events == [
        {**_build_planner_event(), "transport": "newrelic"}
    ]


@pytest.mark.asyncio
async def test_emit_raw_event_bypasses_taxonomy_and_routes_only_to_new_relic():
    emitter_module = load_emitter_module()
    mqtt_sink = RecordingSink()
    new_relic_sink = RecordingSink()
    emitter = emitter_module.SharedTelemetryEmitter(
        entry=_make_entry(),
        mqtt_sink=mqtt_sink,
        new_relic_sink=new_relic_sink,
    )
    raw_event = {
        "event_name": "planner_run_custom",
        "result": "custom_result",
        "nested": {"safe": True},
    }

    result = await emitter.emit_raw_event(raw_event)

    assert result is True
    assert mqtt_sink.raw_events == []
    assert new_relic_sink.raw_events == [raw_event]


@pytest.mark.asyncio
async def test_emitters_respect_no_telemetry_before_any_sink_dispatch():
    emitter_module = load_emitter_module()
    mqtt_sink = RecordingSink()
    new_relic_sink = RecordingSink()
    emitter = emitter_module.SharedTelemetryEmitter(
        entry=_make_entry(no_telemetry=True),
        mqtt_sink=mqtt_sink,
        new_relic_sink=new_relic_sink,
    )

    cloud_result = await emitter.emit_cloud_event(_build_planner_event())
    raw_result = await emitter.emit_raw_event({"event_name": "raw"})

    assert cloud_result is False
    assert raw_result is False
    assert mqtt_sink.cloud_events == []
    assert new_relic_sink.cloud_events == []
    assert new_relic_sink.raw_events == []


@pytest.mark.asyncio
async def test_emitter_supports_late_sink_binding():
    emitter_module = load_emitter_module()
    emitter = emitter_module.SharedTelemetryEmitter(entry=_make_entry())

    assert await emitter.emit_cloud_event(_build_planner_event()) is False

    mqtt_sink = RecordingSink()
    emitter.bind_mqtt_sink(mqtt_sink)

    assert await emitter.emit_cloud_event(_build_planner_event()) is True
    assert mqtt_sink.cloud_events == [{**_build_planner_event(), "transport": "mqtt"}]


@pytest.mark.asyncio
async def test_async_setup_entry_telemetry_stores_state_under_entry_scope(monkeypatch):
    class FakePublisher:
        def __init__(self, *, entry_id, host, port, topic_prefix):
            self.entry_id = entry_id
            self.host = host
            self.port = port
            self.topic_prefix = topic_prefix

        async def async_start(self) -> bool:
            started_publishers.append(self)
            return True

    emitter_module = load_emitter_module()
    started_publishers: list[FakePublisher] = []
    new_relic_handler = object()

    monkeypatch.setattr(emitter_module, "setup_simple_telemetry", lambda *_a, **_k: new_relic_handler)
    monkeypatch.setattr(emitter_module, "CloudMqttPublisher", FakePublisher)

    hass = SimpleNamespace(data={"core.uuid": "core-uuid", DOMAIN: {"entry-1": {}}})
    entry = _make_entry(mqtt_enabled=True)

    state = await emitter_module.async_setup_entry_telemetry(hass, entry)

    assert hass.data[DOMAIN][entry.entry_id]["telemetry"] is state
    assert "telemetry" not in hass.data[DOMAIN]
    assert state["new_relic_handler"] is new_relic_handler
    assert state["mqtt_publisher"] is started_publishers[0]
    assert isinstance(state["emitter"], emitter_module.SharedTelemetryEmitter)
    assert started_publishers[0].host == "mqtt.internal"
    assert started_publishers[0].port == 1883
    assert started_publishers[0].topic_prefix == "oig/cloud-telemetry"
