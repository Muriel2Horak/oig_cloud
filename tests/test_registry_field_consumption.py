"""F1 field-propagation audit — every FIELD_REGISTRY key must have a BE consumer.

Static-grep guard (deterministic, no HA runtime needed): for every key in
FIELD_REGISTRY, either a literal read of that key (or its ``CONF_*`` alias from
const.py/boiler/const.py) exists somewhere in the package source outside the
registry/const definition sites, or the key is explicitly listed below with a
comment. A brand-new field wired into the registry but never read by any BE
module fails this test — that is the whole point (see
docs/redesign_2026_07/rework/FIELD-PROPAGATION-MATRIX.md for the full audit
this test was authored alongside).

This is a coarse, textual check — it proves a key is *mentioned* by consumer
code, not that the mention is on a live code path. It deliberately cannot catch
a value read only inside a function nobody calls (three such cases were found
by hand during the audit and are noted in the matrix doc, not here, since grep
alone cannot distinguish them from a real read).
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from custom_components.oig_cloud.config_registry import FIELD_REGISTRY

REPO_ROOT = Path(__file__).resolve().parents[1]
PKG_ROOT = REPO_ROOT / "custom_components" / "oig_cloud"

# Files that only ever *define* keys/defaults — never count as a consumer.
_DEFINITION_FILES = {"config_registry.py", "const.py", "config_flow.py"}
# Directories excluded from the CONSUMER search:
#  - www_v2/translations/__pycache__: FE bundle / generated i18n, not BE source
#  - config/: wizard cross-field validation + one-shot migrations (steps.py,
#    solar_rules.py, modules_validation.py, promote_defaults.py, ...) — this is
#    the WRITE PATH (POST module_config / options-flow save), never a runtime
#    read of the stored value. Mixing it in would call every field "consumed"
#    merely for having a wizard form, defeating the point of this test.
_EXCLUDED_DIRS = {"www_v2", "translations", "__pycache__", "config"}

# --- Explicit allowlist: keys with ZERO textual consumer anywhere in the BE --
#
# Each entry MUST carry a one-line reason. A key here that later grows a real
# consumer is harmless (the grep check would have passed anyway); a key that
# should be here but is missing makes the test FAIL, which is the guard doing
# its job.
KNOWN_DEAD: dict[str, str] = {}

# Reserved for fields that are read but only ever to feed a read-only display
# value (never a runtime decision) — none currently need the escape hatch
# because they all have a textual consumer (see matrix doc's DISPLAY-ONLY
# rows, e.g. confirmed_distribution_distributor/_unit).
DISPLAY_ONLY: dict[str, str] = {}

ALLOWLIST = {**KNOWN_DEAD, **DISPLAY_ONLY}


def _iter_source_files():
    for path in PKG_ROOT.rglob("*.py"):
        rel_parts = path.relative_to(PKG_ROOT).parts
        if any(part in _EXCLUDED_DIRS for part in rel_parts):
            continue
        if path.name in _DEFINITION_FILES:
            continue
        yield path


def _conf_aliases() -> dict[str, list[str]]:
    """Map registry key -> CONF_* constant names that alias it (const.py files)."""
    aliases: dict[str, list[str]] = {}
    for rel in ("const.py", "boiler/const.py"):
        path = PKG_ROOT / rel
        if not path.exists():
            continue
        content = path.read_text(encoding="utf-8")
        for m in re.finditer(
            r'^(CONF_[A-Z0-9_]+)\s*=\s*\(?\s*\n?\s*"([^"]+)"', content, re.M
        ):
            aliases.setdefault(m.group(2), []).append(m.group(1))
    return aliases


_ALIASES = _conf_aliases()
_SOURCE_TEXT = {path: path.read_text(encoding="utf-8") for path in _iter_source_files()}


def _has_consumer(key: str) -> bool:
    patterns = [key] + _ALIASES.get(key, [])
    regex = re.compile(r"\b(" + "|".join(re.escape(p) for p in patterns) + r")\b")
    return any(regex.search(text) for text in _SOURCE_TEXT.values())


@pytest.mark.parametrize("key", sorted(FIELD_REGISTRY.keys()))
def test_field_has_consumer_or_allowlist_entry(key: str):
    if _has_consumer(key):
        return
    assert key in ALLOWLIST, (
        f"registry field {key!r} has no textual consumer anywhere in "
        f"custom_components/oig_cloud (outside config_registry.py/const.py) "
        f"and is not in the KNOWN_DEAD/DISPLAY_ONLY allowlist in this test. "
        f"Either wire it to a BE reader or add it to the allowlist with a reason."
    )


def test_allowlist_entries_are_real_registry_keys():
    stale = set(ALLOWLIST) - set(FIELD_REGISTRY)
    assert not stale, f"allowlist references keys no longer in FIELD_REGISTRY: {stale}"


def test_allowlist_entries_still_have_no_consumer():
    """If one of these grows a real consumer, drop it from the allowlist (it's
    no longer dead) so the matrix doc and this list stay honest."""
    now_consumed = {k for k in ALLOWLIST if _has_consumer(k)}
    assert not now_consumed, (
        f"allowlisted keys now have a textual consumer — remove from the "
        f"allowlist and update the matrix doc verdict: {now_consumed}"
    )
