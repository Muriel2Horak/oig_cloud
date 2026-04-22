from __future__ import annotations

import importlib
import sys
import types
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACKAGE_ROOT = ROOT / "custom_components"
OIG_ROOT = PACKAGE_ROOT / "oig_cloud"
SHARED_ROOT = OIG_ROOT / "shared"
TEST_PACKAGE = "shared_logging_testpkg"


def _ensure_package(name: str, path: Path) -> None:
    module = sys.modules.get(name)
    if module is None:
        module = types.ModuleType(name)
        module.__path__ = [str(path)]
        sys.modules[name] = module


_ensure_package(TEST_PACKAGE, ROOT)
_ensure_package(f"{TEST_PACKAGE}.oig_cloud", OIG_ROOT)
_ensure_package(f"{TEST_PACKAGE}.oig_cloud.shared", SHARED_ROOT)

logging_module = importlib.import_module(f"{TEST_PACKAGE}.oig_cloud.shared.logging")


def test_resolve_no_telemetry_always_returns_false_for_legacy_flags():
    entry = type(
        "Entry",
        (),
        {
            "data": {"no_telemetry": True},
            "options": {"no_telemetry": True},
        },
    )()

    assert logging_module.resolve_no_telemetry(entry) is False


def test_new_relic_bootstrap_api_is_removed_from_logging_module():
    assert not hasattr(logging_module, "SimpleTelemetry")
    assert not hasattr(logging_module, "setup_simple_telemetry")
