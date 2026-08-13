"""Hourly AI evaluation coordinator — wires unit-1 core to HA.

Fetches recorder history, runs the detector, calls the AI text path, splits
the markdown into FAKTA/LIDSKY, updates the ledger, writes the Store, and
signals the sensor. AI OPTIONAL: if generate_eval_report returns None, the
tick is a graceful no-op.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_point_in_time
from homeassistant.helpers.recorder import get_instance
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from . import detector, ledger, payload

_LOGGER = logging.getLogger(__name__)


STORE_VERSION = 1
HISTORY_MINUTES = 65
NOTABLE_EVENT_KINDS = {"grid_skok", "faze_limit", "bypass", "dobijeni_po_minimu"}

CANONICAL_KEY_TO_ENTITY_SUFFIX = {
    "grid": "actual_aci_wtotal",
    "gr_r": "actual_aci_wr",
    "gr_s": "actual_aci_ws",
    "gr_t": "actual_aci_wt",
    "zal": "actual_aco_p",
    "zal_r": "ac_out_aco_pr",
    "zal_s": "ac_out_aco_ps",
    "zal_t": "ac_out_aco_pt",
    "nez": "actual_acinb_wtotal",
    "nez_r": "actual_acinb_wr",
    "nez_s": "actual_acinb_ws",
    "nez_t": "actual_acinb_wt",
    "fve": "dc_in_fv_total",
    "bat": "batt_batt_comp_p",
    "soc": "batt_bat_c",
    "v_r": "ac_in_aci_vr",
    "v_s": "ac_in_aci_vs",
    "v_t": "ac_in_aci_vt",
    "freq": "ac_in_aci_f",
    "invT": "box_temp",
    "batT": "extended_battery_temperature",
    "byp": "bypass_status",
    "mode": "box_prms_mode",
}


def _resolve_box_id(config_entry: ConfigEntry) -> Optional[str]:
    for key in ("box_id", "inverter_sn"):
        val = config_entry.options.get(key)
        if isinstance(val, str) and val.isdigit():
            return val
        val = config_entry.data.get(key)
        if isinstance(val, str) and val.isdigit():
            return val
    return None


def _build_entity_ids(box_id: str) -> Dict[str, str]:
    return {
        key: f"sensor.oig_{box_id}_{suffix}"
        for key, suffix in CANONICAL_KEY_TO_ENTITY_SUFFIX.items()
    }


def _states_to_samples(states: List[Any]) -> List[tuple[float, Any]]:
    samples = []
    for state in states:
        try:
            ts = state.last_updated.timestamp()
            val = state.state
            if val in ("unknown", "unavailable"):
                continue
            try:
                val = float(val)
            except (TypeError, ValueError):
                pass
            samples.append((ts, val))
        except Exception:
            continue
    return samples


def _label_fn(start_ts: float, n: int) -> Callable[[int], str]:
    def label(i: int) -> str:
        t = start_ts + i * detector.STEP_S
        dt = dt_util.as_local(datetime.fromtimestamp(t, tz=timezone.utc))
        return dt.strftime("%H:%M")
    return label


def _split_fakta_lidsky(markdown: str) -> tuple[str, str]:
    fakta = ""
    lidsky = ""
    lines = markdown.split("\n")
    current_section = None
    for line in lines:
        stripped = line.strip()
        if stripped.upper().startswith("FAKTA"):
            current_section = "fakta"
            continue
        if stripped.upper().startswith("LIDSKY"):
            current_section = "lidsky"
            continue
        if current_section == "fakta":
            fakta += line + "\n"
        elif current_section == "lidsky":
            lidsky += line + "\n"
    return fakta.strip(), lidsky.strip()


def _has_notable(events: List[Dict[str, Any]]) -> bool:
    return any(e.get("kind") in NOTABLE_EVENT_KINDS for e in events)


async def _fetch_history(
    hass: HomeAssistant, entity_ids: List[str], start_time: datetime, end_time: datetime
) -> Dict[str, List[Any]]:
    from homeassistant.components.recorder.history import get_significant_states

    recorder_instance = get_instance(hass)
    states = await recorder_instance.async_add_executor_job(
        get_significant_states,
        hass,
        start_time,
        end_time,
        entity_ids,
        None,
        True,
    )
    return states or {}


async def _fetch_plan_block(hass: HomeAssistant, box_id: str) -> str:
    try:
        from homeassistant.helpers.aiohttp_client import async_get_clientsession

        session = async_get_clientsession(hass)
        base = f"/api/oig_cloud/battery_forecast/{box_id}"

        tile_url = f"{base}/unified_cost_tile"
        timeline_url = f"{base}/timeline?type=active"

        async with session.get(tile_url) as resp:
            tile_data = await resp.json() if resp.status == 200 else {}

        async with session.get(timeline_url) as resp:
            timeline_data = await resp.json() if resp.status == 200 else {}

        return _format_plan_block(tile_data, timeline_data)
    except Exception as err:
        _LOGGER.debug("Failed to fetch plan block: %s", err)
        return "PLÁN A CENY: (nedostupné)"


def _format_plan_block(tile_data: Dict[str, Any], timeline_data: Dict[str, Any]) -> str:
    today = tile_data.get("today", {})
    plan_cost = today.get("plan_total_cost", 0)
    actual_cost = today.get("actual_total_cost", 0)
    delta = today.get("delta", 0)

    active = timeline_data.get("active", [])
    charge_windows = []
    export_windows = []
    for interval in active:
        if interval.get("grid_charge_kwh", 0) > 0:
            charge_windows.append(interval)
        if interval.get("grid_export", 0) > 0:
            export_windows.append(interval)

    lines = ["PLÁN A CENY:"]
    lines.append(f"Dnes: plán {plan_cost:.2f} Kč, skutečnost {actual_cost:.2f} Kč, rozdíl {delta:+.2f} Kč")

    if charge_windows:
        total_charge = sum(w.get("grid_charge_kwh", 0) for w in charge_windows)
        avg_price = sum(w.get("spot_price", 0) for w in charge_windows) / len(charge_windows)
        lines.append(f"Nabíjení ze sítě: {len(charge_windows)} oken, celkem {total_charge:.2f} kWh, průměrná cena {avg_price:.2f} Kč/kWh")

    if export_windows:
        total_export = sum(w.get("grid_export", 0) for w in export_windows)
        avg_price = sum(w.get("spot_price", 0) for w in export_windows) / len(export_windows)
        lines.append(f"Export do sítě: {len(export_windows)} oken, celkem {total_export:.2f} kWh, průměrná cena {avg_price:.2f} Kč/kWh")

    return "\n".join(lines)


class AiEvalCoordinator:
    """Hourly AI evaluation coordinator."""

    def __init__(self, hass: HomeAssistant, config_entry: ConfigEntry) -> None:
        self.hass = hass
        self.config_entry = config_entry
        self.entry_id = config_entry.entry_id
        self.box_id = _resolve_box_id(config_entry)
        self._store: Store[Dict[str, Any]] = Store(
            hass, STORE_VERSION, f"oig_cloud.ai_eval_{self.entry_id}"
        )
        self._ledger_entries: List[Dict[str, Any]] = []
        self._unsub_timer: Optional[Callable[[], None]] = None
        self._initial_task: asyncio.Task[None] | None = None
        self._tick_tasks: set[asyncio.Task[Any]] = set()
        self._shutting_down = False

    async def async_setup(self) -> None:
        stored = await self._store.async_load()
        if stored and isinstance(stored, dict):
            ledger_str = stored.get("ledger", "")
            if ledger_str and ledger_str != "(zatím prázdný)":
                for line in ledger_str.split("\n"):
                    parts = line.split(" | ", 2)
                    if len(parts) == 3:
                        self._ledger_entries.append({
                            "at": parts[0],
                            "kind": parts[1],
                            "detail": parts[2],
                            "ts": 0,
                        })
        self._schedule_next_tick()

        # Initial tick as a background task (a point-in-time timer proved
        # unreliable at setup time on this box) so the first report appears in
        # seconds rather than up to an hour later.
        async def _initial_tick() -> None:
            await asyncio.sleep(15)
            if self._shutting_down:
                return
            await self._async_on_tick(dt_util.utcnow())

        task = self.hass.async_create_task(_initial_tick())
        self._initial_task = task

        def _clear_initial_task(done: asyncio.Task[None]) -> None:
            if self._initial_task is done:
                self._initial_task = None

        task.add_done_callback(_clear_initial_task)

    def _schedule_next_tick(self) -> None:
        if self._shutting_down:
            return
        now = dt_util.utcnow()
        next_hour = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        self._unsub_timer = async_track_point_in_time(
            self.hass, self._async_on_tick, next_hour
        )

    async def _async_on_tick(self, now: datetime) -> None:
        if self._shutting_down:
            return
        task = asyncio.current_task()
        if task is not None:
            self._tick_tasks.add(task)
        try:
            await self._async_run_tick(now)
        except Exception as err:
            _LOGGER.error("AI eval tick failed: %s", err, exc_info=True)
        finally:
            if task is not None:
                self._tick_tasks.discard(task)
            self._schedule_next_tick()

    async def _async_run_tick(self, now: datetime) -> None:
        if not self.box_id:
            _LOGGER.debug("AI eval: no box_id, skipping tick")
            return

        entity_ids_map = _build_entity_ids(self.box_id)
        end_time = now
        start_time = now - timedelta(minutes=HISTORY_MINUTES)

        states_by_entity = await _fetch_history(
            self.hass, list(entity_ids_map.values()), start_time, end_time
        )

        grid: Dict[str, List[Optional[Any]]] = {}
        n = int(HISTORY_MINUTES * 60 / detector.STEP_S)
        start_ts = start_time.timestamp()

        for key, entity_id in entity_ids_map.items():
            entity_states = states_by_entity.get(entity_id, [])
            samples = _states_to_samples(entity_states)
            grid[key] = detector.forward_fill(samples, start_ts, n)

        label = _label_fn(start_ts, n)

        prior_low_soc_minutes = 0.0
        soc_samples = _states_to_samples(states_by_entity.get(entity_ids_map["soc"], []))
        for ts, val in soc_samples:
            if ts < start_ts and isinstance(val, (int, float)) and val <= 30:
                prior_low_soc_minutes += detector.STEP_S / 60.0

        events = detector.detect_events(grid, n, label, prior_low_soc_minutes)
        notable_events = [e for e in events if e.get("kind") in NOTABLE_EVENT_KINDS]

        # Update the rolling ledger every tick — cheap, deterministic memory.
        now_ts = now.timestamp()
        self._ledger_entries = ledger.add_events(self._ledger_entries, events, now_ts)
        ledger_str = ledger.format_for_prompt(self._ledger_entries)

        # VALUE GATE: only spend an AI call — and only speak to the owner — when
        # something notable actually happened this hour. Narrating normal
        # operation has no value, so a quiet hour writes a green status with an
        # empty report and no notification.
        if not notable_events:
            await self._store.async_save({
                "report_fakta": "",
                "report_lidsky": "",
                "ledger": ledger_str,
                "last_run": now.isoformat(),
                "anomaly_count": 0,
                "status": "ok",
            })
            async_dispatcher_send(self.hass, f"oig_cloud_ai_eval_update_{self.entry_id}")
            return

        # Something notable — build the payload and ask the LLM what it MEANS.
        indices = detector.event_snapshot_indices(events, n, win=5)
        detail_csv = payload.format_detail(grid, indices, label)
        plan_block = await _fetch_plan_block(self.hass, self.box_id)
        cur_from = dt_util.as_local(start_time).strftime("%H:%M")
        cur_to = dt_util.as_local(end_time).strftime("%H:%M")
        user_message = payload.assemble(ledger_str, detail_csv, plan_block, cur_from, cur_to)

        from .ai_client import generate_eval_report
        report_md = await generate_eval_report(
            self.hass, self.config_entry, payload.SYSTEM_PROMPT, user_message
        )
        if report_md is None:
            _LOGGER.debug("AI eval: generate_eval_report returned None, skipping")
            return

        fakta, lidsky = _split_fakta_lidsky(report_md)
        await self._store.async_save({
            "report_fakta": fakta,
            "report_lidsky": lidsky,
            "ledger": ledger_str,
            "last_run": now.isoformat(),
            "anomaly_count": len(notable_events),
            "status": "attention",
        })
        async_dispatcher_send(self.hass, f"oig_cloud_ai_eval_update_{self.entry_id}")

        from .notify import publish_eval_notification
        await publish_eval_notification(self.hass, self.config_entry, lidsky, True)

    async def async_shutdown(self) -> None:
        self._shutting_down = True
        if self._initial_task is not None:
            task = self._initial_task
            self._initial_task = None
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        current = asyncio.current_task()
        tick_tasks = tuple(task for task in self._tick_tasks if task is not current)
        for task in tick_tasks:
            task.cancel()
        if tick_tasks:
            await asyncio.gather(*tick_tasks, return_exceptions=True)
        if self._unsub_timer:
            try:
                self._unsub_timer()
            except Exception:
                pass
            self._unsub_timer = None


async def async_setup_ai_eval(hass: HomeAssistant, config_entry: ConfigEntry) -> AiEvalCoordinator:
    coordinator = AiEvalCoordinator(hass, config_entry)
    await coordinator.async_setup()
    return coordinator
