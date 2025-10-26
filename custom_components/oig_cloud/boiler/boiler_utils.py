"""Utilities for atomic file operations."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)


def _sync_save_json(
    data: dict[str, Any], file_path: Path, temp_path: Path, indent: int
) -> bool:
    """Synchronous JSON save for executor.

    Args:
        data: Data to serialize
        file_path: Target file path
        temp_path: Temporary file path
        indent: JSON indentation

    Returns:
        True if successful, False otherwise
    """
    try:
        # Ensure directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # Write to temp file
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=indent, ensure_ascii=False)

        # Atomic rename
        os.replace(temp_path, file_path)

        _LOGGER.debug(f"Atomically saved JSON to {file_path}")
        return True

    except Exception as e:
        _LOGGER.error(f"Failed to save JSON to {file_path}: {e}")
        # Cleanup temp file if exists
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass
        return False


async def atomic_save_json(
    data: dict[str, Any],
    file_path: str | Path,
    indent: int = 2,
    hass: HomeAssistant | None = None,
) -> bool:
    """Atomically save JSON data to file.

    Uses temp file + rename for atomic write.
    Runs in executor to avoid blocking event loop.

    Args:
        data: Data to serialize
        file_path: Target file path
        indent: JSON indentation (default: 2)
        hass: HomeAssistant instance for executor (optional)

    Returns:
        True if successful, False otherwise
    """
    file_path = Path(file_path)
    temp_path = file_path.with_suffix(f"{file_path.suffix}.tmp")

    if hass is not None:
        # Run in executor to avoid blocking
        return await hass.async_add_executor_job(
            _sync_save_json, data, file_path, temp_path, indent
        )
    else:
        # Fallback - direct call (only for tests)
        return _sync_save_json(data, file_path, temp_path, indent)


def _sync_load_json(file_path: Path) -> dict[str, Any] | None:
    """Synchronous JSON load for executor.

    Args:
        file_path: File path to load

    Returns:
        Loaded data or None if failed
    """
    try:
        if not file_path.exists():
            return None

        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)

    except Exception as e:
        _LOGGER.error(f"Failed to load JSON from {file_path}: {e}")
        return None


async def load_json(
    file_path: str | Path, hass: HomeAssistant | None = None
) -> dict[str, Any] | None:
    """Load JSON data from file.

    Runs in executor to avoid blocking event loop.

    Args:
        file_path: Path to JSON file
        hass: HomeAssistant instance for executor (optional)

    Returns:
        Loaded data dict or None if failed
    """
    file_path = Path(file_path)

    if hass is not None:
        # Run in executor to avoid blocking
        return await hass.async_add_executor_job(_sync_load_json, file_path)
    else:
        # Fallback - direct call (only for tests)
        return _sync_load_json(file_path)


def get_oig_data_dir(hass_config_path: str) -> Path:
    """Get OIG data directory path.

    Args:
        hass_config_path: Home Assistant config directory path

    Returns:
        Path to /config/www/oig/ directory
    """
    return Path(hass_config_path) / "www" / "oig"


def get_full_json_url(file_name: str) -> str:
    """Get URL for accessing JSON file via HA.

    Args:
        file_name: Name of file in www/oig/ directory

    Returns:
        Relative URL path
    """
    return f"/local/oig/{file_name}"
