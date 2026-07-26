"""Stage C1 Task 3: TTL last-working-model cache tests."""
from __future__ import annotations

from custom_components.oig_cloud.ai.model_cache import LastWorkingModelCache


def test_get_returns_none_when_nothing_cached():
    cache = LastWorkingModelCache(ttl_seconds=3600)
    assert cache.get("entry1", "groq") is None


def test_set_then_get_returns_the_model():
    now_val = [0.0]
    cache = LastWorkingModelCache(now=lambda: now_val[0], ttl_seconds=3600)
    cache.set("entry1", "groq", "llama-3.3-70b-versatile")
    assert cache.get("entry1", "groq") == "llama-3.3-70b-versatile"


def test_entry_expires_after_ttl():
    now_val = [0.0]
    cache = LastWorkingModelCache(now=lambda: now_val[0], ttl_seconds=60)
    cache.set("entry1", "groq", "llama-3.3-70b-versatile")
    now_val[0] = 61.0
    assert cache.get("entry1", "groq") is None


def test_cache_is_scoped_per_entry_and_provider():
    cache = LastWorkingModelCache(ttl_seconds=3600)
    cache.set("entry1", "groq", "groq-model")
    assert cache.get("entry1", "nvidia") is None
    assert cache.get("entry2", "groq") is None
    assert cache.get("entry1", "groq") == "groq-model"
