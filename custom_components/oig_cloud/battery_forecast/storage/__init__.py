"""Storage helpers for battery forecast plans."""

from __future__ import annotations

from .plan_archive import build_archive_entry, build_day_actual_series
from .plan_revisions import maybe_record_plan_revision
from .plan_storage_aggregate import (
    aggregate_daily,
    aggregate_weekly,
    backfill_daily_archive_from_storage,
)
from .plan_storage_baseline import (
    create_baseline_plan,
    ensure_plan_exists,
    is_baseline_plan_invalid,
)
from .plan_storage_daily import maybe_fix_daily_plan
from .plan_storage_io import (
    load_plan_from_storage,
    plan_exists_in_storage,
    save_plan_to_storage,
)

__all__ = [
    "aggregate_daily",
    "aggregate_weekly",
    "backfill_daily_archive_from_storage",
    "build_archive_entry",
    "build_day_actual_series",
    "create_baseline_plan",
    "ensure_plan_exists",
    "is_baseline_plan_invalid",
    "load_plan_from_storage",
    "maybe_fix_daily_plan",
    "maybe_record_plan_revision",
    "plan_exists_in_storage",
    "save_plan_to_storage",
]
