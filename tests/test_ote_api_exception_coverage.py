from __future__ import annotations

import pytest

from custom_components.oig_cloud.api import ote_api as ote_api_module


@pytest.mark.asyncio
async def test_load_cached_spot_prices_sync_exception_when_cache_file_corrupted(monkeypatch):
    """Test exception handling when cache file is corrupted."""
    import json

    ote = ote_api_module.OteApi()

    class MockOS:
        def exists(self, path):
            return True

        def remove(self, path):
            raise RuntimeError("delete boom")

    monkeypatch.setattr("os.path.exists", MockOS.exists)
    monkeypatch.setattr("os.path.isfile", MockOS.exists)
    monkeypatch.setattr("os.remove", MockOS.remove)

    result = ote._load_cached_spot_prices_sync()

    assert result is None


@pytest.mark.asyncio
async def test_load_cached_spot_prices_sync_exception_when_cache_file_load_fails(monkeypatch):
    """Test exception handling when cache file load fails."""
    ote = ote_api_module.OteApi()

    class MockJSON:
        @staticmethod
        def load(fp):
            raise RuntimeError("json load boom")

    monkeypatch.setattr("json.load", MockJSON.load)

    result = ote._load_cached_spot_prices_sync()

    assert result is None
