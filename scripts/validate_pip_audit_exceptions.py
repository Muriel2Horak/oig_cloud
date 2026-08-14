#!/usr/bin/env python3
"""Validate temporary pip-audit exceptions before emitting exact advisory IDs."""

from __future__ import annotations

import argparse
from datetime import date, datetime, timezone
import json
from pathlib import Path
import re
import sys
from typing import Any

MAX_ACCEPTANCE_DAYS = 30
VULNERABILITY_ID = re.compile(r"^(?:CVE-\d{4}-\d+|GHSA-[0-9a-z-]+)$")
PACKAGE_NAME = re.compile(r"^[A-Za-z0-9_.-]+$")
REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
POLICY_PATH = REPOSITORY_ROOT / "scripts" / "pip-audit-exceptions.json"
LOCK_PATHS = {
    "requirements.txt": REPOSITORY_ROOT / "requirements.txt",
    "requirements-dev.txt": REPOSITORY_ROOT / "requirements-dev.txt",
}
REQUIRED_FIELDS = {
    "package",
    "version",
    "vulnerability_ids",
    "fixed_versions",
    "accepted_on",
    "expires_on",
    "owner",
    "reason",
    "reachability",
    "remediation",
}
REQUIRED_TOP_LEVEL_FIELDS = {"schema_version", "exceptions"}


class PolicyError(ValueError):
    """Raised when a security exception is unsafe or no longer applicable."""


def _parse_date(value: Any, field: str) -> date:
    if not isinstance(value, str):
        raise PolicyError(f"{field} must be an ISO date")
    try:
        return date.fromisoformat(value)
    except ValueError as err:
        raise PolicyError(f"{field} must be an ISO date") from err


def _locked_version(requirements: str, package: str) -> str | None:
    normalized = package.lower().replace("_", "-")
    matches: list[str] = []
    for line in requirements.splitlines():
        name, separator, remainder = line.partition("==")
        if not separator or not PACKAGE_NAME.fullmatch(name):
            continue
        if name.lower().replace("_", "-") != normalized:
            continue
        tokens = remainder.split()
        if len(tokens) not in {1, 2} or (len(tokens) == 2 and tokens[1] != "\\"):
            raise PolicyError(
                f"lock must contain exactly one unconditional {package} pin"
            )
        matches.append(tokens[0])
    if len(matches) > 1:
        raise PolicyError(f"lock must contain exactly one unconditional {package} pin")
    return matches[0] if matches else None


def _nonempty_text(entry: dict[str, Any], field: str) -> str:
    value = entry.get(field)
    if not isinstance(value, str) or len(value.strip()) < 8:
        raise PolicyError(f"{field} must contain a substantive explanation")
    return value.strip()


def _required_string(entry: dict[str, Any], field: str) -> str:
    value = entry.get(field)
    if not isinstance(value, str) or not value.strip():
        raise PolicyError(f"{field} must be a non-empty string")
    return value.strip()


def _validated_exceptions(policy: dict[str, Any]) -> list[dict[str, Any]]:
    if set(policy) != REQUIRED_TOP_LEVEL_FIELDS:
        raise PolicyError("top-level policy fields do not match the required schema")
    if policy.get("schema_version") != 1:
        raise PolicyError("unsupported exception policy schema")
    exceptions = policy.get("exceptions")
    if not isinstance(exceptions, list) or not exceptions:
        raise PolicyError("exception policy must contain at least one exception")
    if not all(isinstance(entry, dict) for entry in exceptions):
        raise PolicyError("exception fields do not match the required schema")
    return exceptions


def _validate_acceptance_dates(
    entry: dict[str, Any], package: str, today: date
) -> date:
    accepted_on = _parse_date(entry["accepted_on"], "accepted_on")
    expires_on = _parse_date(entry["expires_on"], "expires_on")
    acceptance_days = (expires_on - accepted_on).days
    if not 1 <= acceptance_days <= MAX_ACCEPTANCE_DAYS:
        raise PolicyError(
            f"{package} acceptance must expire within {MAX_ACCEPTANCE_DAYS} days"
        )
    if today > expires_on:
        raise PolicyError(f"{package} exception expired on {expires_on.isoformat()}")
    if today < accepted_on:
        raise PolicyError(
            f"{package} exception does not begin until {accepted_on.isoformat()}"
        )
    return expires_on


def _validate_advisories(entry: dict[str, Any], emitted: set[str]) -> list[str]:
    vulnerability_ids = entry["vulnerability_ids"]
    fixed_versions = entry["fixed_versions"]
    valid_ids = (
        isinstance(vulnerability_ids, list)
        and bool(vulnerability_ids)
        and vulnerability_ids == sorted(set(vulnerability_ids))
        and all(
            isinstance(item, str) and VULNERABILITY_ID.fullmatch(item)
            for item in vulnerability_ids
        )
    )
    if not valid_ids:
        raise PolicyError("vulnerability_ids must be unique, sorted CVE/GHSA IDs")
    valid_fixes = (
        isinstance(fixed_versions, dict)
        and set(fixed_versions) == set(vulnerability_ids)
        and all(
            isinstance(item, str) and item.strip() for item in fixed_versions.values()
        )
    )
    if not valid_fixes:
        raise PolicyError("fixed_versions must cover every accepted vulnerability")
    if emitted.intersection(vulnerability_ids):
        raise PolicyError("a vulnerability ID may appear in only one exception")
    return vulnerability_ids


def validate_policy(
    policy: dict[str, Any], requirements: str, *, today: date
) -> list[str]:
    """Return exact accepted IDs after validating every exception boundary."""
    emitted: list[str] = []
    packages: set[str] = set()
    for entry in _validated_exceptions(policy):
        if set(entry) != REQUIRED_FIELDS:
            raise PolicyError("exception fields do not match the required schema")
        package = _required_string(entry, "package")
        version = _required_string(entry, "version")
        normalized_package = package.lower().replace("_", "-")
        if normalized_package in packages:
            raise PolicyError(f"duplicate package exception: {package}")
        packages.add(normalized_package)
        for field in ("owner", "reason", "reachability", "remediation"):
            _nonempty_text(entry, field)
        expires_on = _validate_acceptance_dates(entry, package, today)

        locked = _locked_version(requirements, package)
        if locked != version:
            found = locked if locked is not None else "not installed"
            raise PolicyError(
                f"exception requires {package}=={version}; lock contains {found}"
            )

        vulnerability_ids = _validate_advisories(entry, set(emitted))

        print(
            "ACCEPTED RISK "
            f"{package}=={version} advisories={','.join(vulnerability_ids)} "
            f"expires={expires_on.isoformat()} owner={entry['owner']}",
            file=sys.stderr,
        )
        emitted.extend(vulnerability_ids)

    return emitted


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--requirements", choices=tuple(LOCK_PATHS), required=True)
    parser.add_argument("--today", type=date.fromisoformat)
    parser.add_argument("--emit-vulnerability-ids", action="store_true")
    args = parser.parse_args()

    try:
        policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
        requirements = LOCK_PATHS[args.requirements].read_text(encoding="utf-8")
        today = args.today or datetime.now(timezone.utc).date()
        vulnerability_ids = validate_policy(policy, requirements, today=today)
    except (OSError, json.JSONDecodeError, PolicyError) as err:
        print(f"pip-audit exception policy rejected: {err}", file=sys.stderr)
        return 1

    if args.emit_vulnerability_ids:
        print("\n".join(vulnerability_ids))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
