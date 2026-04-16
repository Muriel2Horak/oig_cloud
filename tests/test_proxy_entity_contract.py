from __future__ import annotations

import pytest

from custom_components.oig_cloud.core.local_mapper import normalize_proxy_entity_id


class TestNormalizeProxyEntityIdContract:

    @pytest.mark.parametrize(
        "entity_id,expected_domain,expected_suffix",
        [
            (
                "sensor.oig_local_2206237016_tbl_actual_aci_wr",
                "sensor",
                "tbl_actual_aci_wr",
            ),
            (
                "sensor.oig_local_dev01_tbl_box_prms_mode",
                "sensor",
                "tbl_box_prms_mode",
            ),
        ],
    )
    def test_accepts_canonical_sensor(self, entity_id, expected_domain, expected_suffix):
        if "2206237016" in entity_id:
            result = normalize_proxy_entity_id(entity_id, "2206237016")
        else:
            result = normalize_proxy_entity_id(entity_id, "dev01")
        assert result is not None
        assert result.domain == expected_domain
        assert result.raw_suffix == expected_suffix

    @pytest.mark.parametrize(
        "entity_id,expected_domain,expected_suffix",
        [
            (
                "binary_sensor.oig_local_2206237016_tbl_invertor_prms_to_grid",
                "binary_sensor",
                "tbl_invertor_prms_to_grid",
            ),
        ],
    )
    def test_accepts_canonical_binary_sensor(self, entity_id, expected_domain, expected_suffix):
        result = normalize_proxy_entity_id(entity_id, "2206237016")
        assert result is not None
        assert result.domain == expected_domain
        assert result.raw_suffix == expected_suffix

    # ------------------------------------------------------------------
    # Audited proxy control domains (expected to fail against stale parser)
    # ------------------------------------------------------------------

    def test_accepts_switch_control_with_cfg_suffix(self):
        """switch.oig_local_2206237016_tbl_invertor_prms_to_grid_cfg"""
        entity_id = "switch.oig_local_2206237016_tbl_invertor_prms_to_grid_cfg"
        result = normalize_proxy_entity_id(entity_id, "2206237016")
        assert result is not None
        assert result.domain == "switch"
        assert result.raw_suffix == "tbl_invertor_prms_to_grid_cfg"
        assert result.is_control is True

    def test_accepts_number_control_with_cfg_suffix(self):
        """number.oig_local_dev01_tbl_batt_prms_bat_min_cfg"""
        entity_id = "number.oig_local_dev01_tbl_batt_prms_bat_min_cfg"
        result = normalize_proxy_entity_id(entity_id, "dev01")
        assert result is not None
        assert result.domain == "number"
        assert result.raw_suffix == "tbl_batt_prms_bat_min_cfg"
        assert result.is_control is True

    @pytest.mark.parametrize(
        "entity_id,box_id,expected_suffix",
        [
            (
                "select.oig_local_dev01_tbl_box_prms_mode_cfg",
                "dev01",
                "tbl_box_prms_mode_cfg",
            ),
            (
                "select.oig_local_dev01_proxy_control_proxy_mode_cfg",
                "dev01",
                "proxy_control_proxy_mode_cfg",
            ),
        ],
    )
    def test_accepts_select_control_with_cfg_suffix(self, entity_id, box_id, expected_suffix):
        result = normalize_proxy_entity_id(entity_id, box_id)
        assert result is not None
        assert result.domain == "select"
        assert result.raw_suffix == expected_suffix
        assert result.is_control is True

    # ------------------------------------------------------------------
    # Negative / rejection cases
    # ------------------------------------------------------------------

    @pytest.mark.parametrize(
        "entity_id,box_id",
        [
            ("sensor.other_thing", "2206237016"),
            ("switch.other_thing", "2206237016"),
            (None, "2206237016"),
            (123, "2206237016"),
        ],
    )
    def test_rejects_malformed_or_non_local_entity(self, entity_id, box_id):
        result = normalize_proxy_entity_id(entity_id, box_id)
        assert result is None

    def test_rejects_wrong_box_id(self):
        entity_id = "sensor.oig_local_2206237016_tbl_actual_aci_wr"
        result = normalize_proxy_entity_id(entity_id, "9999999999")
        assert result is None

    def test_rejects_legacy_tlb_prefix(self):
        """Legacy non-contract alias using tlb_ instead of tbl_ must be rejected.

        The audited /repos/oig-proxy contract uses tbl_ exclusively.
        """
        entity_id = "switch.2206237016_tlb_invertor_prms_to_grid_cfg"
        result = normalize_proxy_entity_id(entity_id, "2206237016")
        assert result is None

    def test_accepts_legacy_format_without_oig_local_prefix(self):
        entity_id = "switch.2206237016_tbl_invertor_prms_to_grid_cfg"
        result = normalize_proxy_entity_id(entity_id, "2206237016")
        assert result is not None
        assert result.domain == "switch"
        assert result.raw_suffix == "tbl_invertor_prms_to_grid_cfg"
        assert result.is_control is True

    def test_rejects_unsupported_domain_even_with_correct_prefix(self):
        entity_id = "light.oig_local_2206237016_tbl_box_prms_mode"
        result = normalize_proxy_entity_id(entity_id, "2206237016")
        assert result is None
