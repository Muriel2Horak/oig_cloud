"""Fix B: per-source daily energy accumulators survive an HA restart.

A mid-day restart/deploy must not zero the day's attribution (otherwise the
"patrona dnes" counter appears to start from the restart instead of midnight).
These tests exercise the real load/save methods bound to a minimal stub.
"""
from __future__ import annotations

import asyncio
import gc
import logging
import threading
from types import SimpleNamespace
import warnings

import pytest

from custom_components.oig_cloud.boiler.runtime import BoilerRuntime, destroy_boiler_runtime
from custom_components.oig_cloud.const import DOMAIN, KEY_BOILER_RUNTIMES
from homeassistant.util import dt as dt_util


class _FakeStore:
    def __init__(self, data=None):
        self._data = data
        self.saved: list = []

    async def async_load(self):
        return self._data

    async def async_save(self, data):
        self.saved.append(data)


class _ThreadAwareHass:
    def __init__(self, loop):
        self.loop = loop
        self.loop_thread_id = threading.get_ident()
        self.data = {}
        self.add_job_threads: list[int] = []
        self.async_create_task_threads: list[int] = []
        self.off_loop_create_task_calls = 0
        self.created_tasks: list[asyncio.Task] = []

    def add_job(self, target, *args):
        self.add_job_threads.append(threading.get_ident())
        self.loop.call_soon_threadsafe(target, *args)

    def async_create_task(self, coro, *args, **kwargs):
        self.async_create_task_threads.append(threading.get_ident())
        if threading.get_ident() != self.loop_thread_id:
            self.off_loop_create_task_calls += 1
            raise RuntimeError("async_create_task called outside HA loop raw-text")
        task = self.loop.create_task(coro)
        self.created_tasks.append(task)
        return task


class _ThreadCheckingStore:
    def __init__(self):
        self.saved: list = []
        self.create_thread_ids: list[int] = []
        self.await_thread_ids: list[int] = []
        self.saved_event = asyncio.Event()

    def async_save(self, data):
        self.create_thread_ids.append(threading.get_ident())

        async def _save():
            self.await_thread_ids.append(threading.get_ident())
            self.saved.append(data)
            self.saved_event.set()

        return _save()


class _FailingThreadCheckingStore(_ThreadCheckingStore):
    def __init__(self):
        super().__init__()
        self.attempted_event = asyncio.Event()

    def async_save(self, data):
        self.create_thread_ids.append(threading.get_ident())

        async def _save():
            self.await_thread_ids.append(threading.get_ident())
            self.attempted_event.set()
            raise RuntimeError("raw failure text must not be logged")

        return _save()


class _BlockingThreadCheckingStore(_ThreadCheckingStore):
    def __init__(self):
        super().__init__()
        self.started_event = asyncio.Event()
        self.release_event = asyncio.Event()
        self.cancelled = False

    def async_save(self, data):
        self.create_thread_ids.append(threading.get_ident())

        async def _save():
            self.await_thread_ids.append(threading.get_ident())
            self.started_event.set()
            try:
                await self.release_event.wait()
            except asyncio.CancelledError:
                self.cancelled = True
                raise
            self.saved.append(data)
            self.saved_event.set()

        return _save()


class _SlowCancellationThreadCheckingStore(_ThreadCheckingStore):
    def __init__(self):
        super().__init__()
        self.started_event = asyncio.Event()
        self.cancel_started_event = asyncio.Event()
        self.cancel_release_event = asyncio.Event()
        self.cancelled = False

    def async_save(self, data):
        self.create_thread_ids.append(threading.get_ident())

        async def _save():
            self.await_thread_ids.append(threading.get_ident())
            self.started_event.set()
            try:
                await self.saved_event.wait()
            except asyncio.CancelledError:
                self.cancelled = True
                self.cancel_started_event.set()
                await self.cancel_release_event.wait()
                raise
            self.saved.append(data)

        return _save()


