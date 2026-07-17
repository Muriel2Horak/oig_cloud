"""Onboarding soft-guide state (Plan 3 Task 11).

SCOPE-REVISION #6: onboarding is a SOFT guide — there is NO ``locked`` concept and no
endpoint may imply one. An existing user sees a banner, never a wall. See state.py.
"""
from .state import (  # noqa: F401
    ONBOARDING_STEPS,
    SCHEMA_VERSION,
    OnboardingState,
    is_grandfathered,
)
