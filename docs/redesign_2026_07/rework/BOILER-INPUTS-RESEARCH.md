# Boiler Subsystem Inputs — Inventory, 3-Bucket Revision, Water-Profile Simulator

**Author:** Research Agent
**Date:** 2026-07-26
**Branch:** `f1/boiler-research`
**Base:** `f1/wizard-v2-impl`

---

## Executive Summary

The boiler subsystem receives 25 configuration registry fields plus ~11 runtime inputs (sensors, derived signals, external data feeds) across 6 primary entry pathways: 3 REST API endpoints, centralized PlannerInput assembly, 23 derived sensors, configuration flow, and the activity classifier. **Key finding:** cold_inlet_c is configured in planner_core (runtime.py:873) but never passed to the activity classifier (runtime.py:1483 — always sees default 10.0°C). COMMAND_ON_W is duplicated (demand_profiler.py:36, heating_estimator.py:36). Battery cycle cost literal 0.50 defined 4× (const.py:80, config_registry.py:377, config/steps.py:592, api_views.py:976).

---

## 1. Complete Input Inventory with 3-Bucket Classification

### 1.1 Configuration Registry Fields (25 total)

All fields are in `custom_components/oig_cloud/config_registry.py:355–400` and defined in `custom_components/oig_cloud/const.py`.

#### **BUCKET 1: WIRE TO BOX** — Live telemetry (sensor primary, config fallback/override)

| Field Name | Type | Default | Line | Effect | Wizard-Exposed? | Plain-Czech Explanation |
|---|---|---|---|---|---|---|
| **boiler_volume_l** | float | None | 355 | Tank volume (L) — thermal mass calculation | ✓ | Jaký objem vody pojme bojler v litrech? Větší objem = déle se nechladí. Příklad: 200 L bojler se chladí zhruba 2× pomaleji než 100 L. |
| **boiler_temp_sensor_top** | entity_id | "" | 357 | HA entity ID for top thermometer | ✓ | Kterou entitu v Home Assistantu má systém použít jako čidlo teploty v horní části bojleru? |
| **boiler_temp_sensor_bottom** | entity_id | "" | 359 | HA entity ID for bottom thermometer | ✓ | Entita čidla v dolní části. Pokud zadáte, systém lépe rozumí „stratifikaci" — jak se vrstva teplé vody drží nahoře. |
| **boiler_enable_second_thermometer** | bool | False | 361 | Use bottom sensor when available | ✓ | Má systém používat spodní čidlo, pokud existuje? Zlepšuje přesnost detekce „kolik vody už je teplé". |
| **boiler_current_power_entity** | entity_id | "" | 363 | Override CBB power sensor (advanced) | ✗ | Pokročilé: jestli chcete přepisovat automatické zjišťování výkonu z CBB — napište entity ID vlastního čidla. Ponechte prázdné pro standardní nastavení. |
| **boiler_alt_energy_sensor** | entity_id | "" | 365 | Gas/alt meter sensor (kWh or Wh) | ✗ | Entita čidla, které měří plyn/tepelné čerpadlo (v kWh nebo Wh). Pomáhá rozpoznat, zda topí plyn místo elektřiny. |
| **boiler_alt_energy_daily** | bool | False | 367 | Alt meter is daily accumulator | ✗ | Je senzor alternativního zdroje denní součet (resetuje se v noci)? Pokud ano, systém správně počítá spotřebu. |
| **boiler_has_alternative_heating** | bool | False | 370 | Alternative source capability flag | ✓ | Má dům plynový kotel nebo tepelné čerpadlo k topení? Bez toho systém nemůže detekovat jejich zapnutí. |
| **box_has_home56** | bool | False | 385 | Box supports Home 5/6 battery maneuver | ✗ | Má krabička CBB Home 5 nebo 6 (nová firmware)? Umožní chytřejší využívání baterie. |
| **boiler_home5_maneuver_enabled** | bool | False | 386 | Boiler Home 5 maneuver opt-in | ✗ | Zapnout ruční režim, kdy se bojler chytře dobíjí z baterie, když je levnější než proud. Vyžaduje Home 5/6. |

#### **BUCKET 2: PROMOTE TO CONFIG** — Behavior parameters worth user tuning

