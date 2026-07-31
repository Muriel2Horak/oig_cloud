"""Module cross-field rules — the SINGLE source for module dependency checks.

Called by BOTH the onboarding wizard and the dashboard REST POST, so a module
toggle can never persist a configuration the other surface would reject
(live finding: REST accepted enable_battery_prediction=true with
enable_solar_forecast=false, which the wizard blocks).

Pure functions, no Home Assistant imports: importable from tests and from the
REST layer alike, matching the `config/solar_rules.py` pattern.
"""
from __future__ import annotations

from typing import Any, Dict, List

# Mirrors the wizard's dashboard gate: dashboard needs every other module on.
_DASHBOARD_REQUIREMENTS = (
    ("enable_statistics", "Statistiky"),
    ("enable_solar_forecast", "Solární předpověď"),
    ("enable_battery_prediction", "Predikce baterie"),
    ("enable_pricing", "Cenové senzory a spotové ceny"),
    ("enable_extended_sensors", "Rozšířené senzory"),
)


def missing_dashboard_requirements(effective: Dict[str, Any]) -> List[str]:
    """Return the (Czech) labels of modules the dashboard needs but lacks."""
    return [label for key, label in _DASHBOARD_REQUIREMENTS if not effective.get(key)]


def validate_modules_selection(effective: Dict[str, Any]) -> Dict[str, str]:
    """Validate the EFFECTIVE (stored ∪ incoming) module selection.

    Returns {field_key: i18n_error_key} -- the WHOLE module cross-field rule
    set, so the wizard and the REST module_config POST cannot drift:

    - enable_battery_prediction requires enable_solar_forecast and
      enable_extended_sensors (was ConfigFlow._validate_modules_selection,
      steps.py:919-933)
    - enable_dashboard requires every other module enabled (was
      ConfigFlow._missing_dashboard_requirements, steps.py:1027-1039)
    """
    errors: Dict[str, str] = {}
    if effective.get("enable_battery_prediction"):
        if not effective.get("enable_solar_forecast"):
            errors["enable_battery_prediction"] = "requires_solar_forecast"
        if not effective.get("enable_extended_sensors"):
            errors["enable_extended_sensors"] = "required_for_battery"

    if effective.get("enable_dashboard") and missing_dashboard_requirements(effective):
        errors["enable_dashboard"] = "dashboard_requires_all"

    return errors