def _stub(store):
    stub = SimpleNamespace(
        hass=None,
        entry_id="entry-test",
        box_id="box-test",
        _daily_source_loaded=False,
        _daily_source_store=store,
        _daily_source_kwh={"fve": 0.0, "grid": 0.0, "alternative": 0.0},
        _daily_source_cost_czk={"fve": 0.0, "grid": 0.0},
        _daily_source_date=None,
        _daily_source_reseeded=False,
        _daily_source_last_save_at=None,
        _daily_source_save_tasks=set(),
        _daily_source_unloaded=False,
    )
    stub._ensure_daily_source_store = lambda: store
    stub.unload_activity_listeners = lambda: None
    stub._schedule_daily_source_save_payload = (
        lambda store_arg, payload: BoilerRuntime._schedule_daily_source_save_payload(
            stub,
            store_arg,
            payload,
        )
    )
    stub._is_daily_source_save_on_hass_loop = (
        lambda: BoilerRuntime._is_daily_source_save_on_hass_loop(stub)
    )
    stub._create_daily_source_save_task = (
        lambda store_arg, payload: BoilerRuntime._create_daily_source_save_task(
            stub,
            store_arg,
            payload,
        )
    )
    stub._async_save_daily_source_payload = (
        lambda store_arg, payload: BoilerRuntime._async_save_daily_source_payload(
            stub,
            store_arg,
            payload,
        )
    )
    stub._daily_source_save_done = lambda task: BoilerRuntime._daily_source_save_done(
        stub,
        task,
    )
    stub._async_cancel_daily_source_saves = (
        lambda: BoilerRuntime._async_cancel_daily_source_saves(stub)
    )
    return stub


async def _run_from_background_thread(func) -> None:
    loop = asyncio.get_running_loop()
    done = loop.create_future()

    def _runner():
        try:
            func()
        except BaseException as err:  # pragma: no cover - test helper
            loop.call_soon_threadsafe(done.set_exception, err)
        else:
            loop.call_soon_threadsafe(done.set_result, None)

    thread = threading.Thread(target=_runner, name="boiler-daily-source-save-test")
    thread.start()
    try:
        await asyncio.wait_for(done, timeout=2.0)
    finally:
        thread.join(timeout=2.0)


async def _wait_for_save_attempt(store, timeout=1.0) -> bool:
    try:
        await asyncio.wait_for(store.saved_event.wait(), timeout=timeout)
        return True
    except asyncio.TimeoutError:
        return False


async def _wait_until(predicate, timeout=1.0) -> bool:
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout
    while loop.time() < deadline:
        if predicate():
            return True
        await asyncio.sleep(0)
    return predicate()


@pytest.mark.asyncio
async def test_load_restores_today():
    today = dt_util.now().date().isoformat()
    store = _FakeStore(
        {
            "date": today,
            "kwh": {"fve": 5.0, "grid": 2.0, "alternative": 0.0},
            "cost_czk": {"fve": 0.0, "grid": 6.0},
        }
    )
    stub = _stub(store)

    await BoilerRuntime.async_load_daily_source(stub)

    assert stub._daily_source_kwh == {"fve": 5.0, "grid": 2.0, "alternative": 0.0}
    assert stub._daily_source_cost_czk == {"fve": 0.0, "grid": 6.0}
    assert stub._daily_source_reseeded is True  # don't re-guess on top
    assert stub._daily_source_loaded is True


@pytest.mark.asyncio
async def test_load_ignores_stale_day():
    store = _FakeStore(
        {
            "date": "2020-01-01",
            "kwh": {"fve": 9.0, "grid": 9.0, "alternative": 0.0},
            "cost_czk": {"fve": 0.0, "grid": 9.0},
        }
    )
    stub = _stub(store)

    await BoilerRuntime.async_load_daily_source(stub)

    # Previous-day snapshot must not be restored — midnight reset still applies.
    assert stub._daily_source_kwh == {"fve": 0.0, "grid": 0.0, "alternative": 0.0}
    assert stub._daily_source_reseeded is False
    assert stub._daily_source_loaded is True


@pytest.mark.asyncio
async def test_load_handles_no_data():
    stub = _stub(_FakeStore(None))
    await BoilerRuntime.async_load_daily_source(stub)
    assert stub._daily_source_loaded is True
    assert stub._daily_source_kwh == {"fve": 0.0, "grid": 0.0, "alternative": 0.0}


def _seed_stub(loaded_from_store=False, current=None):
    return SimpleNamespace(
        _daily_source_loaded_from_store=loaded_from_store,
        _daily_source_kwh=current or {"fve": 0.0, "grid": 0.0, "alternative": 0.0},
        _daily_source_date=None,
        _daily_source_reseeded=False,
    )


def test_seed_from_state_applies_when_store_empty():
    stub = _seed_stub(loaded_from_store=False)
    BoilerRuntime.seed_daily_source_from_state(stub, "grid", 4.2)
    assert stub._daily_source_kwh["grid"] == 4.2
    assert stub._daily_source_reseeded is True


