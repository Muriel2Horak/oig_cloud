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
        match = re.match(r"^([A-Za-z0-9_.-]+)==([^\s\\]+)(.*)$", line)
        if match and match.group(1).lower().replace("_", "-") == normalized:
            suffix = match.group(3).strip()
            if suffix not in {"", "\\"}:
                raise PolicyError(
                    f"lock must contain exactly one unconditional {package} pin"
                )
            matches.append(match.group(2))
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


def validate_policy(
    policy: dict[str, Any], requirements: str, *, today: date
) -> list[str]:
    """Return exact accepted IDs after validating every exception boundary."""
    if set(policy) != REQUIRED_TOP_LEVEL_FIELDS:
        raise PolicyError("top-level policy fields do not match the required schema")
    if policy.get("schema_version") != 1:
        raise PolicyError("unsupported exception policy schema")
    exceptions = policy.get("exceptions")
    if not isinstance(exceptions, list) or not exceptions:
        raise PolicyError("exception policy must contain at least one exception")

    emitted: list[str] = []
    packages: set[str] = set()
    for entry in exceptions:
        if not isinstance(entry, dict) or set(entry) != REQUIRED_FIELDS:
            raise PolicyError("exception fields do not match the required schema")
        package = _required_string(entry, "package")
        version = _required_string(entry, "version")
        normalized_package = package.lower().replace("_", "-")
        if normalized_package in packages:
            raise PolicyError(f"duplicate package exception: {package}")
        packages.add(normalized_package)
        for field in ("owner", "reason", "reachability", "remediation"):
            _nonempty_text(entry, field)

        accepted_on = _parse_date(entry["accepted_on"], "accepted_on")
        expires_on = _parse_date(entry["expires_on"], "expires_on")
        acceptance_days = (expires_on - accepted_on).days
        if acceptance_days < 1 or acceptance_days > MAX_ACCEPTANCE_DAYS:
            raise PolicyError(
                f"{package} acceptance must expire within {MAX_ACCEPTANCE_DAYS} days"
            )
        if today > expires_on:
            raise PolicyError(f"{package} exception expired on {expires_on.isoformat()}")
        if today < accepted_on:
            raise PolicyError(
                f"{package} exception does not begin until {accepted_on.isoformat()}"
            )

        locked = _locked_version(requirements, package)
        if locked != version:
            found = locked if locked is not None else "not installed"
            raise PolicyError(
                f"exception requires {package}=={version}; lock contains {found}"
            )

        vulnerability_ids = entry["vulnerability_ids"]
        fixed_versions = entry["fixed_versions"]
        if (
            not isinstance(vulnerability_ids, list)
            or not vulnerability_ids
            or vulnerability_ids != sorted(set(vulnerability_ids))
            or not all(
                isinstance(item, str) and VULNERABILITY_ID.fullmatch(item)
                for item in vulnerability_ids
            )
        ):
            raise PolicyError("vulnerability_ids must be unique, sorted CVE/GHSA IDs")
        if (
            not isinstance(fixed_versions, dict)
            or set(fixed_versions) != set(vulnerability_ids)
            or not all(
                isinstance(item, str) and item.strip()
                for item in fixed_versions.values()
            )
        ):
            raise PolicyError("fixed_versions must cover every accepted vulnerability")
        if set(emitted) & set(vulnerability_ids):
            raise PolicyError("a vulnerability ID may appear in only one exception")

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
    parser.add_argument("--policy", type=Path, required=True)
    parser.add_argument("--requirements", type=Path, required=True)
    parser.add_argument("--today", type=date.fromisoformat)
    parser.add_argument("--emit-vulnerability-ids", action="store_true")
    args = parser.parse_args()

    try:
        policy = json.loads(args.policy.read_text(encoding="utf-8"))
        requirements = args.requirements.read_text(encoding="utf-8")
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
