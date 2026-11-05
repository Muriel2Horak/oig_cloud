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

from ..shared.background import start_background
from . import detector, ledger, payload, report, snapshot

_LOGGER = logging.getLogger(__name__)


STORE_VERSION = 1
HISTORY_MINUTES = 65
NOTABLE_EVENT_KINDS = {"grid_skok", "faze_limit", "bypass", "dobijeni_po_minimu"}
# Local hours with a scheduled advice run: morning, after the day-ahead prices
# land (~13:00), evening. Between them advice is refreshed only when the facts
# that matter change (snapshot.fingerprint) or it gets older than the cap.
ADVICE_HOURS = (6, 14, 20)
ADVICE_MAX_AGE_HOURS = 8
# A manual refresh from the dashboard may run at most this often.
REFRESH_MIN_INTERVAL = timedelta(minutes=5)
EXTRA_ENTITIES_OPTION = "ai_extra_entities"

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


async def _fetch_precomputed(hass: HomeAssistant, box_id: str) -> Dict[str, Any]:
    """Planner timeline + cost tile from the precomputed store (never HTTP).

    History: this used to go over HTTP with a path-only URL that aiohttp
    rejects, so the model never saw a plan. The REST views read this same
    store, so read it directly. Any failure degrades to empty data.
    """
    empty: Dict[str, Any] = {"timeline": [], "cost_tile": {}}
    try:
        store: Store = Store(hass, 1, f"oig_cloud.precomputed_data_{box_id}")
        data = await store.async_load()
    except Exception as err:  # noqa: BLE001 — optional context, never fatal
        _LOGGER.debug("AI eval: precomputed store unavailable: %s", err)
        return empty
    if not isinstance(data, dict):
        return empty
    tile = data.get("unified_cost_tile") or data.get("unified_cost_tile_hybrid") or {}
    timeline = data.get("timeline") or data.get("timeline_hybrid") or []
    return {
        "timeline": timeline if isinstance(timeline, list) else [],
        "cost_tile": tile if isinstance(tile, dict) else {},
    }


def _num(value: Any) -> Optional[float]:
    if value is None or isinstance(value, bool):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _collect_inputs(
    hass: Any,
    box_id: str,
    precomputed: Dict[str, Any],
    extra_entities: Optional[List[str]],
    ledger_entries: List[Dict[str, Any]],
    now_local: datetime,
) -> Dict[str, Any]:
    """Read the live HA states the advisor needs into plain values.

    Every source is optional: a missing entity or a junk value yields None or
    an empty container, never an exception.
    """
    states = getattr(hass, "states", None)

    def get(entity_id: str) -> Any:
        try:
            return states.get(entity_id) if states is not None else None
        except Exception:  # noqa: BLE001
            return None

    def sensor(suffix: str) -> Any:
        return get(f"sensor.oig_{box_id}_{suffix}")

    def value(suffix: str) -> Optional[float]:
        st = sensor(suffix)
        return _num(getattr(st, "state", None)) if st is not None else None

    def text(suffix: str) -> Optional[str]:
        st = sensor(suffix)
        raw = getattr(st, "state", None) if st is not None else None
        if raw in (None, "", "unknown", "unavailable"):
            return None
        return str(raw)

    def attrs(suffix: str) -> Dict[str, Any]:
        st = sensor(suffix)
        a = getattr(st, "attributes", None) if st is not None else None
        return dict(a) if isinstance(a, dict) else {}

    def as_dict(v: Any) -> Dict[str, Any]:
        return v if isinstance(v, dict) else {}

    forecast = attrs("battery_forecast")
    solar = attrs("solar_forecast")
    tariff = attrs("current_tariff")
    chmu_attrs = attrs("chmu_warning_level") or attrs("chmu_warning_level_global")
    chmu = chmu_attrs.get("all_warnings_details") or chmu_attrs.get("all_warnings") or []

    boiler: Dict[str, Any] = {}
    if sensor("boiler_upper_zone_temp") is not None or sensor("boiler_energy_needed") is not None:
        boiler = {
            "upper_temp": value("boiler_upper_zone_temp"),
            "lower_temp": value("boiler_lower_zone_temp"),
            "energy_needed_kwh": value("boiler_energy_needed"),
            "recommended_source": text("boiler_recommended_source"),
            "current_source": text("boiler_current_source"),
            "comfort_satisfied": text("boiler_plan_comfort_satisfied"),
        }
        if text("boiler_charging_recommended") == "ano":
            boiler["recommended_window"] = attrs("boiler_charging_recommended")

    tile_today = as_dict(as_dict(precomputed.get("cost_tile")).get("today"))
    cost = {
        "plan": _num(tile_today.get("plan_total_cost")),
        "actual": _num(tile_today.get("actual_total_cost")),
        "eod": _num(as_dict(tile_today.get("eod_prediction")).get("predicted_total")),
    }

    extra: List[Dict[str, Any]] = []
    for entity_id in list(extra_entities or []):
        if len(extra) >= snapshot.MAX_EXTRA_ENTITIES:
            break
        st = get(str(entity_id))
        if st is None or getattr(st, "state", None) in (None, "", "unknown", "unavailable"):
            continue
        a = dict(getattr(st, "attributes", None) or {})
        row: Dict[str, Any] = {
            "name": a.get("friendly_name") or str(entity_id).split(".", 1)[-1],
            "state": st.state,
            "unit": a.get("unit_of_measurement") or "",
        }
        if str(entity_id).startswith("weather."):
            row["details"] = {k: a[k] for k in (
                "temperature", "cloud_coverage", "humidity", "wind_speed", "precipitation"
            ) if k in a}
        extra.append(row)

    return {
        "now": now_local.replace(tzinfo=None) if now_local.tzinfo else now_local,
        "timeline": precomputed.get("timeline") or [],
        "capacity_kwh": _num(forecast.get("max_capacity_kwh")),
        "soc_pct": value("batt_bat_c"),
        "mode": text("box_prms_mode"),
        "buy_price": value("spot_price_current_15min"),
        "sell_price": value("export_price_current_15min"),
        "tariff": {
            "current": tariff.get("current_tariff") or text("current_tariff"),
            "nt_intervals": tariff.get("nt_intervals") or [],
            "vt_intervals": tariff.get("vt_intervals") or [],
        },
        "solar": {
            "daily": as_dict(solar.get("total_daily")),
            "today_hourly": as_dict(solar.get("today_hourly_total_kw")),
            "tomorrow_hourly": as_dict(solar.get("tomorrow_hourly_total_kw")),
            "age_hours": _num(solar.get("forecast_age_hours")),
            "stale": bool(solar.get("forecast_stale")),
        } if solar else {},
        "planned_consumption": {
            "today": _num(forecast.get("planned_consumption_today")),
            "tomorrow": _num(forecast.get("planned_consumption_tomorrow")),
            "profile": forecast.get("profile_today"),
        },
        "boiler": boiler,
        "chmu": chmu if isinstance(chmu, list) else [],
        "cost_today": cost,
        "extra": extra,
        "anomalies": list(ledger_entries or []),
    }