def test_seed_from_state_skipped_when_store_authoritative():
    stub = _seed_stub(loaded_from_store=True)
    BoilerRuntime.seed_daily_source_from_state(stub, "grid", 4.2)
    assert stub._daily_source_kwh["grid"] == 0.0  # Store wins


def test_seed_from_state_never_clobbers_fresher_value():
    stub = _seed_stub(current={"fve": 6.0, "grid": 0.0, "alternative": 0.0})
    BoilerRuntime.seed_daily_source_from_state(stub, "fve", 2.0)
    assert stub._daily_source_kwh["fve"] == 6.0  # kept the larger in-memory value


def test_seed_from_state_ignores_bad_input():
    stub = _seed_stub()
    BoilerRuntime.seed_daily_source_from_state(stub, "grid", float("nan"))
    BoilerRuntime.seed_daily_source_from_state(stub, "bogus", 5.0)
    BoilerRuntime.seed_daily_source_from_state(stub, "grid", -1.0)
    assert stub._daily_source_kwh["grid"] == 0.0


@pytest.mark.asyncio
async def test_save_persists_and_throttles():
    store = _FakeStore()

    class _Hass:
        def __init__(self):
            self.calls = 0

        def async_create_task(self, coro):
            self.calls += 1
            return asyncio.ensure_future(coro)

    stub = _stub(store)
    stub._daily_source_kwh = {"fve": 1.0, "grid": 2.0, "alternative": 0.0}
    stub._daily_source_cost_czk = {"fve": 0.0, "grid": 3.0}
    stub._daily_source_date = dt_util.now().date()
    stub.hass = _Hass()

    BoilerRuntime._schedule_daily_source_save(stub)
    BoilerRuntime._schedule_daily_source_save(stub)  # within 60s → throttled
    await asyncio.sleep(0)

    assert stub.hass.calls == 1
    assert store.saved and store.saved[0]["kwh"] == {
        "fve": 1.0,
        "grid": 2.0,
        "alternative": 0.0,
    }
    assert store.saved[0]["date"] == dt_util.now().date().isoformat()


@pytest.mark.asyncio
async def test_schedule_daily_source_save_hands_off_from_background_thread_without_coroutine_leak():
    loop = asyncio.get_running_loop()
    hass = _ThreadAwareHass(loop)
    store = _ThreadCheckingStore()
    stub = _stub(store)
    stub.hass = hass
    stub._daily_source_kwh = {"fve": 1.0, "grid": 2.0, "alternative": 0.5}
    stub._daily_source_cost_czk = {"fve": 0.0, "grid": 3.0}
    stub._daily_source_date = dt_util.now().date()

    with warnings.catch_warnings(record=True) as captured:
        warnings.simplefilter("always", RuntimeWarning)
        await _run_from_background_thread(
            lambda: BoilerRuntime._schedule_daily_source_save(stub)
        )
        saved = await _wait_for_save_attempt(store, timeout=1.0)
        gc.collect()
        await asyncio.sleep(0)

    coroutine_leaks = [
        str(item.message)
        for item in captured
        if "was never awaited" in str(item.message)
    ]
    problems = []
    if hass.off_loop_create_task_calls:
        problems.append("hass.async_create_task was called off the HA loop")
    if not hass.add_job_threads:
        problems.append("hass.add_job was not used for the foreign-thread handoff")
    if not saved:
        problems.append("Store.async_save was not awaited")
    if coroutine_leaks:
        problems.append(f"coroutine leaks: {coroutine_leaks}")
    if store.create_thread_ids != [hass.loop_thread_id]:
        problems.append(
            f"Store.async_save coroutine created on threads {store.create_thread_ids}"
        )
    if store.await_thread_ids != [hass.loop_thread_id]:
        problems.append(f"Store.async_save awaited on threads {store.await_thread_ids}")

    assert not problems, "; ".join(problems)
    assert store.saved[0] == {
        "date": dt_util.now().date().isoformat(),
        "kwh": {"fve": 1.0, "grid": 2.0, "alternative": 0.5},
        "cost_czk": {"fve": 0.0, "grid": 3.0},
    }


