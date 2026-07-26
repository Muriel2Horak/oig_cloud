from __future__ import annotations

from custom_components.oig_cloud.ai.backoff import AiBackoffState


def test_first_failure_schedules_30s_backoff():
    now = [100.0]
    backoff = AiBackoffState(now=lambda: now[0])

    state = backoff.record_failure("entry1", "groq")

    assert state.state == "backing_off"
    assert state.attempt == 1
    assert state.next_probe_at == 130.0


def test_backoff_doubles_on_repeated_failure():
    now = [100.0]
    backoff = AiBackoffState(now=lambda: now[0])

    first = backoff.record_failure("entry1", "groq")
    now[0] = first.next_probe_at
    second = backoff.record_failure("entry1", "groq")

    assert second.attempt == 2
    assert second.next_probe_at == 190.0


def test_backoff_caps_at_max_interval():
    now = [0.0]
    backoff = AiBackoffState(now=lambda: now[0], max_interval_s=60)

    first = backoff.record_failure("entry1", "groq")
    now[0] = first.next_probe_at
    second = backoff.record_failure("entry1", "groq")
    now[0] = second.next_probe_at
    third = backoff.record_failure("entry1", "groq")

    assert third.attempt == 3
    assert third.next_probe_at == 150.0


def test_success_resets_state_to_idle():
    now = [100.0]
    backoff = AiBackoffState(now=lambda: now[0])
    backoff.record_failure("entry1", "groq")

    state = backoff.record_success("entry1", "groq")

    assert state.state == "idle"
    assert state.attempt == 0
    assert state.next_probe_at is None
    assert backoff.snapshot("entry1", "groq").state == "idle"


def test_is_due_false_before_next_probe_at_true_after():
    now = [100.0]
    backoff = AiBackoffState(now=lambda: now[0])
    state = backoff.record_failure("entry1", "groq")

    now[0] = state.next_probe_at - 0.1
    assert backoff.is_due("entry1", "groq") is False

    now[0] = state.next_probe_at
    assert backoff.is_due("entry1", "groq") is True
