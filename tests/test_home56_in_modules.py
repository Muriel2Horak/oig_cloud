"""Home 5/6 is a capability of the box, so it must not depend on the boiler.

The switch lived in the boiler section, collapsed under "Zdroje tepla". Without
the boiler module it could not be reached at all, even though it decides whether
the control panel offers the Home 5 and Home 6 toggles.
"""

from __future__ import annotations

from custom_components.oig_cloud.config.boiler_steps import get_boiler_simple_6_schema
from custom_components.oig_cloud.config.steps import WizardMixin
from custom_components.oig_cloud.config_registry import FIELD_REGISTRY


def _keys(schema):
    return {str(key) for key in schema.schema}


def test_registered_in_the_modules_section():
    field = FIELD_REGISTRY["box_has_home56"]

    assert field.section == "modules"
    assert field.reload_on_change is True


def test_offered_in_the_modules_step():
    schema = WizardMixin._get_modules_schema(WizardMixin(), {"box_has_home56": True})

    assert "box_has_home56" in _keys(schema)
    assert schema({})["box_has_home56"] is True


def test_not_offered_in_the_boiler_step():
    assert "box_has_home56" not in _keys(get_boiler_simple_6_schema())


def test_saved_without_the_boiler_module():
    options = WizardMixin._build_base_options(
        {"box_has_home56": True, "enable_boiler": False}
    )

    assert options["box_has_home56"] is True