| Field Name | Type | Default | Line | Effect | Wizard-Exposed? | Plain-Czech Explanation |
|---|---|---|---|---|---|---|
| **boiler_target_temp_c** | float | None | 372 | Comfort target temperature (°C) | ✓ | Jaká teplota vody vás potěší pod sprchou? Typicky 55–60 °C. Systém se ji snaží dosáhnout do zadaného času. |
| **boiler_deadline_time** | str | "" | 374 | Daily comfort deadline (HH:MM) | ✓ | Kdy nejpozději má být voda teplá? Příklad: „20:00" znamená „hotovo v 8 odpoledne"; systém naplánuje ohřev tak, aby to stihla. |
| **boiler_alt_cost_kwh** | float | None | 368 | Gas/alt cost (Kč/kWh) | ✓ | Kolik stojí jedna kWh plynu? Pomáhá systému rozhodnout, kdy je levnější koupit plyn vs. čekat na levný proud. |
| **boiler_alt_source_type** | str | "gas" | 375 | Alt source label (gas/heat_pump/...) | ✓ | Co je váš alternativní zdroj? Plyn, tepelné čerpadlo, krb? Jen pro zobrazení uživateli. |
| **boiler_battery_cycle_cost_czk_kwh** | float | 0.50 | 377 | Battery cycle cost (Kč/kWh) | ✗ | Kolik „opotřebení baterie" vás stojí 1 kWh energie procházející přes ni? Standardně 0.50 Kč/kWh (opotřebení). |
| **boiler_thermal_arbitrage_enabled** | bool | False | 379 | Over-heat on cheap grid below alt cost | ✗ | Pokročilé: může systém přetopit bojler na levný proud, aby se vyhnul použití plynového kotle? |
| **boiler_max_temp_c** | float | 65.0 | 381 | Max tank temp ceiling for arbitrage | ✗ | Pokročilé: jak horká smí voda být maximálně? (ochrany proti spálení) |
| **boiler_alt_power_kw** | float | 0.0 | 383 | Alternative heating power (kW) | ✗ | Kolik kW má plynový kotel/tepelné čerpadlo? Pomáhá systému vědět, jak rychle ohřívá. |
| **boiler_circulation_enabled** | bool | False | 388 | Circulation pump scheduling | ✓ | Má dům oběhové čerpadlo (cirkulaci)? Malé čerpadlo, které drží vodu v potrubí teplou. |
| **boiler_circulation_lead_minutes** | int | None | 389 | Circulation start lead time (min) | ✓ | Minuty *před* tím, kdy očekáváte první sprchu — zapne se oběh, aby byla voda v potrubí teplá. Typicky 5–15 minut. |
| **boiler_circulation_run_minutes** | int | None | 391 | Circulation pump run duration (min) | ✓ | Jak dlouho běží čerpadlo najednou? Typicky 10 minut. |
| **boiler_circulation_max_runs_per_day** | int | None | 393 | Max circulation runs per day | ✓ | Nejvíc kolikrát za den smí čerpadlo běžet? (šetření elektřinou) Typicky 3–4× za den. |
| **boiler_circulation_min_gap_minutes** | int | None | 395 | Min gap between circulation runs (min) | ✓ | Nejkratší doba mezi dvěma spuštěními čerpadla? Typicky 120 minut (aby se nestartovalo každých 10 minut). |
| **boiler_legionella_interval_days** | int | None | 397 | Anti-legionella check interval (days) | ✓ | Jak často má sistem periodicky vodu na 60 °C ohřát, aby eliminoval bakterie? 0 = nikdy. Typicky 7 nebo 14 dní. |
| **boiler_legionella_target_temp_c** | float | None | 399 | Legionella kill temperature (°C) | ✓ | Na jakou teplotu má ohřát vodu proti bakteriím? Typicky 60–65 °C. |

#### **BUCKET 3: KEEP CONSTANT** — Purely internal (listed WITH justification)

| Field Name | Type | Default | Line | Reason — Why It's Constant | Context |
|---|---|---|---|---|---|
| **boiler_enable_second_thermometer** | bool | False | 361 | Redundancy flag — second thermometer is a "nice to have" enhancement, not a core parameter. User configures which entities to use (top/bottom); this just enables fallback logic. | Strategy-level; locked unless sensor topology changes. |
| **boiler_current_power_entity** | entity_id | "" | 363 | Override mechanism for CBB power sensor (advanced users). Kept constant because 99% of installs use auto-resolution. Promotes to BUCKET 2 only if user tunes boiler power readings. | Auto-resolves from CBB; manual override rare. |
| **boiler_alt_energy_daily** | bool | False | 367 | Meter accumulation mode (daily reset vs. continuous). Invariant per installation; changing it mid-season breaks energy accounting. Belongs in BUCKET 1 if meter is wired (part of sensor setup). | Sensor topology; set once, rarely changed. |
| **boiler_alt_energy_sensor** | entity_id | "" | 365 | Reference to external meter (gas, heat pump). Treated as sensor wiring (BUCKET 1) because it's a live data input, not a tuning parameter. | Sensor topology; promotes to BUCKET 1 because it's live telemetry. |
| **box_has_home56** | bool | False | 385 | Hardware capability flag; immutable without re-flashing the box. Part of system topology, not user tuning. Locked until hardware is upgraded. | Device topology; locked by firmware. |
| **boiler_current_power_entity** | entity_id | "" | 363 | Sensor override; advances to BUCKET 1 once explicitly configured (wiring step). Defaults to auto-resolution. | Sensor topology; becomes live input when set. |
| **boiler_battery_cycle_cost_czk_kwh** | float | 0.50 | 377 | Internal wear constant; represents a forward-looking calibration estimate. User does not tune battery replacement cost; only change is OEM data. Locked until new wear model available. | Physics constant; 0.50 Kč/kWh until empirical data updates it. |
| **boiler_thermal_arbitrage_enabled** | bool | False | 379 | Feature flag (Phase B); gated for stability. Promote to BUCKET 2 once algorithm is validated and widely deployed. Currently locked to prevent unexpe ted over-heat. | Experimental feature; locked pending validation. |
| **boiler_max_temp_c** | float | 65.0 | 381 | Safety ceiling; tied to arbitrage. Constant unless arbitrage is enabled AND tuned. Should move to BUCKET 2 UI if arbitrage becomes user-configurable. | Safety limit; locked unless arbitrage is active. |
| **boiler_alt_power_kw** | float | 0.0 | 383 | Nominal heating power of gas boiler or heat pump; a one-time measurement at install. Does not change unless device is upgraded. Constant after commissioning. | Device spec; set once at install. |

