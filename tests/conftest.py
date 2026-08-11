import sys
import types
from typing import Any, Dict, Optional
from unittest.mock import AsyncMock, Mock

import pytest

if "opentelemetry" not in sys.modules:
    otel = types.ModuleType("opentelemetry")
    trace = types.ModuleType("opentelemetry.trace")

    def _get_tracer(*_args, **_kwargs):
        class _DummyTracer:
            def start_as_current_span(self, *_a, **_k):
                class _DummySpan:
                    def __enter__(self):
                        return self

                    def __exit__(self, *_exc):
                        return False

                return _DummySpan()

        return _DummyTracer()

    trace.get_tracer = _get_tracer
    otel.trace = trace
    sys.modules["opentelemetry"] = otel
    sys.modules["opentelemetry.trace"] = trace


@pytest.fixture
def mock_api() -> Mock:
    """Create a mock OigCloudApi-like instance for unit tests."""
    api: Mock = Mock()

    api.get_stats = AsyncMock(
        return_value={"device1": {"actual": {}, "box_prms": {"mode": 1}}}
    )

    async def mock_get_extended_stats(
        name: str, from_date: str, to_date: str
    ) -> Dict[str, Any]:
        return {}

    api.get_extended_stats = AsyncMock(side_effect=mock_get_extended_stats)

    async def mock_get_notifications(device_id: Optional[str] = None) -> Dict[str, Any]:
        return {"status": "success", "content": ""}

    api.get_notifications = AsyncMock(side_effect=mock_get_notifications)
    api.authenticate = AsyncMock(return_value=True)
    api.get_session = Mock(return_value=types.SimpleNamespace(close=AsyncMock()))

    async def mock_set_box_params_internal(table: str, column: str, value: str) -> bool:
        return True

    api.set_box_params_internal = AsyncMock(side_effect=mock_set_box_params_internal)

    api.set_box_mode = AsyncMock(return_value=True)
    api.set_grid_delivery_limit = AsyncMock(return_value=True)
    api.set_boiler_mode = AsyncMock(return_value=True)
    api.set_ssr_rele_1 = AsyncMock(return_value=True)
    api.set_ssr_rele_2 = AsyncMock(return_value=True)
    api.set_ssr_rele_3 = AsyncMock(return_value=True)
    api.set_grid_delivery = AsyncMock(return_value=True)
    api.set_battery_formating = AsyncMock(return_value=True)
    api.set_formating_mode = AsyncMock(return_value=True)

    api.box_id = "test_device_id"
    api.last_state = None
    api.last_parsed_state = None
    api._phpsessid = "test-session"

    return api


@pytest.fixture(autouse=True)
def _reset_integration_version_cache() -> Any:
    """Reset the process-global integration-version cache between tests.

    The manifest version resolver caches for the process lifetime (the file is
    immutable at runtime). Tests that drive the executor path with stub hass
    objects can otherwise pollute the cache ("unknown") for later tests. This
    fixture makes each test start uncached without weakening production caching.
    """
    try:
        from custom_components.oig_cloud.shared import integration_version as mod

        mod._CACHED_VERSION = None
    except Exception:
        pass
    yield
    try:
        from custom_components.oig_cloud.shared import integration_version as mod

        mod._CACHED_VERSION = None
    except Exception:
        pass
