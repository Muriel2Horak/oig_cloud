from custom_components.oig_cloud.config.steps import WizardMixin


def test_sanitize_data_source_mode():
    assert WizardMixin._sanitize_data_source_mode(None) == "cloud_only"
    assert WizardMixin._sanitize_data_source_mode("hybrid") == "local_only"
    assert WizardMixin._sanitize_data_source_mode("local_only") == "local_only"


def test_migrate_old_pricing_data_percentage_dual():
    data = {
        "spot_pricing_model": "percentage",
        "spot_positive_fee_percent": 10.0,
        "spot_negative_fee_percent": 5.0,
        "dual_tariff_enabled": True,
        "export_pricing_model": "percentage",
        "export_fee_percent": 12.0,
    }

    migrated = WizardMixin._migrate_old_pricing_data(data)

    assert migrated["import_pricing_scenario"] == "spot_percentage_2tariff"
    assert migrated["export_pricing_scenario"] == "spot_percentage_2tariff"
    assert migrated["import_spot_positive_fee_percent_vt"] == 10.0
    assert migrated["import_spot_negative_fee_percent_nt"] == 5.0
    assert migrated["tariff_vt_start_weekday"] == "6"
    assert migrated["tariff_weekend_same_as_weekday"] is True


def test_migrate_old_pricing_data_fixed_prices_single():
    data = {
        "spot_pricing_model": "fixed_prices",
        "dual_tariff_enabled": False,
        "fixed_commercial_price_vt": 4.2,
        "export_pricing_model": "fixed",
        "export_fixed_fee_czk": 0.3,
    }

    migrated = WizardMixin._migrate_old_pricing_data(data)

    assert migrated["import_pricing_scenario"] == "fix_1tariff"
    assert migrated["import_fixed_price"] == 4.2
    assert migrated["export_pricing_scenario"] == "spot_fixed_1tariff"
    assert migrated["export_spot_fixed_fee_czk"] == 0.3


def test_map_pricing_to_backend():
    wizard_data = {
        "import_pricing_scenario": "spot_fixed",
        "spot_fixed_fee_kwh": 0.55,
        "export_pricing_scenario": "fix_price",
        "export_fixed_price_kwh": 2.6,
        "tariff_count": "dual",
        "distribution_fee_vt_kwh": 1.5,
        "distribution_fee_nt_kwh": 0.9,
        "tariff_vt_start_weekday": "6",
        "tariff_nt_start_weekday": "22,2",
        "tariff_weekend_same_as_weekday": True,
        "vat_rate": 20.0,
    }

    backend = WizardMixin._map_pricing_to_backend(wizard_data)

    assert backend["spot_pricing_model"] == "fixed"
    assert backend["spot_fixed_fee_mwh"] == 550.0
    assert backend["export_pricing_model"] == "fixed_prices"
    assert backend["export_fixed_price"] == 2.6
    assert backend["dual_tariff_enabled"] is True
    assert backend["distribution_fee_nt_kwh"] == 0.9
    assert backend["tariff_vt_start_weekend"] == "6"
    assert backend["vat_rate"] == 20.0


def test_map_backend_to_frontend():
    backend_data = {
        "spot_pricing_model": "fixed_prices",
        "fixed_commercial_price_vt": 4.4,
        "fixed_commercial_price_nt": 3.1,
        "export_pricing_model": "fixed",
        "export_fixed_fee_czk": 0.25,
        "dual_tariff_enabled": True,
        "distribution_fee_vt_kwh": 1.4,
        "distribution_fee_nt_kwh": 0.8,
        "tariff_vt_start_weekday": "7",
        "tariff_nt_start_weekday": "21,2",
        "tariff_vt_start_weekend": "8",
        "tariff_nt_start_weekend": "23,1",
        "tariff_weekend_same_as_weekday": False,
        "vat_rate": 19.0,
    }

    frontend = WizardMixin._map_backend_to_frontend(backend_data)

    assert frontend["import_pricing_scenario"] == "fix_price"
    assert frontend["fixed_price_vt_kwh"] == 4.4
    assert frontend["fixed_price_nt_kwh"] == 3.1
    assert frontend["export_pricing_scenario"] == "spot_fixed"
    assert frontend["export_fixed_fee_czk"] == 0.25
    assert frontend["tariff_count"] == "dual"
    assert frontend["tariff_weekend_same_as_weekday"] is False
    assert frontend["vat_rate"] == 19.0
