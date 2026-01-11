from __future__ import annotations

from types import SimpleNamespace

from custom_components.oig_cloud.config.steps import WizardMixin


class DummyWizard(WizardMixin):
    def __init__(self):
        super().__init__()
        self.hass = SimpleNamespace(states=SimpleNamespace(get=lambda _eid: None))


def test_build_options_payload_maps_pricing_and_defaults():
    flow = DummyWizard()
    wizard_data = {
        "standard_scan_interval": 60,
        "extended_scan_interval": 600,
        "data_source_mode": "cloud_only",
        "local_proxy_stale_minutes": 15,
        "local_event_debounce_ms": 500,
        "enable_pricing": True,
        "tariff_count": "dual",
        "import_pricing_scenario": "spot_percentage",
        "spot_positive_fee_percent": 12.5,
        "spot_negative_fee_percent": 8.5,
        "export_pricing_scenario": "fix_price",
        "export_fixed_price_kwh": 2.9,
        "distribution_fee_vt_kwh": 1.7,
        "distribution_fee_nt_kwh": 0.9,
        "tariff_vt_start_weekday": "6",
        "tariff_nt_start_weekday": "22,2",
        "tariff_weekend_same_as_weekday": True,
        "vat_rate": 20.0,
    }

    payload = flow._build_options_payload(wizard_data)

    assert payload["standard_scan_interval"] == 60
    assert payload["extended_scan_interval"] == 600
    assert payload["data_source_mode"] == "cloud_only"
    assert payload["local_proxy_stale_minutes"] == 15
    assert payload["local_event_debounce_ms"] == 500

    assert payload["spot_pricing_model"] == "percentage"
    assert payload["spot_positive_fee_percent"] == 12.5
    assert payload["spot_negative_fee_percent"] == 8.5
    assert payload["export_pricing_model"] == "fixed_prices"
    assert payload["export_fixed_price"] == 2.9
    assert payload["dual_tariff_enabled"] is True
    assert payload["tariff_vt_start_weekday"] == "6"
    assert payload["tariff_nt_start_weekday"] == "22,2"
    assert payload["tariff_weekend_same_as_weekday"] is True
    assert payload["vat_rate"] == 20.0