@pytest.mark.asyncio
async def test_repeated_background_daily_source_saves_share_throttle_window_and_snapshot_payload():
    loop = asyncio.get_running_loop()
    hass = _ThreadAwareHass(loop)
    store = _ThreadCheckingStore()
    stub = _stub(store)
    stub.hass = hass
    stub._daily_source_kwh = {"fve": 4.0, "grid": 1.0, "alternative": 0.25}
    stub._daily_source_cost_czk = {"fve": 0.0, "grid": 8.0}
    stub._daily_source_date = dt_util.now().date()

    await _run_from_background_thread(
        lambda: [
            BoilerRuntime._schedule_daily_source_save(stub)
            for _ in range(20)
        ]
    )
    stub._daily_source_kwh["fve"] = 999.0
    stub._daily_source_cost_czk["grid"] = 999.0
    assert await _wait_for_save_attempt(store, timeout=1.0)
    await asyncio.sleep(0)

    assert hass.off_loop_create_task_calls == 0
    assert len(store.saved) == 1
    assert store.saved[0]["kwh"] == {
        "fve": 4.0,
        "grid": 1.0,
        "alternative": 0.25,
    }
    assert store.saved[0]["cost_czk"] == {"fve": 0.0, "grid": 8.0}


@pytest.mark.asyncio
async def test_daily_source_store_failure_is_consumed_and_logged_class_only(caplog):
    loop = asyncio.get_running_loop()
    previous_handler = loop.get_exception_handler()
    loop_exception_contexts = []
    loop.set_exception_handler(
        lambda _loop, context: loop_exception_contexts.append(context)
    )
    hass = _ThreadAwareHass(loop)
    store = _FailingThreadCheckingStore()
    stub = _stub(store)
    stub.hass = hass
    stub._daily_source_kwh = {"fve": 1.0, "grid": 0.0, "alternative": 0.0}
    stub._daily_source_date = dt_util.now().date()
    caplog.set_level(
        logging.WARNING,
        logger="custom_components.oig_cloud.boiler.runtime",
    )

    try:
        BoilerRuntime._schedule_daily_source_save(stub)
        await asyncio.wait_for(store.attempted_event.wait(), timeout=1.0)
        await asyncio.sleep(0)
    finally:
        loop.set_exception_handler(previous_handler)

    task_errors = [
        repr(task.exception())
        for task in hass.created_tasks
        if task.done() and not task.cancelled() and task.exception() is not None
    ]
    log_text = caplog.text

    assert task_errors == []
    assert loop_exception_contexts == []
    assert "RuntimeError" in log_text
    assert "raw failure text" not in log_text
    assert "Traceback" not in log_text
    assert all(record.exc_info is None for record in caplog.records)
    assert stub._daily_source_save_tasks == set()


@pytest.mark.asyncio
async def test_daily_source_unload_cancels_pending_save_and_later_calls_are_inert():
    loop = asyncio.get_running_loop()
    hass = _ThreadAwareHass(loop)
    store = _BlockingThreadCheckingStore()
    stub = _stub(store)
    stub.hass = hass
    stub._daily_source_kwh = {"fve": 1.0, "grid": 0.0, "alternative": 0.0}
    stub._daily_source_date = dt_util.now().date()

    with warnings.catch_warnings(record=True) as captured:
        warnings.simplefilter("always", RuntimeWarning)
        BoilerRuntime._schedule_daily_source_save(stub)
        await asyncio.wait_for(store.started_event.wait(), timeout=1.0)

        await BoilerRuntime.async_unload(stub)
        task_count_after_unload = len(hass.created_tasks)
        BoilerRuntime._schedule_daily_source_save(stub)
        gc.collect()
        await asyncio.sleep(0)

    coroutine_leaks = [
        str(item.message)
        for item in captured
        if "was never awaited" in str(item.message)
    ]
    assert store.cancelled is True
    assert stub._daily_source_unloaded is True
    assert stub._daily_source_save_tasks == set()
    assert len(hass.created_tasks) == task_count_after_unload
    assert len(store.saved) == 0
    assert coroutine_leaks == []


@pytest.mark.asyncio
async def test_destroy_boiler_runtime_cancels_pending_daily_source_save():
    loop = asyncio.get_running_loop()
    hass = _ThreadAwareHass(loop)
    store = _BlockingThreadCheckingStore()
    runtime = _stub(store)
    runtime.hass = hass
    runtime._daily_source_kwh = {"fve": 1.0, "grid": 0.0, "alternative": 0.0}
    runtime._daily_source_date = dt_util.now().date()
    hass.data[DOMAIN] = {
        "entry-test": {KEY_BOILER_RUNTIMES: {"box-test": runtime}}
    }

    BoilerRuntime._schedule_daily_source_save(runtime)
    await asyncio.wait_for(store.started_event.wait(), timeout=1.0)

    destroy_boiler_runtime(hass, "entry-test", "box-test")

    try:
        assert await _wait_until(lambda: runtime._daily_source_save_tasks == set())
        assert store.cancelled is True
        assert runtime._daily_source_unloaded is True
        assert hass.data[DOMAIN]["entry-test"][KEY_BOILER_RUNTIMES] == {}
    finally:
        if not store.cancelled:
            store.release_event.set()
            await _wait_for_save_attempt(store, timeout=1.0)


