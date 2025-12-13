"""Backward-compatible wrapper for OIG Cloud API.

Some parts of the code (old wizards/tests) still import
`custom_components.oig_cloud.api.oig_cloud_api`. The real implementation
now lives in `custom_components.oig_cloud.lib.oig_cloud_client.api.oig_cloud_api`.
This module simply re-exports those symbols to keep imports working and
to satisfy deployment checks that expect this path to exist.
"""

from ..lib.oig_cloud_client.api.oig_cloud_api import *  # noqa: F401,F403

