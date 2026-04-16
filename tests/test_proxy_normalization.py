from __future__ import annotations

import pytest

from custom_components.oig_cloud.core.local_mapper import (
    ProxyEntityDescriptor,
    normalize_proxy_entity_id,
    SUPPORTED_DOMAINS,
)


class TestNormalizeProxyEntityId:
    """Comprehensive unit tests for normalize_proxy_entity_id.

    Covers all audited proxy domains and object-id patterns per the
    /repos/oig-proxy contract. Also includes negative/rejection cases
    for malformed inputs, wrong device scope, legacy aliases, and
    unsupported domains.
    """

    # ------------------------------------------------------------------
    # Positive: sensor
    # ------------------------------------------------------------------

    def test_sensor_numeric_device_id(self):
        desc = normalize_proxy_entity_id(
            "sensor.oig_local_2206237016_tbl_actual_aci_wr",
            "2206237016",
        )
        assert desc is not None
        assert desc.domain == "sensor"
        assert desc.device_id == "2206237016"
        assert desc.table == "tbl_actual_aci"
        assert desc.key == "wr"
        assert desc.is_control is False
        assert desc.raw_suffix == "tbl_actual_aci_wr"

    def test_sensor_alphanumeric_device_id(self):
        desc = normalize_proxy_entity_id(
            "sensor.oig_local_dev01_tbl_box_prms_mode",
            "dev01",
        )
        assert desc is not None
        assert desc.domain == "sensor"
        assert desc.device_id == "dev01"
        assert desc.table == "tbl_box_prms"
        assert desc.key == "mode"
        assert desc.is_control is False
        assert desc.raw_suffix == "tbl_box_prms_mode"

    # ------------------------------------------------------------------
    # Positive: binary_sensor
    # ------------------------------------------------------------------

    def test_binary_sensor_to_grid(self):
        desc = normalize_proxy_entity_id(
            "binary_sensor.oig_local_2206237016_tbl_invertor_prms_to_grid",
            "2206237016",
        )
        assert desc is not None
        assert desc.domain == "binary_sensor"
        assert desc.device_id == "2206237016"
        assert desc.table == "tbl_invertor_prms"
        assert desc.key == "to_grid"
        assert desc.is_control is False
        assert desc.raw_suffix == "tbl_invertor_prms_to_grid"

    # ------------------------------------------------------------------
    # Positive: switch (control, _cfg suffix)
    # ------------------------------------------------------------------

    def test_switch_control_cfg(self):
        desc = normalize_proxy_entity_id(
            "switch.oig_local_2206237016_tbl_invertor_prms_to_grid_cfg",
            "2206237016",
        )
        assert desc is not None
        assert desc.domain == "switch"
        assert desc.device_id == "2206237016"
        assert desc.table == "tbl_invertor_prms"
        assert desc.key == "to_grid"
        assert desc.is_control is True
        assert desc.raw_suffix == "tbl_invertor_prms_to_grid_cfg"

    # ------------------------------------------------------------------
    # Positive: number (control, _cfg suffix)
    # ------------------------------------------------------------------

    def test_number_control_cfg(self):
        desc = normalize_proxy_entity_id(
            "number.oig_local_dev01_tbl_batt_prms_bat_min_cfg",
            "dev01",
        )
        assert desc is not None
        assert desc.domain == "number"
        assert desc.device_id == "dev01"
        assert desc.table == "tbl_batt_prms"
        assert desc.key == "bat_min"
        assert desc.is_control is True
        assert desc.raw_suffix == "tbl_batt_prms_bat_min_cfg"

    # ------------------------------------------------------------------
    # Positive: select (control, _cfg suffix)
    # ------------------------------------------------------------------

    def test_select_control_cfg(self):
        desc = normalize_proxy_entity_id(
            "select.oig_local_dev01_tbl_box_prms_mode_cfg",
            "dev01",
        )
        assert desc is not None
        assert desc.domain == "select"
        assert desc.device_id == "dev01"
        assert desc.table == "tbl_box_prms"
        assert desc.key == "mode"
        assert desc.is_control is True
        assert desc.raw_suffix == "tbl_box_prms_mode_cfg"

    def test_select_proxy_control_cfg(self):
        desc = normalize_proxy_entity_id(
            "select.oig_local_dev01_proxy_control_proxy_mode_cfg",
            "dev01",
        )
        assert desc is not None
        assert desc.domain == "select"
        assert desc.device_id == "dev01"
        assert desc.table == "proxy_control"
        assert desc.key == "proxy_mode"
        assert desc.is_control is True
        assert desc.raw_suffix == "proxy_control_proxy_mode_cfg"

    # ------------------------------------------------------------------
    # Positive: verify descriptor fields are accessible
    # ------------------------------------------------------------------

    def test_descriptor_fields_accessible(self):
        desc = normalize_proxy_entity_id(
            "switch.oig_local_2206237016_tbl_invertor_prms_to_grid_cfg",
            "2206237016",
        )
        assert desc is not None
        assert isinstance(desc, ProxyEntityDescriptor)
        assert desc.domain == "switch"
        assert desc.device_id == "2206237016"
        assert desc.table == "tbl_invertor_prms"
        assert desc.key == "to_grid"
        assert desc.is_control is True
        assert desc.raw_suffix == "tbl_invertor_prms_to_grid_cfg"

    # ------------------------------------------------------------------
    # Negative: wrong type (non-string)
    # ------------------------------------------------------------------

    @pytest.mark.parametrize("entity_id", [None, 123, [], {}])
    def test_rejects_non_string(self, entity_id):
        result = normalize_proxy_entity_id(entity_id, "2206237016")
        assert result is None

    # ------------------------------------------------------------------
    # Negative: malformed prefix (no oig_local_)
    # ------------------------------------------------------------------

    @pytest.mark.parametrize(
        "entity_id",
        [
            "sensor.other_thing",
            "switch.other_thing",
            "number.other_thing",
            "select.other_thing",
            "binary_sensor.other_thing",
        ],
    )
    def test_rejects_malformed_prefix(self, entity_id):
        result = normalize_proxy_entity_id(entity_id, "2206237016")
        assert result is None

    # ------------------------------------------------------------------
    # Negative: wrong device_id (strict scoping)
    # ------------------------------------------------------------------

    def test_rejects_wrong_device_id(self):
        result = normalize_proxy_entity_id(
            "sensor.oig_local_2206237016_tbl_actual_aci_wr",
            "9999999999",
        )
        assert result is None

    def test_rejects_wrong_device_id_switch(self):
        result = normalize_proxy_entity_id(
            "switch.oig_local_2206237016_tbl_invertor_prms_to_grid_cfg",
            "dev01",
        )
        assert result is None

    # ------------------------------------------------------------------
    # Negative: unsupported domain
    # ------------------------------------------------------------------

    def test_rejects_unsupported_domain_light(self):
        result = normalize_proxy_entity_id(
            "light.oig_local_2206237016_tbl_box_prms_mode",
            "2206237016",
        )
        assert result is None

    def test_rejects_unsupported_domain_climate(self):
        result = normalize_proxy_entity_id(
            "climate.oig_local_2206237016_tbl_box_prms_mode",
            "2206237016",
        )
        assert result is None

    # ------------------------------------------------------------------
    # Negative: legacy tlb_ prefix (non-contract)
    # ------------------------------------------------------------------

    def test_rejects_legacy_tlb_prefix(self):
        result = normalize_proxy_entity_id(
            "switch.2206237016_tlb_invertor_prms_to_grid_cfg",
            "2206237016",
        )
        assert result is None

    def test_rejects_legacy_tlb_prefix_sensor(self):
        result = normalize_proxy_entity_id(
            "sensor.2206237016_tlb_actual_aci_wr",
            "2206237016",
        )
        assert result is None

    # ------------------------------------------------------------------
    # Positive: legacy format without oig_local_ prefix
    # ------------------------------------------------------------------

    def test_legacy_sensor_numeric_device_id(self):
        desc = normalize_proxy_entity_id(
            "sensor.2206237016_tbl_actual_aci_wr",
            "2206237016",
        )
        assert desc is not None
        assert desc.domain == "sensor"
        assert desc.device_id == "2206237016"
        assert desc.table == "tbl_actual_aci"
        assert desc.key == "wr"
        assert desc.is_control is False
        assert desc.raw_suffix == "tbl_actual_aci_wr"

    def test_legacy_switch_control_cfg(self):
        desc = normalize_proxy_entity_id(
            "switch.2206237016_tbl_invertor_prms_to_grid_cfg",
            "2206237016",
        )
        assert desc is not None
        assert desc.domain == "switch"
        assert desc.device_id == "2206237016"
        assert desc.table == "tbl_invertor_prms"
        assert desc.key == "to_grid"
        assert desc.is_control is True
        assert desc.raw_suffix == "tbl_invertor_prms_to_grid_cfg"

    def test_legacy_number_control_cfg(self):
        desc = normalize_proxy_entity_id(
            "number.2206237016_tbl_batt_prms_bat_min_cfg",
            "2206237016",
        )
        assert desc is not None
        assert desc.domain == "number"
        assert desc.device_id == "2206237016"
        assert desc.table == "tbl_batt_prms"
        assert desc.key == "bat_min"
        assert desc.is_control is True
        assert desc.raw_suffix == "tbl_batt_prms_bat_min_cfg"

    def test_legacy_select_proxy_control_cfg(self):
        desc = normalize_proxy_entity_id(
            "select.2206237016_proxy_control_proxy_mode_cfg",
            "2206237016",
        )
        assert desc is not None
        assert desc.domain == "select"
        assert desc.device_id == "2206237016"
        assert desc.table == "proxy_control"
        assert desc.key == "proxy_mode"
        assert desc.is_control is True
        assert desc.raw_suffix == "proxy_control_proxy_mode_cfg"

    # ------------------------------------------------------------------
    # Negative: cloud entity must NOT match local format
    # ------------------------------------------------------------------

    def test_rejects_cloud_entity_id(self):
        result = normalize_proxy_entity_id(
            "sensor.oig_2206237016_invertor_prms_to_grid",
            "2206237016",
        )
        assert result is None

    # ------------------------------------------------------------------
    # Negative: missing oig_local_ prefix (legacy tlb_ is still rejected)
    # ------------------------------------------------------------------

    def test_rejects_legacy_tlb_prefix_switch_no_oig_local(self):
        result = normalize_proxy_entity_id(
            "switch.2206237016_tlb_invertor_prms_to_grid_cfg",
            "2206237016",
        )
        assert result is None

    def test_rejects_legacy_tlb_prefix_sensor_no_oig_local(self):
        result = normalize_proxy_entity_id(
            "sensor.2206237016_tlb_actual_aci_wr",
            "2206237016",
        )
        assert result is None

    # ------------------------------------------------------------------
    # Negative: no dot before domain
    # ------------------------------------------------------------------

    def test_rejects_no_dot(self):
        result = normalize_proxy_entity_id(
            "sensoroig_local_2206237016_tbl_actual_aci_wr",
            "2206237016",
        )
        assert result is None

    # ------------------------------------------------------------------
    # Negative: empty suffix after prefix
    # ------------------------------------------------------------------

    def test_rejects_empty_suffix(self):
        result = normalize_proxy_entity_id(
            "sensor.oig_local_2206237016_",
            "2206237016",
        )
        assert result is None

    # ------------------------------------------------------------------
    # Negative: cannot split table/key (no underscore in key_part)
    # ------------------------------------------------------------------

    def test_rejects_no_underscore_in_key_part(self):
        result = normalize_proxy_entity_id(
            "sensor.oig_local_2206237016_tblonly",
            "2206237016",
        )
        assert result is None

    def test_rejects_table_key_no_separator(self):
        result = normalize_proxy_entity_id(
            "switch.oig_local_dev01_onlykey",
            "dev01",
        )
        assert result is None

    # ------------------------------------------------------------------
    # Negative: table is empty (leading underscore)
    # ------------------------------------------------------------------

    def test_rejects_empty_table(self):
        result = normalize_proxy_entity_id(
            "sensor.oig_local_2206237016__key",
            "2206237016",
        )
        assert result is None

    # ------------------------------------------------------------------
    # Negative: key is empty (trailing underscore)
    # ------------------------------------------------------------------

    def test_rejects_empty_key(self):
        result = normalize_proxy_entity_id(
            "sensor.oig_local_2206237016_table_",
            "2206237016",
        )
        assert result is None

    # ------------------------------------------------------------------
    # Determinism: same input always yields same output
    # ------------------------------------------------------------------

    def test_deterministic_same_input(self):
        entity_id = "switch.oig_local_2206237016_tbl_invertor_prms_to_grid_cfg"
        d1 = normalize_proxy_entity_id(entity_id, "2206237016")
        d2 = normalize_proxy_entity_id(entity_id, "2206237016")
        assert d1 == d2

    def test_deterministic_different_calls(self):
        for _ in range(10):
            desc = normalize_proxy_entity_id(
                "select.oig_local_dev01_proxy_control_proxy_mode_cfg",
                "dev01",
            )
            assert desc is not None
            assert desc.domain == "select"
            assert desc.table == "proxy_control"

    # ------------------------------------------------------------------
    # Supported domains coverage
    # ------------------------------------------------------------------

    @pytest.mark.parametrize(
        "domain,entity_id,device_id,expected_table,expected_key,expected_control",
        [
            (
                "sensor",
                "sensor.oig_local_2206237016_tbl_actual_aci_wr",
                "2206237016",
                "tbl_actual_aci",
                "wr",
                False,
            ),
            (
                "binary_sensor",
                "binary_sensor.oig_local_2206237016_tbl_invertor_prms_to_grid",
                "2206237016",
                "tbl_invertor_prms",
                "to_grid",
                False,
            ),
            (
                "switch",
                "switch.oig_local_2206237016_tbl_invertor_prms_to_grid_cfg",
                "2206237016",
                "tbl_invertor_prms",
                "to_grid",
                True,
            ),
            (
                "number",
                "number.oig_local_dev01_tbl_batt_prms_bat_min_cfg",
                "dev01",
                "tbl_batt_prms",
                "bat_min",
                True,
            ),
            (
                "select",
                "select.oig_local_dev01_tbl_box_prms_mode_cfg",
                "dev01",
                "tbl_box_prms",
                "mode",
                True,
            ),
        ],
    )
    def test_all_supported_domains(
        self, domain, entity_id, device_id, expected_table, expected_key, expected_control
    ):
        desc = normalize_proxy_entity_id(entity_id, device_id)
        assert desc is not None
        assert desc.domain == domain
        assert desc.table == expected_table
        assert desc.key == expected_key
        assert desc.is_control == expected_control

    # ------------------------------------------------------------------
    # is_control is False when _cfg not present
    # ------------------------------------------------------------------

    def test_is_control_false_for_non_cfg(self):
        desc = normalize_proxy_entity_id(
            "binary_sensor.oig_local_2206237016_tbl_invertor_prms_to_grid",
            "2206237016",
        )
        assert desc is not None
        assert desc.is_control is False

    def test_is_control_false_for_number_non_cfg(self):
        desc = normalize_proxy_entity_id(
            "number.oig_local_dev01_tbl_batt_prms_bat_min",
            "dev01",
        )
        assert desc is not None
        assert desc.is_control is False