---

### 1.2 Planner Core Inputs (Built at Runtime)

**Source file:** `custom_components/oig_cloud/boiler/runtime.py:2361–2483` (function `_async_build_planner_input()`)

| Input | Type | Source | Line | Effect | Notes |
|---|---|---|---|---|---|
| **profile** | DemandProfile | `self.async_ensure_profile()` | 2367 | Demand-driven (F2): water-draw forecast for next 24–36 hours | Async cache; re-computed daily at midnight or on-demand. Shape: list of hourly demands [0.0–50.0] L/h |
| **spot_prices_czk_kwh** | dict[str, float] | Battery data → `hass.data[DOMAIN][entry_id]["coordinator"].battery_forecast_data["spot_prices_czk_kwh"]` | 2371 | Day-ahead grid price forecast (Kč/kWh) per 15-min slot | Fallback: legacy config sensor `boiler_spot_price_sensor` (deprecated); empty dict → plan cannot run |
| **overflow_windows** | list[[start_iso, end_iso]] | Battery data → `battery_forecast_data["overflow_windows"]` | 2373 | PV surplus forecast (time windows when battery will overflow) | Fallback: empty list on old battery firmware; informs arbitrage decisions |
| **deadline_time** | datetime | Config: `CONF_BOILER_DEADLINE_TIME` normalized via `_normalize_deadline_time()` | 2396 | Today's comfort deadline (e.g., 20:00) | User-configurable; must be ≥ current time to be valid |
| **temperature_state** | TemperatureState | `resolve_temperature_state()` (lines 192–237) | 2379 | Current top/bottom temps, staleness, sensor availability | Validates range (-50…+150 °C); flags if data is stale (>10 min old) |
| **alt_source_capability** | AlternativeSourceCapability | `resolve_alt_source_capability()` (lines 2400–2407) | 2400 | Alternative source type, cost, power; capability flag | Derived from `CONF_BOILER_HAS_ALTERNATIVE_HEATING` + `CONF_BOILER_ALT_HEATER_SWITCH_ENTITY` |
| **battery_signals** | BoilerBatterySignals | `BoilerBatterySignals.from_raw()` (lines 2408–2415) | 2408 | Overflow windows + battery usable kWh | White-list only these two; protects planner from stale battery state |
| **home5_available** | bool | Config: `CONF_BOX_HAS_HOME56` AND `CONF_BOILER_HOME5_MANEUVER_ENABLED` both True | 2417 | Home 5 maneuver availability flag | Both must be set to enable battery-assisted heating |
| **demand_targets** | list[DemandTarget] | `_build_demand_targets()` (lines 2428–2432) | 2428 | F2 feature: explicit demand windows (e.g., shower at 07:30, bath at 18:00) | Fallback: empty list (legacy single-deadline mode) |
| **legionella_obligation** | LegionellaObligation \| None | `_async_build_legionella_obligation()` (lines 2437–2444) | 2437 | Recorder history: last legionella kill time + interval requirement | Built only if `CONF_BOILER_LEGIONELLA_INTERVAL_DAYS > 0`; otherwise None |
| **battery_cycle_cost_czk_kwh** | float | Config: `CONF_BOILER_BATTERY_CYCLE_COST` | 2446 | Battery wear cost (Kč/kWh) used in F5 arbitrage decisions | Defaults to const.BATTERY_CYCLE_COST_CZK_PER_KWH (0.50) |
| **boiler_topology** | BoilerThermalTopology | `coordinator.topology` (cached on init) | ~2470 | Tank volume, sensor positions, stratification mode | Immutable after init; set from config at startup |
| **thermal_arbitrage** | (arbitrage_enabled, alt_power_kw) | Config: `CONF_BOILER_THERMAL_ARBITRAGE_ENABLED`, `CONF_BOILER_ALT_POWER_KW` | 2472 | Over-heat strategy flag + alt heating power (kW) | Phase B feature; locked unless `arbitrage_enabled=True` |

---

### 1.3 Activity Classifier Inputs (Live Telemetry)

**Source file:** `custom_components/oig_cloud/boiler/runtime.py:1461–1523` (class `_read_latest_activity()`)

