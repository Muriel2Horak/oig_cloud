"""Config flow entrypoint."""

from .config.steps import ConfigFlow as StepsConfigFlow, OigCloudOptionsFlowHandler
from .const import DOMAIN


class ConfigFlow(StepsConfigFlow, domain=DOMAIN):
    pass

__all__ = ["ConfigFlow", "OigCloudOptionsFlowHandler"]