@pytest.mark.asyncio
async def test_teardown_boiler_runtime_waits_for_daily_source_save_cancellation_before_removal():
    from custom_components.oig_cloud import _teardown_boiler_runtime

    loop = asyncio.get_running_loop()
    hass = _ThreadAwareHass(loop)
    store = _SlowCancellationThreadCheckingStore()
    runtime = _stub(store)
    runtime.hass = hass
    runtime.entry_id = "entry-test"
    runtime.box_id = "123"
    runtime.async_unload = lambda: BoilerRuntime.async_unload(runtime)
    runtime._daily_source_kwh = {"fve": 1.0, "grid": 0.0, "alternative": 0.0}
    runtime._daily_source_date = dt_util.now().date()
    hass.data[DOMAIN] = {
        "entry-test": {KEY_BOILER_RUNTIMES: {"123": runtime}}
    }
    entry = SimpleNamespace(
        entry_id="entry-test",
        options={"box_id": "123", "enable_boiler": True},
    )

    BoilerRuntime._schedule_daily_source_save(runtime)
    await asyncio.wait_for(store.started_event.wait(), timeout=1.0)

    teardown_task = asyncio.create_task(_teardown_boiler_runtime(hass, entry))
    await asyncio.wait_for(store.cancel_started_event.wait(), timeout=1.0)
    await asyncio.sleep(0)

    teardown_done_while_cancel_pending = teardown_task.done()
    runtime_removed_while_cancel_pending = (
        "123" not in hass.data[DOMAIN]["entry-test"][KEY_BOILER_RUNTIMES]
    )
    store.cancel_release_event.set()
    await asyncio.wait_for(
        asyncio.gather(teardown_task, *hass.created_tasks, return_exceptions=True),
        timeout=1.0,
    )

    assert not teardown_done_while_cancel_pending
    assert not runtime_removed_while_cancel_pending
    assert store.cancelled is True
    assert store.saved == []
    assert runtime._daily_source_save_tasks == set()
    assert hass.data[DOMAIN]["entry-test"][KEY_BOILER_RUNTIMES] == {}


@pytest.mark.asyncio
async def test_teardown_boiler_runtime_logs_unload_failure_class_only_and_removes(caplog):
    from custom_components.oig_cloud import _teardown_boiler_runtime

    loop = asyncio.get_running_loop()
    hass = _ThreadAwareHass(loop)

    class FailingUnloadRuntime:
        async def async_unload(self):
            raise RuntimeError("raw unload failure text")

    runtime = FailingUnloadRuntime()
    hass.data[DOMAIN] = {
        "entry-test": {KEY_BOILER_RUNTIMES: {"123": runtime}}
    }
    entry = SimpleNamespace(
        entry_id="entry-test",
        options={"box_id": "123", "enable_boiler": True},
    )
    caplog.set_level(logging.WARNING, logger="custom_components.oig_cloud")

    await _teardown_boiler_runtime(hass, entry)

    assert hass.data[DOMAIN]["entry-test"][KEY_BOILER_RUNTIMES] == {}
    assert "RuntimeError" in caplog.text
    assert "raw unload failure text" not in caplog.text
    assert "Traceback" not in caplog.text
    assert all(record.exc_info is None for record in caplog.records)


@pytest.mark.asyncio
async def test_teardown_boiler_runtime_propagates_caller_cancellation_without_removal():
    from custom_components.oig_cloud import _teardown_boiler_runtime

    loop = asyncio.get_running_loop()
    hass = _ThreadAwareHass(loop)

    class CancellingRuntime:
        async def async_unload(self):
            raise asyncio.CancelledError("raw cancellation text")

    runtime = CancellingRuntime()
    hass.data[DOMAIN] = {
        "entry-test": {KEY_BOILER_RUNTIMES: {"123": runtime}}
    }
    entry = SimpleNamespace(
        entry_id="entry-test",
        options={"box_id": "123", "enable_boiler": True},
    )

    with pytest.raises(asyncio.CancelledError):
        await _teardown_boiler_runtime(hass, entry)

    assert hass.data[DOMAIN]["entry-test"][KEY_BOILER_RUNTIMES]["123"] is runtime
