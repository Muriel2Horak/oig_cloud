from __future__ import annotations

from datetime import datetime, timezone

import pytest

from custom_components.oig_cloud.boiler import circulation as module


def test_is_circulation_recommended_always_false():
    """With Task 7c pump-follower redesign, circulation is no longer independently scheduled."""
    now = datetime(2025, 1, 1, 8, 15, tzinfo=timezone.utc)
    assert module.is_circulation_recommended(None, now) is False
    assert module.is_circulation_recommended({}, now) is False
    assert module.is_circulation_recommended(None) is False


def test_circulation_module_has_no_window_builders():
    """Verify obsolete window-building helpers were removed from circulation module."""
    assert not hasattr(module, "build_circulation_windows")
    assert not hasattr(module, "_pick_peak_hours")
