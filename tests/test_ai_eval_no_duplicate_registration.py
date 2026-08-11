"""Regression: the AI-eval entity must be registered exactly once.

A dedicated ``OigCloudAiEvalSensor`` owns the ``ai_eval`` unique/entity id
(``oig_cloud_<box>_ai_eval`` / ``sensor.oig_<box>_ai_eval``). The generic
data-sensor factory (``_create_basic_sensors``) iterates every
``sensor_type_category == "data"`` entry in ``SENSOR_TYPES``. If ``ai_eval``
is present there, the generic factory also builds an ``OigCloudDataSensor``
with the *same* unique/entity id, and Home Assistant logs a duplicate-entity
error and ignores one of them.

These tests fail (RED) while ``ai_eval`` is built generically and pass (GREEN)
once only the dedicated sensor owns that id.
"""
from __future__ import annotations

from custom_components.oig_cloud.sensor import _create_basic_sensors
from custom_components.oig_cloud.sensor_types import SENSOR_TYPES


class _DummyCoordinator:
    """Coordinator stub sufficient for ``_create_basic_sensors``.

    ``forced_box_id`` is a 6+ digit string so ``resolve_box_id`` returns it
    verbatim, giving deterministic entity ids.
    """

    def __init__(self) -> None:
        self.data = {"123456": {}}
        self.forced_box_id = "123456"
        self.hass = None

    def async_add_listener(self, *_args, **_kwargs):  # noqa: ANN001
        return lambda: None


_DEDICATED_UNIQUE_ID = "oig_cloud_123456_ai_eval"
_DEDICATED_ENTITY_ID = "sensor.oig_123456_ai_eval"


def _basic_entity_identifiers() -> list[tuple[str, str]]:
    sensors = _create_basic_sensors(_DummyCoordinator())
    ids: list[tuple[str, str]] = []
    for entity in sensors:
        unique_id = getattr(entity, "_attr_unique_id", None) or getattr(
            entity, "unique_id", None
        )
        if callable(unique_id):
            unique_id = unique_id()
        ids.append((str(unique_id), str(getattr(entity, "entity_id", ""))))
    return ids


def test_ai_eval_stays_expected_for_cleanup():
    """ai_eval stays in SENSOR_TYPES so entity-registry cleanup keeps it.

    The dedicated OigCloudAiEvalSensor owns the id; SENSOR_TYPES membership
    only marks it as "expected" so the per-entry cleanup sweep never orphans
    it. Removing it here would silently delete the dedicated entity on reload.
    """
    assert "ai_eval" in SENSOR_TYPES
    assert SENSOR_TYPES["ai_eval"].get("sensor_type_category") == "data"


def test_basic_sensors_do_not_register_ai_eval_unique_id():
    """No generic data sensor may claim the dedicated AI-eval unique id."""
    identifiers = _basic_entity_identifiers()
    assert _DEDICATED_UNIQUE_ID not in {uid for uid, _ in identifiers}


def test_basic_sensors_do_not_register_ai_eval_entity_id():
    """No generic data sensor may claim the dedicated AI-eval entity id."""
    identifiers = _basic_entity_identifiers()
    assert _DEDICATED_ENTITY_ID not in {eid for _, eid in identifiers}


def test_basic_sensors_entity_ids_are_unique():
    """Sanity: the generic factory itself never emits a duplicate entity id."""
    identifiers = _basic_entity_identifiers()
    entity_ids = [eid for _, eid in identifiers if eid]
    assert len(entity_ids) == len(set(entity_ids))
