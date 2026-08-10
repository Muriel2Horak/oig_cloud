# tests/test_ai_optional.py
"""SCOPE-REVISION #5: AI is optional. These MUST pass on an HA with no ai_task."""
from __future__ import annotations

import builtins
import importlib
import inspect
from pathlib import Path
import re


def test_integration_imports_without_ai_task(monkeypatch):
    """Importing the integration must not require ai_task — asserted by making
    the import genuinely fail, not by importing on a box that happens to have it.

    (`assert oig` after a successful import is vacuous: it can only fail by
    raising, and it passes trivially on any harness that HAS ai_task.)
    """
    real_import = builtins.__import__

    def _no_ai_task(name, *args, **kwargs):
        if name.startswith("homeassistant.components.ai_task"):
            raise ModuleNotFoundError(f"No module named {name!r}")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", _no_ai_task)

    import custom_components.oig_cloud as oig
    importlib.reload(oig)

    assert oig.PLATFORMS, "setup must still declare its non-AI platforms"
    assert all("ai_task" not in str(p).lower() for p in oig.PLATFORMS), \
        "AI_TASK platform must not be forwarded on an HA without ai_task"


def test_ai_task_platform_is_added_only_when_enum_and_module_exist():
    """AI forwarding requires both the enum member and an importable module."""
    from homeassistant.const import Platform

    import custom_components.oig_cloud as oig
    importlib.reload(oig)

    expected = hasattr(Platform, "AI_TASK") and oig._ai_task_platform_available()
    got = any("ai_task" in str(p).lower() for p in oig.PLATFORMS)
    assert got is expected


def test_ai_task_platform_is_unavailable_without_enum_member(monkeypatch):
    """An older HA enum must disable AI discovery before importing its module."""
    from homeassistant.const import Platform

    import custom_components.oig_cloud as oig

    class LegacyPlatform:
        SENSOR = Platform.SENSOR
        SWITCH = Platform.SWITCH

    monkeypatch.setattr(oig, "Platform", LegacyPlatform)

    assert oig._ai_task_platform_available() is False


def test_home_assistant_dependency_pins_match_canonical_input():
    """Runtime and development locks must use the canonical HP HA target."""
    root = Path(__file__).parents[1]
    files = ("requirements.in", "requirements.txt", "requirements-dev.txt")
    versions = {}
    for name in files:
        content = (root / name).read_text(encoding="utf-8")
        match = re.search(r"^homeassistant==([^\s\\]+)", content, re.MULTILINE)
        assert match is not None, f"{name} must declare a Home Assistant version"
        versions[name] = match.group(1)

    assert versions == dict.fromkeys(files, "2026.8.1")


def test_ai_backend_module_has_no_ai_task_dependency():
    """The security-critical code must stay testable on any HA.

    The concern is an actual import of ai_task (which would make the module
    unimportable on pre-2025.8 HA), not the mere appearance of the word — the
    module docstring legitimately explains that it does NOT depend on ai_task,
    so a naive substring check false-positives on prose documenting the absence.
    Assert against the parsed import graph instead.
    """
    import ast

    from custom_components.oig_cloud.ai import backends, key_store
    for mod in (backends, key_store):
        tree = ast.parse(inspect.getsource(mod))
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                assert node.module is None or "ai_task" not in node.module, \
                    f"{mod.__name__} imports from {node.module}"
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    assert "ai_task" not in alias.name, \
                        f"{mod.__name__} imports {alias.name}"
