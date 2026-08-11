"""Contract for the fixture-scoped recorder compatibility seam.

Home Assistant declares two recorder names only under ``TYPE_CHECKING``:

* ``homeassistant.components.recorder.migration.Recorder``
* ``homeassistant.helpers.recorder.Session``

Under PEP 649 (CPython 3.14) an annotation is evaluated lazily by the module's
``__annotate__`` function. ``unittest.mock`` walks annotations when it builds an
``autospec=True`` mock, so the Home Assistant test plugin's ``recorder_mock``
fixture triggers that evaluation during its own setup and the two names blow up
with ``NameError`` -- first ``Recorder`` while autospeccing
``recorder.migration``, then ``Session`` while autospeccing
``patch_recorder.real_session_scope``.

The seam binds both names for the duration of a recorder test and puts the two
module namespaces back exactly as they were, including the case where the
attribute was absent. These tests pin all three halves of that contract:
binding happens *before* the plugin fixture is resolved, the namespaces are
restored after teardown, and a test that does not ask for the seam never sees
the injected attributes.
"""

from __future__ import annotations

import importlib
import sys
import typing

import pytest

from tests.conftest import (
    ABSENT,
    RECORDER_COMPAT_SNAPSHOT,
    bound_deferred_recorder_annotations,
)

MIGRATION = importlib.import_module("homeassistant.components.recorder.migration")
HELPERS_RECORDER = importlib.import_module("homeassistant.helpers.recorder")

# Read at module import time -- pytest imports every test module during
# collection, i.e. strictly before any test (and therefore any seam) runs. This
# is the pristine namespace state the seam has to restore to.
PRISTINE = {
    "Recorder": MIGRATION.__dict__.get("Recorder", ABSENT),
    "Session": HELPERS_RECORDER.__dict__.get("Session", ABSENT),
}


def _current() -> dict[str, object]:
    return {
        "Recorder": MIGRATION.__dict__.get("Recorder", ABSENT),
        "Session": HELPERS_RECORDER.__dict__.get("Session", ABSENT),
    }


@pytest.fixture
def leak_guard():
    """Assert the namespaces are pristine again *after* the seam tore down.

    Requested before ``recorder_mock_compat`` in the test signature, so it is
    set up first and therefore finalised last: its post-yield assertion runs
    after the seam has restored the namespaces.
    """
    before = _current()
    yield
    assert _current() == before, "recorder compatibility seam leaked past teardown"


# ---------------------------------------------------------------------------
# The binding itself
# ---------------------------------------------------------------------------


def test_context_manager_binds_both_deferred_names():
    """Both PEP 649 casualties resolve to the real runtime objects."""
    recorder_pkg = importlib.import_module("homeassistant.components.recorder")
    sqlalchemy_orm = importlib.import_module("sqlalchemy.orm")

    with bound_deferred_recorder_annotations():
        assert MIGRATION.Recorder is recorder_pkg.Recorder
        assert HELPERS_RECORDER.Session is sqlalchemy_orm.Session


def test_context_manager_restores_exact_prior_state_including_absence():
    """Teardown restores identity, and restores *absence* as absence."""
    before = _current()

    with bound_deferred_recorder_annotations():
        pass

    after = _current()
    assert after == before
    for name, previous in before.items():
        namespace = MIGRATION if name == "Recorder" else HELPERS_RECORDER
        if previous is ABSENT:
            assert name not in namespace.__dict__, (
                f"{namespace.__name__}.{name} was absent before the seam and "
                "must be absent again"
            )


