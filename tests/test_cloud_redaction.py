from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "custom_components/oig_cloud/shared/cloud_contract.py"
INSTALL_ID_HASH = (
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
)


def load_contract_module():
    assert MODULE_PATH.exists(), "custom_components/oig_cloud/shared/cloud_contract.py must exist"

    spec = importlib.util.spec_from_file_location("cloud_contract_redaction_under_test", MODULE_PATH)
    assert spec is not None and spec.loader is not None

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _build_planner_event(module, *, details_json, **diagnostics):
    return module.build_producer_event(
        event_name="planner_run_completed",
        occurred_at="2026-04-20T12:00:00Z",
        device_id="12345",
        install_id_hash=INSTALL_ID_HASH,
        integration_version="2.3.34",
        run_id="12345:2026-04-20T12:00:00+00:00",
        correlation_id="12345:2026-04-20T12:00:00+00:00",
        diagnostics={
            "metric_target_soc_kwh": 8.4,
            "metric_decisions_count": 3,
            "details_json": details_json,
            **diagnostics,
        },
    )


def test_details_json_accepts_nested_numeric_payloads_and_keeps_numbers():
    module = load_contract_module()

    event = _build_planner_event(
        module,
        details_json={
            "planner_summary": {
                "decision_count": 3,
                "target_soc_kwh": 8.4,
                "infeasible": False,
            }
        },
    )

    assert event["metric_target_soc_kwh"] == 8.4
    assert event["metric_decisions_count"] == 3
    assert json.loads(event["details_json"]) == {
        "planner_summary": {
            "decision_count": 3,
            "target_soc_kwh": 8.4,
            "infeasible": False,
        }
    }


def test_details_json_redacts_tokens_and_bounds_free_form_strings():
    module = load_contract_module()

    event = _build_planner_event(
        module,
        details_json={
            "summary": "token abc123def456ghi789jkl012mno345pqr leaked from upstream",
            "note": "x" * 200,
        },
    )

    payload = json.loads(event["details_json"])

    assert payload["summary"] == "***REDACTED***"
    assert payload["note"].endswith("...")
    assert len(payload["note"]) < 200


def test_details_json_strips_entity_names_labels_and_ids():
    module = load_contract_module()

    event = _build_planner_event(
        module,
        details_json={
            "planner_summary": {"decision_count": 3},
            "friendly_name": "Battery in kitchen",
            "labels": {"room": "kitchen"},
            "entity_id": "sensor.kitchen_battery",
        },
    )

    assert json.loads(event["details_json"]) == {
        "planner_summary": {"decision_count": 3}
    }


def test_details_json_rejects_home_assistant_state_like_payloads():
    module = load_contract_module()

    with pytest.raises(module.CloudContractError, match="details_json"):
        _build_planner_event(
            module,
            details_json={
                "ha_state": {
                    "entity_id": "sensor.kitchen_battery",
                    "state": "charging",
                    "attributes": {"friendly_name": "Kitchen battery"},
                }
            },
        )


def test_details_json_rejects_malformed_nested_payloads():
    module = load_contract_module()

    with pytest.raises(module.CloudContractError, match="details_json"):
        _build_planner_event(
            module,
            details_json={"planner_summary": {"bad_values": {"a", "b"}}},
        )


def test_details_json_rejects_oversized_nested_payloads():
    module = load_contract_module()

    oversized_payload = {
        "planner_summary": {f"value_{index}": index for index in range(300)}
    }

    with pytest.raises(module.CloudContractError, match="2 KiB"):
        _build_planner_event(module, details_json=oversized_payload)
