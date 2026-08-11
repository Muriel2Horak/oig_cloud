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

The *defect mechanism* itself -- ``NameError`` before the seam, resolution
under it -- is proven in a fresh interpreter subprocess rather than in this
process. In-process it is order-dependent: a real recorder test that ran
earlier in the same session has already resolved the very same deferred
annotations under the seam, and CPython 3.14 may keep that successful
evaluation cached internally, so the pre-seam ``NameError`` no longer raises.
A child interpreter has no such history, whatever order pytest chose.
"""

from __future__ import annotations

import importlib
import os
import pathlib
import subprocess
import sys

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


#: Exit code the child uses for "Home Assistant now binds these names at
#: runtime, so the seam -- and this evidence -- is moot".
_MOOT_EXIT_CODE = 3

#: Wall-clock ceiling for the child. It only imports Home Assistant and calls
#: ``typing.get_type_hints`` twice; a cold import here costs a few seconds.
_CHILD_TIMEOUT_SECONDS = 300

#: How much child output a failure message carries, per stream.
_CHILD_OUTPUT_TAIL = 4000

# The evidence itself, run by a *fresh* interpreter. ``sys.argv[1]`` is the
# repository root; the parent launches this with ``-I`` (no environment-driven
# path, no user site, no cwd on ``sys.path``) and an explicit minimal
# environment, so nothing but that one argument crosses the process boundary.
_EVIDENCE_SCRIPT = """
import importlib
import sys
import typing

MOOT_EXIT_CODE = 3


def fail(message):
    print(message, file=sys.stderr)
    raise SystemExit(1)


def main():
    sys.path.insert(0, sys.argv[1])

    # Strictly before any Home Assistant recorder module: the plugin's patch
    # module asserts at import time that it got there first.
    patch_recorder = importlib.import_module(
        "pytest_homeassistant_custom_component.patch_recorder"
    )

    from tests.conftest import ABSENT, bound_deferred_recorder_annotations

    migration = importlib.import_module(
        "homeassistant.components.recorder.migration"
    )
    helpers_recorder = importlib.import_module("homeassistant.helpers.recorder")

    def current():
        return {
            "Recorder": migration.__dict__.get("Recorder", ABSENT),
            "Session": helpers_recorder.__dict__.get("Session", ABSENT),
        }

    before = current()
    if before["Recorder"] is not ABSENT or before["Session"] is not ABSENT:
        print("Home Assistant now binds these names at runtime; the seam is moot")
        raise SystemExit(MOOT_EXIT_CODE)

    # The exact callables the plugin autospecs. NOT
    # ``migration.validate_db_schema``, which declares the same
    # ``instance: Recorder`` parameter but is never patched by the
    # ``recorder_mock`` fixture, and NOT ``helpers.recorder.session_scope``,
    # which the plugin has already replaced with a wrapper whose globals do
    # carry ``Session`` -- ``real_session_scope`` is the untouched original.
    targets = (
        ("Recorder", "migration._find_schema_errors", migration._find_schema_errors),
        (
            "Session",
            "patch_recorder.real_session_scope",
            patch_recorder.real_session_scope,
        ),
    )

    # Pre-seam: the module-global lookup a PEP 649 ``__annotate__`` call
    # performs -- the one ``unittest.mock`` triggers while building an
    # ``autospec=True`` mock -- must blow up on the deferred name.
    for name, label, target in targets:
        try:
            typing.get_type_hints(target)
        except NameError as exc:
            if name not in str(exc):
                fail("%s: expected NameError naming %s, got %r" % (label, name, exc))
        else:
            fail("%s: %s resolved without the seam" % (label, name))

    # In-seam: both resolve.
    with bound_deferred_recorder_annotations():
        for name, label, target in targets:
            try:
                typing.get_type_hints(target)
            except NameError as exc:
                fail("%s: %s did not resolve under the seam: %r" % (label, name, exc))

    # Post-seam: both namespaces are back to their exact prior state. This
    # reads the namespaces only -- no CPython private annotation cache is
    # inspected or cleared.
    after = current()
    for name, previous in before.items():
        namespace = migration if name == "Recorder" else helpers_recorder
        if previous is ABSENT:
            if name in namespace.__dict__:
                fail(
                    "%s.%s was absent before the seam and must be absent again"
                    % (namespace.__name__, name)
                )
        elif after[name] is not previous:
            fail(
                "%s.%s was not restored to its exact prior value"
                % (namespace.__name__, name)
            )

    print("recorder deferred-annotation evidence proven")


main()
"""


def _decode(stream: object) -> str:
    if stream is None:
        return ""
    if isinstance(stream, bytes):
        return stream.decode("utf-8", "replace")
    return str(stream)


def _child_context(stdout: object, stderr: object) -> str:
    """Failure diagnostics: the child's own output, nothing else.

    Only what the script above printed is reproduced -- never the parent
    environment, which is not passed to the child in the first place.
    """
    return (
        "--- child stdout ---\n"
        f"{_decode(stdout)[-_CHILD_OUTPUT_TAIL:]}\n"
        "--- child stderr ---\n"
        f"{_decode(stderr)[-_CHILD_OUTPUT_TAIL:]}"
    )


def test_deferred_annotations_resolve_only_under_the_seam():
    """Reproduce the defect mechanism in a fresh interpreter.

    ``typing.get_type_hints`` performs the same module-global lookup that a
    PEP 649 ``__annotate__`` call performs, and that ``unittest.mock``
    triggers while building an ``autospec=True`` mock.
    ``patch_recorder.real_session_scope`` is exactly the callable the Home
    Assistant plugin autospecs on the session side, and
    ``migration._find_schema_errors`` is exactly the one its ``recorder_mock``
    fixture autospecs on the migration side.

    Why a subprocess: in this process the evidence is order-dependent. Any
    real recorder test that ran earlier in the session already resolved these
    same deferred annotations under the seam, and CPython 3.14 may keep that
    successful evaluation cached internally -- so the pre-seam ``NameError``
    stops raising, and whether this test passes comes down to which test file
    pytest happened to run first. The child starts from nothing, so the
    evidence holds in any order, and no private annotation cache is touched.
    """
    repo_root = str(pathlib.Path(__file__).resolve().parents[1])
    command = [sys.executable, "-I", "-c", _EVIDENCE_SCRIPT, repo_root]
    # Deliberately not ``os.environ``: the child needs nothing from it, and an
    # inherited environment is how secrets leak into captured output.
    child_env = {"PATH": os.defpath}

    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=_CHILD_TIMEOUT_SECONDS,
            cwd=repo_root,
            env=child_env,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        pytest.fail(
            "recorder deferred-annotation evidence subprocess exceeded "
            f"{_CHILD_TIMEOUT_SECONDS}s\n{_child_context(exc.stdout, exc.stderr)}"
        )

    if completed.returncode == _MOOT_EXIT_CODE:
        pytest.skip(
            completed.stdout.strip()
            or "Home Assistant now binds these names at runtime; the seam is moot"
        )

    assert completed.returncode == 0, (
        "recorder deferred-annotation evidence failed in a fresh interpreter "
        f"(exit {completed.returncode})\n"
        f"{_child_context(completed.stdout, completed.stderr)}"
    )
    assert "recorder deferred-annotation evidence proven" in completed.stdout, (
        "recorder deferred-annotation evidence subprocess exited 0 without "
        f"proving anything\n{_child_context(completed.stdout, completed.stderr)}"
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
