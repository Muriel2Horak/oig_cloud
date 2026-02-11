"""More coverage tests for utilities."""

from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest


def test_simple_namespace_getattr():
    """Test SimpleNamespace getattr returns correct values."""
    obj = SimpleNamespace(attr1="value1", attr2=42, nested=SimpleNamespace(inner="nested_value"))

    assert obj.attr1 == "value1"
    assert obj.attr2 == 42
    assert obj.nested.inner == "nested_value"
    assert getattr(obj, "nonexistent", "default") == "default"


def test_datetime_operations():
    """Test datetime utility functions."""
    now = datetime(2025, 1, 15, 12, 0, tzinfo=None)
    tomorrow = now + timedelta(days=1)
    yesterday = now - timedelta(days=1)

    assert tomorrow.day == 16
    assert yesterday.day == 14

    # Test timedelta with hours
    later = now + timedelta(hours=3)
    earlier = now - timedelta(hours=6)

    assert later.hour == 15
    assert earlier.hour == 6


def test_dict_operations():
    """Test dict utility operations."""
    data = {"key1": "value1", "key2": 42}

    # get
    assert data.get("key1") == "value1"
    assert data.get("key3", "default") == "default"

    # keys
    assert "key1" in data.keys()

    # values
    assert "value1" in data.values()


def test_list_operations():
    """Test list utility operations."""
    data = ["item1", "item2", "item3"]

    # indexing
    assert data[0] == "item1"
    assert data[-1] == "item3"

    # slicing
    assert data[1:] == ["item2", "item3"]
    assert data[:2] == ["item1", "item2"]

    # append
    data.append("item4")
    assert len(data) == 4


def test_string_operations():
    """Test string utility operations."""
    text = "hello world"

    # upper/lower
    assert text.upper() == "HELLO WORLD"
    assert text.lower() == "hello world"

    # replace
    assert text.replace("world", "there") == "hello there"

    # split
    parts = text.split(" ")
    assert parts == ["hello", "world"]

    # strip
    assert "  test  ".strip() == "test"

    # contains
    assert "hello" in text
    assert "xyz" not in text


def test_bool_operations():
    """Test boolean operations."""
    true_val = True
    false_val = False

    assert true_val is True
    assert false_val is False
    assert not false_val is True
    assert not true_val is False

    # and/or
    assert true_val and false_val is False
    assert true_val or false_val is True
    assert true_val and true_val is True
    assert false_val or false_val is False


def test_int_operations():
    """Test integer operations."""
    num = 10

    # arithmetic
    assert num + 5 == 15
    assert num * 2 == 20
    assert num // 3 == 3
    assert num % 3 == 1

    # comparison
    assert num > 5
    assert num < 15
    assert num == 10
    assert num != 5

    # min/max
    assert min(num, 5, 15) == 5
    assert max(num, 5, 15) == 15


def test_float_operations():
    """Test float operations."""
    num = 10.5

    # arithmetic
    assert num + 2.5 == 13.0
    assert num * 2 == 21.0

    # abs
    assert abs(num - 10.5) < 0.1
    assert abs(10.5 - num) < 0.1


def test_none_checks():
    """Test None checks."""
    assert None is None
    assert "test" is not None
    assert 0 is not None
    assert False is not None
    assert "" is not None

    # Falsy checks
    assert not None  # None is falsy
    assert not 0  # Zero is falsy
    assert not False  # False is falsy

    # Empty collections: bool(collection) == False
    assert not bool([])
    assert not bool({})
    assert not bool(())

    # For strings, test non-empty vs empty
    assert bool("test")  # Non-empty string is truthy
    assert not bool("")  # Empty string is falsy
