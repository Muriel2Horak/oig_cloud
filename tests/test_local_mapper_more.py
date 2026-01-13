from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

from custom_components.oig_cloud.core import local_mapper


def test_apply_state_unknown_entity():
    applier = local_mapper.LocalUpdateApplier("123")
    payload = {}
    assert applier.apply_state(payload, "sensor.other", 1, datetime.now()) is False


def test_apply_state_node_update_box_mode():
    applier = local_mapper.LocalUpdateApplier("123")
    payload = {}
    entity_id = "sensor.oig_local_123_tbl_box_prms_mode"
    changed = applier.apply_state(payload, entity_id, "Home 2", datetime.now())
    assert changed is True
    assert payload["123"]["box_prms"]["mode"] == 1


def test_apply_state_extended_update():
    applier = local_mapper.LocalUpdateApplier("123")
    payload = {}
    entity_id = "sensor.oig_local_123_tbl_batt_bat_v"
    changed = applier.apply_state(payload, entity_id, 12.5, datetime.now())
    assert changed is True
    ext = payload["extended_batt"]["items"][-1]["values"]
    assert ext[0] == 12.5


def test_apply_state_unknown_suffix():
    applier = local_mapper.LocalUpdateApplier("123")
    payload = {}
    entity_id = "sensor.oig_local_123_unknown_suffix"
    assert applier.apply_state(payload, entity_id, 1, datetime.now()) is False


def test_apply_state_rejects_invalid_entity_id():
    applier = local_mapper.LocalUpdateApplier("123")
    payload = {}
    assert applier.apply_state(payload, None, 1, datetime.now()) is False


def test_apply_state_domain_not_allowed(monkeypatch):
    cfg = local_mapper._SuffixConfig(
        updates=(local_mapper._NodeUpdate(node_id="x", node_key="y"),),
        domains=("sensor",),
        value_map=None,
    )
    monkeypatch.setattr(local_mapper, "_SUFFIX_UPDATES", {"suffix": cfg})
    applier = local_mapper.LocalUpdateApplier("123")
    payload = {}
    entity_id = "binary_sensor.oig_local_123_suffix"
    assert applier.apply_state(payload, entity_id, 1, datetime.now()) is False


def test_apply_state_value_none(monkeypatch):
    cfg = local_mapper._SuffixConfig(
        updates=(local_mapper._NodeUpdate(node_id="x", node_key="y"),),
        domains=("sensor",),
        value_map=None,
    )
    monkeypatch.setattr(local_mapper, "_SUFFIX_UPDATES", {"suffix": cfg})
    applier = local_mapper.LocalUpdateApplier("123")
    payload = {}
    entity_id = "sensor.oig_local_123_suffix"
    assert applier.apply_state(payload, entity_id, "unknown", datetime.now()) is False


def test_apply_state_box_and_node_overrides(monkeypatch):
    cfg = local_mapper._SuffixConfig(
        updates=(local_mapper._NodeUpdate(node_id="box_prms", node_key="mode"),),
        domains=("sensor",),
        value_map=None,
    )
    monkeypatch.setattr(local_mapper, "_SUFFIX_UPDATES", {"suffix": cfg})
    applier = local_mapper.LocalUpdateApplier("123")
    payload = {"123": "bad"}
    entity_id = "sensor.oig_local_123_suffix"
    assert applier.apply_state(payload, entity_id, "Home 1", datetime.now()) is True
    assert isinstance(payload["123"]["box_prms"], dict)


def test_apply_state_skips_invalid_box_mode(monkeypatch):
    cfg = local_mapper._SuffixConfig(
        updates=(local_mapper._NodeUpdate(node_id="box_prms", node_key="mode"),),
        domains=("sensor",),
        value_map=None,
    )
    monkeypatch.setattr(local_mapper, "_SUFFIX_UPDATES", {"suffix": cfg})
    applier = local_mapper.LocalUpdateApplier("123")
    payload = {}
    entity_id = "sensor.oig_local_123_suffix"
    assert applier.apply_state(payload, entity_id, "home", datetime.now()) is False


def test_apply_state_resets_non_dict_node(monkeypatch):
    cfg = local_mapper._SuffixConfig(
        updates=(local_mapper._NodeUpdate(node_id="box_prms", node_key="mode"),),
        domains=("sensor",),
        value_map=None,
    )
    monkeypatch.setattr(local_mapper, "_SUFFIX_UPDATES", {"suffix": cfg})
    applier = local_mapper.LocalUpdateApplier("123")
    payload = {"123": {"box_prms": "bad"}}
    entity_id = "sensor.oig_local_123_suffix"
    assert applier.apply_state(payload, entity_id, "Home 1", datetime.now()) is True
    assert isinstance(payload["123"]["box_prms"], dict)


def test_apply_state_extended_items_and_values(monkeypatch):
    cfg = local_mapper._SuffixConfig(
        updates=(local_mapper._ExtendedUpdate(group="extended_batt", index=0),),
        domains=("sensor",),
        value_map=None,
    )
    monkeypatch.setattr(local_mapper, "_SUFFIX_UPDATES", {"suffix": cfg})
    applier = local_mapper.LocalUpdateApplier("123")
    payload = {"extended_batt": {"items": "bad"}}
    entity_id = "sensor.oig_local_123_suffix"
    assert applier.apply_state(payload, entity_id, 5, datetime.now()) is True
    values = payload["extended_batt"]["items"][-1]["values"]
    assert len(values) >= 4


def test_apply_state_extended_values_extend(monkeypatch):
    cfg = local_mapper._SuffixConfig(
        updates=(local_mapper._ExtendedUpdate(group="extended_batt", index=3),),
        domains=("sensor",),
        value_map=None,
    )
    monkeypatch.setattr(local_mapper, "_SUFFIX_UPDATES", {"suffix": cfg})
    applier = local_mapper.LocalUpdateApplier("123")
    payload = {"extended_batt": {"items": [{"values": [1]}]}}
    entity_id = "sensor.oig_local_123_suffix"
    assert applier.apply_state(payload, entity_id, 7, datetime.now()) is True
    values = payload["extended_batt"]["items"][-1]["values"]
    assert len(values) >= 4