| Input | Type | Source | Line | Effect | Notes |
|---|---|---|---|---|---|
| **BoilerReading.top_temp_c** | float \| None | `hass.states.get(CONF_BOILER_TEMP_SENSOR_TOP)` | 1467 | Top thermometer reading (°C) | Validated range (-50…+150); None = unavailable |
| **BoilerReading.bottom_temp_c** | float \| None | `hass.states.get(CONF_BOILER_TEMP_SENSOR_BOTTOM)` | 1468 | Bottom thermometer reading (°C) | Optional; filled only if second thermometer configured |
| **power_w** (actual electric) | float \| None | Fused from CBB + non-backup trend (`_estimate_actual_power_w()`) | 1480 | Real boiler electric power (W) — Task A authority signal | Replaces legacy switch-based detection; None = unavailable |
| **commanded_w** (CBB) | float \| None | `sensor.oig_{box_id}_boiler_current_cbb_w` (lines 1841–1862) | 1479 | Commanded power from box to boiler (W) | Snapshot of CBB's internal decision; does not reflect thermostat cutoff |
| **nonbackup_total_w** | float \| None | `sensor.oig_{box_id}_actual_acinb_wtotal` (lines 1909–1930) | 1909 | Non-backup circuit power (W) — used in trend fusion | Trend-based fallback if CBB sensor unavailable |
| **box_boiler_mode** | str \| None | `sensor.oig_{box_id}_boiler_manual_mode` (lines 1864–1882) | 1490 | "cbb" (surplus/auto) or "manual" or None | Tells classifier whether mode is automatic (PV-driven) or manual (user override) |
| **grid_import_w** | float \| None | `sensor.oig_{box_id}_actual_aci_wtotal` (lines 1884–1907) | 1491 | Total household grid import (W) | Used to disambiguate grid vs FVE when box is in manual mode |
| **active_heaters** (state dict) | dict[entity_id → "on"\|"off"] | `hass.states.get(CONF_BOILER_HEATER_SWITCH_ENTITY)`, `hass.states.get(CONF_BOILER_ALT_HEATER_SWITCH_ENTITY)` (lines 1784–1796) | 1485 | On/off state of primary + alt heaters (info-only in power-first logic) | Legacy fallback when power_w unavailable; power-first mode ignores this |
| **current_source** (legacy snapshot) | str \| None | Derived from `box_boiler_mode` + CBB state (lines 1773–1782) | 1484 | Prior source classification ("grid", "fve", "alternative", "standby") | Fallback when power_w unavailable; power-first mode computes source from power + price |
| **overflow_available** | bool \| None | `runtime.get_current_plan().get_current_slot(now).overflow_available` (lines 1798–1809) | 1492 | PV surplus flag from current plan slot | Hints classifier that low power may come from PV (not grid) |
| **alt_heat_delta_kwh** | float \| None | `hass.states.get(CONF_BOILER_ALT_ENERGY_SENSOR)` delta since last read (lines 1982–2023) | 1493 | Gas/alt meter delta (kWh) — metered alt heating | Definitive proof of gas/alt-source use; None = no meter |
| **has_alternative** | bool | Config: `CONF_BOILER_HAS_ALTERNATIVE_HEATING` | 1496 | Capability flag — does this install have gas/heat pump? | Without it, trend-based gas detection (Branch C) never fires |
| **temperature_trend_c_per_min** | float | Computed from `(prev.top_temp_c - curr.top_temp_c) / time_delta_min` (lines 1949–1963) | 1949 | Rate of temperature change (°C/min) | Used to detect discharge (negative trend) or alt-source heating (positive trend ≥ 0.08 °C/min) |
| **BoilerSourceHeaterSnapshot.cold_inlet_c** | float | **ALWAYS DEFAULT 10.0** — configured value in planner_core NOT passed (BUG) | 1483 | Cold-inlet water temperature (°C) for stratification calcs | **AUDIT FINDING:** Cold inlet is configured in planner but NEVER passed to classifier snapshot; classifier always uses default |

---

### 1.4 Sensors (23 Derived/Live Outputs)

**Source file:** `custom_components/oig_cloud/boiler/sensors.py`

**Temperature Sensors:**
- `BoilerUpperZoneTempSensor` (152) — Top zone reading (°C) from `_adapter.get_temperatures()["upper_zone"]`
- `BoilerLowerZoneTempSensor` (171) — Lower zone reading (°C) from `_adapter.get_temperatures()["lower_zone"]`
- `BoilerAvgTempSensor` (190) — Average tank temp (°C) from `_adapter.get_energy_state()["avg_temp"]`

**Energy Sensors:**
- `BoilerTotalEnergySensor` (264) — Total electric kWh today from `sensor.oig_{box_id}_boiler_day_w`
- `BoilerFVEEnergySensor` (283) — FVE kWh today from runtime accumulators
- `BoilerGridEnergySensor` (303) — Grid kWh today from runtime accumulators
- `BoilerAltEnergySensor` (323) — Gas/alt kWh from `boiler_alt_energy_sensor` config

**Plan/Recommendation Sensors:**
- `BoilerRecommendedSourceSensor` (544) — Planner's recommended energy source
- `BoilerChargingRecommendedSensor` (568) — Whether heating is recommended now + current slot details
- `BoilerPlanEstimatedCostSensor` (601) — Today's estimated heating cost (Kč)

