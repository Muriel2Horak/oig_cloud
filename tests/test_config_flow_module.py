from custom_components.oig_cloud import config_flow
from custom_components.oig_cloud.config.steps import ConfigFlow as StepsConfigFlow


def test_config_flow_exports():
    assert issubclass(config_flow.ConfigFlow, StepsConfigFlow)
    assert "ConfigFlow" in config_flow.__all__