@pytest.mark.skipif(
    PRISTINE["Recorder"] is not ABSENT or PRISTINE["Session"] is not ABSENT,
    reason="Home Assistant now binds these names at runtime; the seam is moot",
)
def test_deferred_annotations_resolve_only_under_the_seam():
    """Reproduce the defect mechanism against the real Home Assistant callables.

    ``typing.get_type_hints`` performs the same module-global lookup that a
    PEP 649 ``__annotate__`` call performs, and that ``unittest.mock`` triggers
    while building an ``autospec=True`` mock. ``helpers.recorder.session_scope``
    is exactly the callable the Home Assistant plugin autospecs as
    ``patch_recorder.real_session_scope``, and
    ``migration._find_schema_errors`` is exactly the callable the plugin's
    ``recorder_mock`` fixture autospecs on the ``migration`` side -- not
    ``migration.validate_db_schema``, which the fixture never patches.

    The post-seam proof is namespace restoration, not a repeated
    ``NameError``. Once CPython 3.14's PEP 649 machinery has successfully
    evaluated a deferred annotation, it may keep that successful evaluation
    cached internally -- so a second ``get_type_hints`` call can keep
    succeeding even after the seam has removed ``Recorder``/``Session`` from
    the module namespaces again. That cache is not a namespace leak: the
    attributes themselves, which is what the seam contracts to restore, are
    proven absent (or restored to their exact prior value) below without
    touching any private annotation cache.
    """
    # NOT ``MIGRATION.validate_db_schema``: both declare an identical
    # ``instance: Recorder`` parameter, but the plugin's ``recorder_mock``
    # fixture only ever autospecs ``migration._find_schema_errors`` (see
    # ``pytest_homeassistant_custom_component.plugins``, the
    # ``patch("homeassistant.components.recorder.migration._find_schema_errors",
    # autospec=True)`` inside ``recorder_mock``). That is the callable whose
    # autospec walk raised in the canonical traceback.
    migration_callable = MIGRATION._find_schema_errors
    # NOT ``HELPERS_RECORDER.session_scope``: the plugin has already replaced
    # that attribute with its own wrapper, whose globals do carry ``Session``.
    # The callable the plugin autospecs is the untouched original it kept as
    # ``real_session_scope`` -- and that one resolves against
    # ``homeassistant.helpers.recorder``.
    patch_recorder = sys.modules.get(
        "pytest_homeassistant_custom_component.patch_recorder"
    )
    if patch_recorder is None:  # pragma: no cover - plugin always loaded here
        pytest.skip("Home Assistant recorder patch module not loaded")
    session_scope = patch_recorder.real_session_scope

    before = _current()

    with pytest.raises(NameError, match="Recorder"):
        typing.get_type_hints(migration_callable)
    with pytest.raises(NameError, match="Session"):
        typing.get_type_hints(session_scope)

    with bound_deferred_recorder_annotations():
        typing.get_type_hints(migration_callable)
        typing.get_type_hints(session_scope)

    # Post-seam: prove the module namespaces -- the thing the seam actually
    # contracts to restore -- are back to their exact pre-seam state. Do NOT
    # assert that ``get_type_hints`` raises again: CPython 3.14 may keep the
    # now-successful deferred-annotation evaluation cached internally even
    # after ``Recorder``/``Session`` are gone from the namespace again, so a
    # repeated-``NameError`` assertion is invalid and this test must not
    # depend on that private cache either way.
    after = _current()
    for name, previous in before.items():
        namespace = MIGRATION if name == "Recorder" else HELPERS_RECORDER
        if previous is ABSENT:
            assert name not in namespace.__dict__, (
                f"{namespace.__name__}.{name} was absent before the seam and "
                "must be absent again"
            )
        else:
            assert after[name] is previous, (
                f"{namespace.__name__}.{name} was not restored to its exact "
                "prior value"
            )


def test_context_manager_restores_after_an_exception():
    before = _current()

    with pytest.raises(RuntimeError):
        with bound_deferred_recorder_annotations():
            raise RuntimeError("boom")

    assert _current() == before


# ---------------------------------------------------------------------------
# The fixture wrapping the Home Assistant plugin fixture
# ---------------------------------------------------------------------------


async def test_seam_binds_before_plugin_autospec_resolution(
    leak_guard, recorder_mock_compat, request, hass
):
    """Both names must already be bound when ``recorder_mock`` is resolved.

    The seam records the namespace it observed in the instant before it called
    ``request.getfixturevalue("recorder_mock")``; that snapshot is the ordering
    proof. Asserting it inside the test body would prove nothing, because by
    then the plugin fixture has long finished.
    """
    snapshot = request.node.stash[RECORDER_COMPAT_SNAPSHOT]

    assert snapshot["Recorder"] is not ABSENT
    assert snapshot["Session"] is not ABSENT

    recorder_pkg = importlib.import_module("homeassistant.components.recorder")
    sqlalchemy_orm = importlib.import_module("sqlalchemy.orm")
    assert snapshot["Recorder"] is recorder_pkg.Recorder
    assert snapshot["Session"] is sqlalchemy_orm.Session

    # And the real plugin fixture actually ran.
    assert recorder_mock_compat is not None


def test_unrelated_test_does_not_inherit_the_injected_attributes():
    """A test that never asks for the seam sees the pristine namespaces."""
    assert _current() == PRISTINE