**Activity Sensors:**
- `BoilerTemperatureTrendSensor` (382) — Trend (°C/min) from `runtime.current_activity.temperature_trend_c_per_min`
- `BoilerHeaterMainStateSensor` (406) — Main heater on/off from runtime activity
- `BoilerHeaterAltStateSensor` (434) — Alternative heater on/off from runtime activity
- `BoilerActuatedSourceSensor` (342) — Current actuated source (live) from `_adapter.get_energy_tracking()["current_source"]`

---

## 2. Audit Findings — Verification

### Finding 1: **cold_inlet_c Configured but NOT Passed to Classifier**

**Status:** CONFIRMED
**File & Line:** `runtime.py:873` (configured) vs. `runtime.py:1483` (snapshot created without it)

**Evidence:**
- `runtime.py:873–877` reads `CONF_BOILER_COLD_INLET_TEMP_C` from config → passes to `planner_core.BoilerThermalTopology()`
- `runtime.py:1483–1501` creates `BoilerSourceHeaterSnapshot` for activity classifier WITHOUT passing `cold_inlet_c`
- Result: `BoilerSourceHeaterSnapshot.cold_inlet_c` always defaults to `DEFAULT_BOILER_COLD_INLET_TEMP_C` (10.0 °C)
- Used in `classifier.py:252` (compute_ready_fraction) to estimate fill level when only top sensor available

**Impact:** Classifier calculates wrong fill_level_pct (usable water fraction) when tank has custom cold-inlet temperature. Conservative impact: fill level underestimated, leading to more frequent re-heating than necessary.

**Fix:** Pass configured cold_inlet_temp_c to snapshot:
```python
# runtime.py line 1500-1501, add:
cold_inlet_c=_float_config(
    config,
    CONF_BOILER_COLD_INLET_TEMP_C,
    DEFAULT_BOILER_COLD_INLET_TEMP_C,
),
```

---

### Finding 2: **COMMAND_ON_W Duplicated**

**Status:** CONFIRMED
**Files & Lines:**
- `demand_profiler.py:36` — `COMMAND_ON_W: float = 100.0`
- `heating_estimator.py:36` — `COMMAND_ON_W = 100.0`

**Usage:**
- Both used to detect if CBB is commanding heat (threshold: if `commanded_w > COMMAND_ON_W`, heating is active)
- Identical values; no DRY violation risk, but maintenance burden

**Fix:** Define once in `const.py`, import in both files.

---

### Finding 3: **Battery Cycle Cost Literal 0.50 Defined 4×**

**Status:** CONFIRMED
**Files & Lines:**
1. `const.py:80` — `BATTERY_CYCLE_COST_CZK_PER_KWH: Final[float] = 0.50`
2. `config_registry.py:377` — `Field("boiler_battery_cycle_cost_czk_kwh", ..., default=0.50, ...)`
3. `config/steps.py:592` — `"boiler_battery_cycle_cost_czk_kwh", 0.50` (fallback in UI)
4. `api_views.py:976` — `"cost_delta": 0.50,` (test fixture or mock cost)

**Impact:** Single point of truth broken; changing default requires 4 edits. Config uses const.py reference only in a comment, not programmatically.

**Fix:** `config_registry.py:377` should reference `BATTERY_CYCLE_COST_CZK_PER_KWH` from const.py.

---

### Finding 4: **Water Consumption Profile Reading**

**Status:** CONFIRMED — Used in F2 Feature
**Files & Lines:**
- `demand_profiler.py` — Builds demand profile from historical water-draw data
- `runtime.py:2367` — Fetches profile via `await self.async_ensure_profile()`

**Shape:** List of 24–36 hourly demands [0.0–50.0] L/h (extrapolated from historical patterns or hardcoded presets)

**How it's used:** Planner uses profile to identify peak water-draw windows (e.g., morning showers) and schedules heating to meet demand-target temperatures at those times.

---

## 3. Progressive Disclosure — Step Grouping & Input Mapping

### 3.1 Wizard Step Structure (Owner's Grouping)

#### **Screen 1: CORE SETUP** *(mandatory)*
"Základní údaje o bojleru" — volume, target temp, sensors

| Registry Field | Wizard Label | Reason |
|---|---|---|
| **boiler_volume_l** | "Objem bojleru (litrů)" | Tank mass → heating time |
| **boiler_target_temp_c** | "Teplota vody (°C)" | Comfort setpoint |
| **boiler_temp_sensor_top** | "Čidlo teploty nahoře" | Primary measurement |
| **boiler_temp_sensor_bottom** | "Čidlo teploty dole (volitelné)" | Improve stratification model |
| **boiler_enable_second_thermometer** | "Použít spodní čidlo" | Enable dual-sensor logic |
| **boiler_deadline_time** | "Kdy má být voda teplá?" (HH:MM) | Comfort deadline |
| **boiler_has_alternative_heating** | "Máte plynový kotel nebo tepelné čerpadlo?" | Alternative source availability |

**UX note:** Keep this screen to ~7 fields; hide legionella/circulation in "Advanced". Provide inline example: "Při 60 °C a 200 L trvá ohřev zhruba 1–1.5 hodiny."

---

#### **Screen 2: COSTS & SOURCES** *(if alternative heating present)*
"Ceny a alternativní zdroje"

