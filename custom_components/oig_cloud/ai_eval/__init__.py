"""Hourly AI evaluation: deterministic detector + rolling anomaly ledger.

The detector (this package) is PURE, HA-agnostic logic — it takes raw sensor
sample series and produces (events, full-snapshot rows) that an LLM turns into
a plain-language report. HA wiring (recorder fetch, Store, scheduler, sensor)
lives in the adapter/entity layers so the algorithm stays unit-testable.
"""