def _extra_entity_ids(options: Any) -> List[str]:
    """The owner's opted-in entities from options (CSV string or list)."""
    return snapshot.split_entity_ids((options or {}).get(EXTRA_ENTITIES_OPTION))


def _advice_due(
    now_local: datetime,
    last_generated: Optional[datetime],
    stored_fingerprint: Optional[str],
    fingerprint: str,
) -> bool:
    """Whether a fresh advice run is worth an AI call this tick."""
    if stored_fingerprint != fingerprint or last_generated is None:
        return True
    age = now_local - last_generated
    if age >= timedelta(hours=ADVICE_MAX_AGE_HOURS):
        return True
    return now_local.hour in ADVICE_HOURS and age >= timedelta(minutes=50)


def _parse_iso(value: Any) -> Optional[datetime]:
    try:
        parsed = datetime.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


_EMPTY_REPORT: Dict[str, Any] = {
    "report": None,
    "report_kind": None,
    "report_generated_at": None,
    "advice_fingerprint": None,
    "report_fakta": "",
    "report_lidsky": "",
    "status": "ok",
}


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
        # The last report and what produced it, carried across quiet ticks
        # and restarts (persisted in the Store with every save).
        self._kept: Dict[str, Any] = dict(_EMPTY_REPORT)
        self._unsub_timer: Optional[Callable[[], None]] = None
        self._initial_task: asyncio.Task[None] | None = None
        self._tick_tasks: set[asyncio.Task[Any]] = set()
        self._shutting_down = False
        self._force_advice = False
        self._last_refresh_request: Optional[datetime] = None

    async def async_setup(self) -> None:
        stored = await self._store.async_load()
        if stored and isinstance(stored, dict):
            for key in _EMPTY_REPORT:
                if key in stored:
                    self._kept[key] = stored[key]
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

        task = start_background(self.hass, _initial_tick(), "oig_cloud_ai_eval_tick")
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

    def request_advice(self) -> str:
        """Owner asked for fresh advice now ("started" | "rate_limited" | "unavailable").

        Runs one tick in the background with advice forced; the hourly timer
        is left alone. Limited to one request per REFRESH_MIN_INTERVAL so a
        double click cannot burn provider quota.
        """
        if self._shutting_down:
            return "unavailable"
        now = dt_util.utcnow()
        last = self._last_refresh_request
        if last is not None and now - last < REFRESH_MIN_INTERVAL:
            return "rate_limited"
        self._last_refresh_request = now
        self._force_advice = True
        start_background(
            self.hass, self._async_on_tick(now, reschedule=False), "oig_cloud_ai_eval_refresh"
        )
        return "started"

    async def _async_on_tick(self, now: datetime, reschedule: bool = True) -> None:
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
            if reschedule:
                self._schedule_next_tick()

    async def _async_run_tick(self, now: datetime) -> None:
        if not self.box_id:
            _LOGGER.warning(
                "AI eval: no box_id resolved for entry %s — hourly evaluation "
                "cannot run", self.entry_id
            )
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

        # The situation snapshot: plan, prices, solar, boiler, ČHMÚ, opted-in
        # sensors. Built every tick (cheap, local) so the fingerprint can tell
        # whether the facts behind the last advice still hold.
        now_local = dt_util.as_local(now)
        precomputed = await _fetch_precomputed(self.hass, self.box_id)
        options = getattr(self.config_entry, "options", None) or {}
        inputs = _collect_inputs(
            self.hass, self.box_id, precomputed,
            _extra_entity_ids(options),
            self._ledger_entries, now_local,
        )
        if notable_events:
            # Judge the event against the plan that was active when it
            # happened (e.g. a planned UPS charge at 14:00 seen at 15:00).
            inputs["lookback_minutes"] = HISTORY_MINUTES
        snap = snapshot.strip_private(snapshot.build_snapshot(inputs))
        fp = snapshot.fingerprint(snap)
        has_plan = bool(snap.get("hodiny"))

        anomaly_block = ""
        if notable_events:
            indices = detector.event_snapshot_indices(events, n, win=5)
            detail_csv = payload.format_detail(grid, indices, label)
            cur_from = dt_util.as_local(start_time).strftime("%H:%M")
            cur_to = now_local.strftime("%H:%M")
            anomaly_block = (
                f"Události {cur_from}–{cur_to}:\n"
                + "\n".join(f"{e['at']} {e['kind']}: {e['detail']}" for e in notable_events)
                + f"\n\nRejstřík anomálií dnes:\n{ledger_str}"
                + f"\n\nDetail ~20s snímků kolem událostí:\n{detail_csv}"
            )

        last_generated = _parse_iso(self._kept.get("report_generated_at"))
        forced, self._force_advice = self._force_advice, False
        advice_due = has_plan and (forced or _advice_due(
            now_local, dt_util.as_local(last_generated) if last_generated else None,
            self._kept.get("advice_fingerprint"), fp,
        ))

        # VALUE GATE: spend an AI call only on an anomaly or when advice is due.
        # A quiet tick keeps the last report and refreshes the ledger.
        if not notable_events and not advice_due:
            await self._save(now, ledger_str, 0)
            return

        user_message = payload.assemble_advice(snapshot.render_snapshot(snap), anomaly_block)

        from .ai_client import generate_eval_report
        answer = await generate_eval_report(
            self.hass, self.config_entry, payload.ADVISOR_SYSTEM_PROMPT, user_message
        )
        if answer is None:
            # Silent-death guard: keep the previous report, but make the failed
            # attempt visible instead of looking like a quiet hour.
            _LOGGER.warning(
                "AI eval: provider returned no report for %s; keeping the "
                "previous report and recording the failed attempt",
                self.box_id,
            )
            await self._save(now, ledger_str, len(notable_events), status="ai_unavailable")
            return

        parsed = report.parse_report(answer)
        if parsed is not None:
            fakta, lidsky = report.to_legacy_text(parsed)
            urgent = report.is_urgent(parsed) or bool(notable_events)
        else:
            # The model ignored the JSON contract: keep its text the old way.
            _LOGGER.info("AI eval: answer was not the expected JSON; storing as text")
            fakta, lidsky = _split_fakta_lidsky(answer)
            if not fakta and not lidsky:
                lidsky = answer.strip()[:1500]
            urgent = bool(notable_events)

        self._kept = {
            "report": parsed,
            "report_kind": "anomaly" if notable_events else "advice",
            "report_generated_at": now.isoformat(),
            "advice_fingerprint": fp if has_plan else self._kept.get("advice_fingerprint"),
            "report_fakta": fakta,
            "report_lidsky": lidsky,
            "status": "attention" if urgent else "advice",
        }
        await self._save(now, ledger_str, len(notable_events))

        if urgent and lidsky:
            from .notify import publish_eval_notification
            await publish_eval_notification(self.hass, self.config_entry, lidsky, True)

    async def _save(
        self, now: datetime, ledger_str: str, anomaly_count: int, status: Optional[str] = None
    ) -> None:
        data = dict(self._kept)
        if status is not None:
            data["status"] = status
        data.update({
            "ledger": ledger_str,
            "last_run": now.isoformat(),
            "anomaly_count": anomaly_count,
        })
        await self._store.async_save(data)
        async_dispatcher_send(self.hass, f"oig_cloud_ai_eval_update_{self.entry_id}")

    async def async_shutdown(self) -> None:
        self._shutting_down = True
        if self._initial_task is not None:
            task = self._initial_task
            self._initial_task = None
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
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