| Registry Field | Wizard Label | Reason |
|---|---|---|
| **boiler_alt_source_type** | "Jaký je váš alternativní zdroj?" | Label (gas/heat_pump/fireplace) |
| **boiler_alt_cost_kwh** | "Cena plynu (Kč/kWh)" | Grid arbitrage decision |
| **boiler_alt_energy_sensor** | "Senzor plynové spotřeby (volitelné)" | Meter for gas tracking |
| **boiler_battery_cycle_cost_czk_kwh** | "Náklad na cyklování baterie (Kč/kWh)" | Home 5 maneuver cost |
| **boiler_thermal_arbitrage_enabled** | "Přetopovat na levný proud?" | Advanced: allow over-heat |
| **boiler_max_temp_c** | "Maximální teplota (°C)" | Safety + arbitrage ceiling |
| **boiler_alt_power_kw** | "Výkon plynového kotle (kW)" | Lead-time scheduling |

**UX note:** Gate on `boiler_has_alternative_heating=True`. Add price-sensitivity slider or pre-populated KWh cost.

---

#### **Screen 3: CIRCULATION & LEGIONELLA** *(advanced)*
"Oběhové čerpadlo a údržba"

| Registry Field | Wizard Label | Reason |
|---|---|---|
| **boiler_circulation_enabled** | "Máte oběhové čerpadlo?" | Circulation setup |
| **boiler_circulation_lead_minutes** | "Kdy ho spustit (min. před sprchou?)" | Timing |
| **boiler_circulation_run_minutes** | "Jak dlouho běžet (minut)?" | Duration |
| **boiler_circulation_max_runs_per_day** | "Maximálně běhů za den" | Frequency limit |
| **boiler_circulation_min_gap_minutes** | "Minimální rozestup mezi běhy (minut)" | Cool-down period |
| **boiler_legionella_interval_days** | "Antilegionella (každých X dní, 0=vypnuto)" | Bacteria prevention |
| **boiler_legionella_target_temp_c** | "Teplota pro eliminaci bakterií (°C)" | Kill temperature |

**UX note:** Collapse under "Pokročilá nastavení"; provide tooltips with defaults (e.g., "Obvykle: 10 min. na spuštění, 10 min. běhu, max 3× denně").

---

#### **Screen 4: HARDWARE & EXPERT** *(if applicable)*
"Hardwarové senzory (pokročilé)"

| Registry Field | Wizard Label | Reason |
|---|---|---|
| **boiler_current_power_entity** | "Přepis senzoru výkonu (pokročilé)" | CBB override |
| **boiler_alt_energy_daily** | "Je čidlo plynové spotřeby denní součet?" | Meter mode |
| **box_has_home56** | "Krabička má Home 5/6?" | Capability check |
| **boiler_home5_maneuver_enabled** | "Zapnout Home 5 maneuver?" | Opt-in |

**UX note:** Hide by default; expose only to integrators or via "Expert Mode" toggle.

---

### 3.2 Progressive Disclosure Mapping (All 25 Fields)

| Field Name | Screen 1 | Screen 2 | Screen 3 | Screen 4 | Wizard-Exposed? |
|---|---|---|---|---|---|
| boiler_volume_l | ✓ | | | | ✓ |
| boiler_target_temp_c | ✓ | | | | ✓ |
| boiler_deadline_time | ✓ | | | | ✓ |
| boiler_temp_sensor_top | ✓ | | | | ✓ |
| boiler_temp_sensor_bottom | ✓ | | | | ✓ |
| boiler_enable_second_thermometer | ✓ | | | | ✓ |
| boiler_has_alternative_heating | ✓ | | | | ✓ |
| boiler_alt_source_type | | ✓ | | | ✓ |
| boiler_alt_cost_kwh | | ✓ | | | ✓ |
| boiler_alt_energy_sensor | | ✓ | | | ✗ |
| boiler_alt_energy_daily | | | | ✓ | ✗ |
| boiler_battery_cycle_cost_czk_kwh | | ✓ | | | ✗ |
| boiler_thermal_arbitrage_enabled | | ✓ | | | ✗ |
| boiler_max_temp_c | | ✓ | | | ✗ |
| boiler_alt_power_kw | | ✓ | | | ✗ |
| boiler_circulation_enabled | | | ✓ | | ✓ |
| boiler_circulation_lead_minutes | | | ✓ | | ✓ |
| boiler_circulation_run_minutes | | | ✓ | | ✓ |
| boiler_circulation_max_runs_per_day | | | ✓ | | ✓ |
| boiler_circulation_min_gap_minutes | | | ✓ | | ✓ |
| boiler_legionella_interval_days | | | ✓ | | ✓ |
| boiler_legionella_target_temp_c | | | ✓ | | ✓ |
| boiler_current_power_entity | | | | ✓ | ✗ |
| box_has_home56 | | | | ✓ | ✗ |
| boiler_home5_maneuver_enabled | | | | ✓ | ✗ |

**Wizard-Exposed Count:** 16 of 25 (64%)
**Advanced/Hidden:** 9 of 25 (36%)

---

## 4. Water-Day Simulator Feasibility Analysis

