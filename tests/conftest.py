import contextlib
import importlib
import sys
import types
from typing import Any, Dict, Iterator, Optional
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


class _Absent:
    """Marker for "this attribute was not in the namespace at all"."""

    __slots__ = ()

    def __repr__(self) -> str:  # pragma: no cover - debugging aid only
        return "<absent>"


ABSENT = _Absent()

# Names Home Assistant declares only under ``TYPE_CHECKING``, together with the
# runtime object each one refers to. Under PEP 649 (CPython 3.14) annotations
# are evaluated lazily by a module's ``__annotate__`` function, and
# ``unittest.mock`` walks annotations when it builds an ``autospec=True`` mock.
# The Home Assistant test plugin autospecs both of these modules while setting
# up its ``recorder_mock`` fixture, so on 3.14 that setup raises ``NameError:
# Recorder`` and then ``NameError: Session`` before a single test line runs.
_DEFERRED_RECORDER_ANNOTATIONS = (
    (
        "homeassistant.components.recorder.migration",
        "Recorder",
        "homeassistant.components.recorder",
        "Recorder",
    ),
    (
        "homeassistant.helpers.recorder",
        "Session",
        "sqlalchemy.orm",
        "Session",
    ),
)

#: Namespace state the seam observed immediately before it resolved the Home
#: Assistant plugin fixture. Stashed on the test node so a test can prove the
#: binding happened *before* plugin autospec resolution rather than merely
#: being true by the time the test body runs.
RECORDER_COMPAT_SNAPSHOT: "pytest.StashKey[Dict[str, Any]]" = pytest.StashKey()


@contextlib.contextmanager
def bound_deferred_recorder_annotations() -> Iterator[Dict[str, Any]]:
    """Bind the deferred recorder annotation names for the duration of a block.

    Yields the namespace state produced by the binding. On exit each namespace
    is put back exactly as it was found -- an attribute that was *absent*
    beforehand is deleted again, not set to ``None``. Nothing here runs at
    import time: the mutation lives and dies inside the ``with`` block.
    """
    saved: list[tuple[types.ModuleType, str, Any]] = []
    bound: Dict[str, Any] = {}
    try:
        for (
            target_name,
            attribute,
            source_name,
            source_attribute,
        ) in _DEFERRED_RECORDER_ANNOTATIONS:
            target = importlib.import_module(target_name)
            source = importlib.import_module(source_name)
            saved.append((target, attribute, target.__dict__.get(attribute, ABSENT)))
            value = getattr(source, source_attribute)
            setattr(target, attribute, value)
            bound[attribute] = value
        yield bound
    finally:
        for target, attribute, previous in reversed(saved):
            if previous is ABSENT:
                target.__dict__.pop(attribute, None)
            else:
                setattr(target, attribute, previous)


@pytest.fixture
def recorder_mock_compat(request: pytest.FixtureRequest) -> Iterator[Any]:
    """``recorder_mock`` with the PEP 649 annotation names bound around it.

    Use this instead of the Home Assistant plugin's ``recorder_mock`` fixture.
    The names must be bound *before* the plugin fixture is set up, which is why
    ``recorder_mock`` is resolved dynamically here rather than declared as a
    parameter -- a declared parameter would be built before this fixture body
    ever ran.
    """
    with bound_deferred_recorder_annotations() as bound:
        request.node.stash[RECORDER_COMPAT_SNAPSHOT] = dict(bound)
        yield request.getfixturevalue("recorder_mock")


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
    immutable at runtime). Tests that stub the manifest read would otherwise
    leave their value visible to every later test in the same process. This
    fixture makes each test start uncached without weakening production
    caching. The per-loop lock needs no reset: it is held in a
    ``WeakKeyDictionary`` keyed by the event loop.
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