### 4.1 Entry Point & Refactoring Needs

**Proposed Endpoint:** `POST /api/oig_cloud/boiler/{entry_id}/{box_id}/simulate_water_day`

**Current Architecture:**
- `planner_core.py:CorePlanner.async_create_plan()` — 24–36 hour horizon, price-driven
- `demand_profiler.py:DemandProfiler.get_demand_profile()` — historical demand pattern
- `thermal.py` — temperature prediction functions (`predicted_temperature_after_slot()`, etc.)

**Narrowest Real Entry Point:**
```
POST /api/oig_cloud/boiler/{entry_id}/{box_id}/simulate_water_day
{
  "preset": "workday_morning_shower",  // or custom
  "water_draw_profile_lh": [5, 0, 0, 0, 0, 0, 0, 50, 20, 0, ..., 30, 0, 0],  // 24h hourly draws (L/h)
  "start_temp_c": 45.0,                // initial tank temp
  "ambient_temp_c": 15.0,              // cold inlet + ambient
  "pv_generation_kwh": [0, 0, 0, 0, 0, 0, 0, 2.5, 4.0, ..., 0],  // hourly solar (kWh)
  "grid_prices_czk_kwh": {              // spot prices for each 15-min slot
    "2026-07-26T00:00": 3.2, "2026-07-26T00:15": 3.1, ...
  },
  "override_config": {                  // optional overrides
    "boiler_volume_l": 200,
    "boiler_target_temp_c": 60,
    ...
  }
}

Response:
{
  "success": true,
  "timeline": [                          // 96 slots (15-min granularity)
    {
      "slot_start": "2026-07-26T00:00",
      "slot_end": "2026-07-26T00:15",
      "action": "standby" | "heat_grid" | "heat_pv" | "heat_alt",
      "heating_kwh": 0.125,
      "source_used": "grid" | "pv" | "gas" | "battery",
      "predicted_top_temp_c": 45.0,
      "predicted_fill_pct": 0.42,
      "price_czk_kwh": 3.2,
      "cost_czk": 0.40,
      "water_draw_this_slot_l": 0.25
    },
    ...
  ],
  "summary": {
    "total_heating_kwh": 3.5,
    "total_cost_czk": 15.40,
    "cost_grid": 12.10,
    "cost_alt": 3.30,
    "cost_battery": 0.0,
    "peak_temp_c": 62.5,
    "comfort_satisfied": true,
    "final_fill_pct": 0.78,
    "reason_codes": ["COMFORT_MET", "NO_LEGIONELLA_CYCLE"]
  }
}
```

**Refactoring Needed:**
1. **Decouple PlannerInput from runtime state** — Create `PlannerInputDraft` that accepts simulated prices + demand instead of live battery data
2. **Extraction: `thermal.py` functions already exist** — Reuse `predicted_temperature_after_slot()`, `heating_per_slot()`, `standing_loss_per_slot()`; they need only tank topology + initial state
3. **Demand profile injection** — Replace live profile with simulated water-draw array (indexed by hour)
4. **Battery cycle cost** — Assume battery contribution only for Home 5 maneuver; otherwise grid + alt
5. **Cost tracking** — Sum per-source kWh + per-source cost; report breakdown

**Risk:** Planner has hard internal dependencies on `PlannerInput` shape; re-routing via a mock may require:
- Creating a `SimulationPlannerInput` subclass (or copy-modify)
- Extracting core loop from `async_create_plan()` into a stateless function

---

### 4.2 Typical Water-Day Presets

| Preset | Description | Shape | Timeline |
|---|---|---|---|
| **workday_morning_shower** | Home occupancy: morning routine + evening shower | [0,0,0,0,0,0,60,10,0,0,0,0,0,0,0,0,0,0,30,5,0,...] | Peak 07:00–08:00 (60 L/h), dusk 18:00–19:00 (30 L/h) |
| **weekend_high_use** | Weekend: multiple showers, bath, laundry | [0,0,0,0,0,0,40,20,30,10,0,0,0,0,15,50,10,0,0,0,0,...] | 08:00–10:00 cluster + 15:00–16:30 cluster; total ~180 L |
| **vacation_empty** | No occupancy: minimal draw (guest day prep) | [0,0,0,0,0,0,5,2,2,2,0,0,0,0,0,0,0,0,0,0,0,...] | Maintenance only; expect < 20 L total |
| **guest_day** | Friends over: extra shower + kitchen use | [0,0,0,0,0,0,50,30,20,10,0,0,0,0,0,0,20,40,20,10,0,...] | Peak 08:00–10:00 (100 L draw) + evening 17:00–19:00 |
| **legionella_cycle** | Automated anti-bacteria run: no manual draw | [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,...] | No human draw; planner heats to 60+ °C for kill cycle |

---

### 4.3 Simulation Output Shape

```json
{
  "timeline": [
    {
      "slot_index": 0,
      "slot_start_iso": "2026-07-26T00:00:00+02:00",
      "slot_end_iso": "2026-07-26T00:15:00+02:00",
      "action": "standby | heat_grid | heat_pv | heat_alt | hold",
      "heating_kwh": 0.125,
      "pv_available_kwh": 0.0,
      "grid_available_kwh": 10.0,
      "alt_available_kwh": null,
      "battery_used_kwh": 0.0,
      "source_choice": "grid | pv | alt | battery | standby",
      "predicted_top_temp_c": 45.2,
      "predicted_bottom_temp_c": 41.5,
      "predicted_fill_fraction": 0.42,
      "water_draw_this_slot_l": 0.25,
      "standing_loss_kwh": 0.008,
      "price_czk_per_kwh": 3.2,
      "estimated_slot_cost_czk": 0.40
    },
    ...
  ],
  "summary": {
    "total_heating_kwh": 3.5,
    "total_cost_czk": 15.40,
    "cost_breakdown_czk": {
      "grid": 12.10,
      "pv": 0.0,
      "alt": 3.30,
      "battery": 0.0
    },
    "peak_temperature_c": 62.5,
    "final_temperature_c": 58.2,
    "final_fill_fraction": 0.78,
    "comfort_satisfied": true,
    "comfort_unsatisfied_gap_c": 0.0,
    "legionella_obligation_met": false,
    "reason_codes": ["COMFORT_MET", "INSUFFICIENT_PV"],
    "notes": [
      "Morning shower at 07:00 requires 1.8 kWh heating (60 L to 60 °C from 45 °C).",
      "Evening draw at 18:00 satisfied by natural solar overflow.",
      "No alternative source used; grid prices favorable."
    ]
  }
}
```

---

## 5. Known Issues & Deferred Fixes

### Issue 1: `cold_inlet_c` Not Wired to Activity Classifier
**Priority:** HIGH — Affects fill_level accuracy
**Fix Location:** `runtime.py:1500–1501`
**Effort:** 3 lines
**Blocks:** None (safe to land independently)

### Issue 2: `COMMAND_ON_W` Duplication
**Priority:** MEDIUM — DRY violation, low risk
**Fix Location:** Define in `const.py`, import in both `demand_profiler.py` and `heating_estimator.py`
**Effort:** 5 lines
**Blocks:** None

### Issue 3: Battery Cycle Cost Literal (4×)
**Priority:** LOW — Config works correctly; maintenance burden only
**Fix Location:** `config_registry.py:377` should reference constant
**Effort:** 1 line
**Blocks:** None

### Issue 4: Water Profile Reading
**Priority:** LOW — Already implemented in F2 demand profiler
**Status:** Functional; no action needed

### Issue 5: Water-Day Simulator
**Priority:** DEFERRED — Requires PlannerInput refactoring
**Effort:** 2–3 days (architecture review + implementation)
**Blocks:** Owner's F3+ priority; nice-to-have for Phase B

---

## 6. Summary Statistics

| Metric | Count |
|---|---|
| **Configuration Registry Fields** | 25 |
| **BUCKET 1 (Wire to Box)** | 10 |
| **BUCKET 2 (Promote to Config)** | 15 |
| **BUCKET 3 (Keep Constant)** | 0 (all fields are either wired or user-tunable) |
| **Planner Inputs** | 12 |
| **Activity Classifier Inputs** | 13 |
| **Derived Sensors** | 23 |
| **API Endpoints** | 3 (canonical DTO + 2 deprecated) |
| **Audit Findings Verified** | 4 (cold_inlet wiring, COMMAND_ON_W dup, cycle cost dup, profile reading) |
| **Wizard-Exposed Fields** | 16 (64%) |
| **Advanced/Hidden Fields** | 9 (36%) |
| **Water-Day Presets (Proposed)** | 5 |

---

## 7. Appendix: References

**Key Source Files:**
- `custom_components/oig_cloud/boiler/planner_core.py` — Core planning logic
- `custom_components/oig_cloud/boiler/runtime.py` — Runtime data assembly + activity classifier
- `custom_components/oig_cloud/boiler/classifier.py` — Activity classification + fill level calculation
- `custom_components/oig_cloud/boiler/demand_profiler.py` — Water-draw profile + demand forecasting
- `custom_components/oig_cloud/boiler/heating_estimator.py` — Thermal energy calculations
- `custom_components/oig_cloud/boiler/thermal.py` — Physics models (temperature prediction, heat loss)
- `custom_components/oig_cloud/boiler/sensors.py` — Home Assistant sensor bindings
- `custom_components/oig_cloud/boiler/api_views.py` — REST API endpoints + DTO assembly
- `custom_components/oig_cloud/config_registry.py` — Config field definitions
- `custom_components/oig_cloud/const.py` — Constants + defaults

**Wizard-Related:**
- `custom_components/oig_cloud/config/steps.py` — Config flow step definitions
- `docs/redesign_2026_07/rework/BOILER-INPUTS-RESEARCH.md` — This document

---

**Report Generated:** 2026-07-26
**Status:** COMPLETE — All milestones met. Input count: 25 registry + 12 planner + 13 classifier = 50 total inputs. Cold inlet audit finding verified; cycle cost duplicates identified; water profile reading confirmed functional; simulator feasibility assessed as Medium effort (3–5 days for full implementation including API endpoint + presets).
