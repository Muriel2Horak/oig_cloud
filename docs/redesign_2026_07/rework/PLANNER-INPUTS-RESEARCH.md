# Battery Planner Input Inventory Research

**Author:** Research Phase
**Date:** 2026-07-26
**Scope:** Complete enumeration of external inputs to the battery economic planning pipeline, with revision recommendations and simulator feasibility assessment.
**Deliverable basis:** `custom_components/oig_cloud/battery_forecast/` — planning/, economic_planner.py, data/, boiler integration.

---

## Part 1: Input Inventory

### 1.1 Configuration Options (config_entry.options)

Configuration options are read at planning runtime from the Home Assistant config_entry.options dictionary. These are user-configurable via the wizard/settings and persist across power cycles.

#### 1.1.1 Battery Charging Rate
- **Key:** `home_charge_rate`
- **File:Line:** `planning/forecast_update.py:902`
- **Effect:** Max rate at which the battery can charge from grid (UPS mode)
- **Default:** `2.8` kW
- **Effect direction:** Higher value ⇒ planner can charge battery faster, enabling shorter pre-charge windows
- **Exposed in wizard:** Currently YES (Nastavení tab, field name TBD)
- **Plain-Czech draft:** *Maximální rychlost nabíjení baterie ze sítě. Vyšší hodnota umožňuje rychlejší nabíjení, nižší šetří stranou stroje. Příklad: 2.8 kW = cca 0.7 kWh za 15 minut.*

**Impact:** Feeds directly into `PlannerInputs.charge_rate_kw`, determining `charge_rate_per_interval` (= 2.8 × 15/60 = 0.7 kWh/interval). Constrains maximum grid charging during HOME_UPS mode in economic gate.

---

#### 1.1.2 Battery Comfort SoC Target
- **Key:** `battery_comfort_soc_percent`
- **File:Line:** `planning/forecast_update.py:920-922`
- **Effect:** Target state of charge to maintain as a buffer above hard floor, charged ONLY from cheap windows
- **Default:** `50.0` %
- **Value range:** 0–95% (clamped in code)
- **Effect direction:** Higher value ⇒ planner tops up battery higher during cheap hours, maintaining larger reserve above emergency floor
- **Exposed in wizard:** Currently NO (should be offered; see Part 2)
- **Plain-Czech draft:** *Cílová rezerva v baterii udržovaná z levných ceníků. Nevyžaduje se nabíjení z draté elektriky. Příklad: 50% = pokud je baterie pod 50% kapacity a elektřina je levná, plán ji nabije, jinak nechat klesat.*

**Impact:** Converted to `PlannerInputs.comfort_soc_kwh` (= max_capacity × 50%). The planner opportunistically charges toward this level only during intervals below the 30th percentile of daily prices (`_COMFORT_CHEAP_PERCENTILE` = 0.30 in economic_planner.py). Zero disables comfort charging entirely.

---

#### 1.1.3 Expensive Price Percentile
- **Key:** `expensive_percentile`
- **File:Line:** `planning/forecast_update.py:939`
- **Effect:** Daily price threshold above which grid import is considered "expensive" and worth displacing with pre-charging
- **Default:** `0.70` (70th percentile)
- **Effect direction:** Higher percentile ⇒ fewer hours classified as "expensive", less pre-charging; lower ⇒ more aggressive pre-charging
- **Exposed in wizard:** Currently NO (expert-only; see Part 2)
- **Plain-Czech draft:** *Hranice ceny pro klasifikaci jako "drahá". Při 70% se za drahé považují nejdražších 30% hodin každého dne. Plán se snaží baterii nabít z levnějších hodin na pokrytí těch drahých. Vyšší hodnota = méně nabíjení ze sítě.*

**Impact:** Feeds `PlannerInputs.expensive_percentile`. Used in `economic_planner.py:_percentile_threshold()` to classify intervals. Only intervals above this threshold trigger displacement (pre-charge) logic.

**Caveat:** When `interval_days` is provided (which it is; see §1.5), the percentile is computed per-day independently, so a cheap day and an expensive day are judged separately — no blended horizon percentile.

---

### 1.2 Live Sensor Values (Box Telemetry)

These are real-time or near-real-time values read from Home Assistant entity states at the moment of planning.

#### 1.2.1 Current Battery State of Charge (SoC)
- **Key:** Via sensor method `_get_current_battery_capacity()`
- **File:Line:** `planning/forecast_update.py:362`
- **Source:** Home Assistant entity (typically `sensor.oig_{box_id}_battery_soc_kwh`)
- **Effect:** Starting point for all cost simulation; the planner assumes it begins from here
- **Units:** kWh (absolute, not percentage)
- **Effect direction:** Higher SoC ⇒ planner may discharge sooner, less pre-charging needed
- **Exposed in wizard:** YES (read-only display)
- **Plain-Czech draft:** *Aktuální energia v baterii nyní. Plán vychází z této hodnoty a počítá, jak ji měnit v následujících hodinách.*

**Impact:** Becomes `PlannerInputs.current_soc_kwh`. Clamped to [hw_min_kwh, max_capacity] before simulation to defend against sensor glitches.

---

#### 1.2.2 Battery Maximum Capacity
- **Key:** Via sensor method `_get_max_battery_capacity()`
- **File:Line:** `planning/forecast_update.py:363`
- **Source:** Home Assistant entity (typically `sensor.oig_{box_id}_battery_max_kwh`) or config-defined fallback
- **Effect:** All SoC targets and thresholds are computed as fractions of this value; capacity unknown = planning impossible
- **Units:** kWh (absolute)
- **Effect direction:** Higher capacity ⇒ larger usable buffer, more pre-charging possible, higher comfort target
- **Exposed in wizard:** YES (read-only; shows as "Kapacita baterie")
- **Plain-Czech draft:** *Celková kapacita baterie. Všechny cíle se počítají jako procento z tohoto. Pokud není známo, plán nemůže běžet.*

**Impact:** Feeds `PlannerInputs.max_capacity_kwh`. Used to derive:
- `hw_min_kwh` = max_capacity × 0.20 (see §1.3)
- `planning_min_kwh` = max_capacity × planning_min_percent% (§1.3)
- `comfort_soc_kwh` = max_capacity × comfort_pct% (§1.1.2)

---

#### 1.2.3 Battery Hardware Minimum Capacity
- **Key:** Via sensor method `_get_min_battery_capacity()`
- **File:Line:** `planning/forecast_update.py:364`
- **Source:** Home Assistant entity (typically `sensor.oig_{box_id}_battery_min_kwh`)
- **Effect:** Absolute floor; the planner will not plan below this, and the mode guard enforces it at runtime
- **Units:** kWh (absolute)
- **Effect direction:** Higher minimum ⇒ narrower usable band, less flexibility for pre-charge depth
- **Exposed in wizard:** NO (hardware safety; not user-configurable)
- **Plain-Czech draft:** *Absolutní nejnižší stav baterie bezpečný pro hardware. Plán nikdy neplánuje pod toto a box si ho vynutí za každou cenu.*

**Impact:** Becomes `PlannerInputs.hw_min_kwh`. The mode guard also respects this floor; any attempt to discharge below it triggers forced mode guard protection. Typically fixed at ~20% for CBB 3F Home Plus Premium.

---

### 1.3 Derived Configuration: Planning Minimum Percentage

While not a raw config option, this value is derived at runtime and becomes a planner input.

- **Key:** Computed in `_derive_planning_min_percent()`
- **File:Line:** `planning/forecast_update.py:912-914`
- **Inputs:**
  - `hw_min_percent` = hw_min_kwh / max_capacity (see §1.2.3)
  - Proxy bat_min value (read from boiler config if coupled; see §1.3.1)
- **Effect:** The planner's defensive floor — it always charges back above this % before the next expensive window
- **Default:** hw_min_percent (20%) + boiler proxy safety margin if available
- **Effect direction:** Higher percentage ⇒ deeper reserve, more pre-charging
- **Exposed in wizard:** NO (currently; see Part 2 for recommendations)
- **Plain-Czech draft:** *Bezpečná hranice pro plánování, vždy výš než absolutní minimum. Počítá se z hardwarového minima a (je-li vázán boiler) z jeho minima. Příklad: 20% hardware + 3% marže = plánovat nad 23%.*

**Impact:** Feeds `PlannerInputs.planning_min_percent`. Used to compute `planning_min_kwh` = max_capacity × (planning_min_percent / 100). The economic gate refuses all pre-charges that would leave the battery below this floor at the end of the horizon.

**Boiler coupling (§1.3.1):** If the boiler planner is configured (Home Assistant integration present), `_resolve_proxy_bat_min_pct()` reads its `min_soc_percent` setting and merges it with the hardware floor, ensuring the battery plan never violates boiler's floor requirement.

---

### 1.4 Derived Datasets: Price Timelines

Spot and export prices are fetched at planning time from an external provider (cloud) and used to score every interval.

#### 1.4.1 Spot Prices (Grid Import Prices)
- **Fetch method:** `_get_spot_price_timeline()` (sensor method)
- **File:Line:** `planning/forecast_update.py:414`
- **Source:** OIG Cloud API call; results cached by coordinator
- **Data shape:** List of dicts: `[{"time": "2026-07-26T10:00:00+02:00", "price": 3.45, ...}, ...]`
- **Units:** CZK/kWh (Czech crowns per kilowatt-hour)
- **Horizon:** Typically 48 hours (144 intervals × 15 min) from current time
- **Effect:** Every hour's grid-charging cost and pre-charge ROI; core input to economic gate
- **Effect direction:** Higher prices ⇒ more pre-charging from cheap windows; lower prices ⇒ less pre-charging
- **Exposed in wizard:** YES (shown in timeline/forecast view; read-only)
- **Plain-Czech draft:** *Ceny elektřiny ze sítě na příštích 48 hodin. Plán se snaží nabít baterii z levných hodin na pokrytí drahých. Bez těchto cen plán nemůže běžet.*

**Impact:** Converted to `PlannerInputs.prices` list (prices[i] for interval i). Filtered to remove past intervals (§1.4.2). Clamped to [0, ∞) to defend against negative prices in raw data.

**Filtering (§1.4.2):** In `_filter_price_timeline()`, only intervals at or after the current interval are kept. This ensures the planner never tries to pre-charge retroactively.

---

#### 1.4.2 Export Prices (Grid Export/FeedIn Prices)
- **Fetch method:** `_get_export_price_timeline()` (sensor method)
- **File:Line:** `planning/forecast_update.py:439`
- **Source:** OIG Cloud API call (often a separate endpoint from spot prices)
- **Data shape:** Same as spot prices
- **Units:** CZK/kWh
- **Horizon:** Same 48 hours
- **Effect:** Scoring for solar export scenarios (HOME III) and economic vs. store trade-off
- **Effect direction:** Higher export price ⇒ more export-favorable; lower ⇒ more store-favorable
- **Exposed in wizard:** NO (internal; affects timeline cost display)
- **Plain-Czech draft:** *Ceny za export elektřiny do sítě (kdy se baterie vyprazdňuje a FVE vyvážím). Ovlivňuje, jestli je levnější vyvezout nebo si uskladnit.*

**Impact:** Feeds timeline cost display and export financial scoring, but NOT directly into the core economic planner's mode decisions (which is based on spot prices + solar availability + load). Used primarily in timeline post-processing to show a "what if we exported this kWh" cost.

---

### 1.5 Derived Datasets: Solar Forecast

Solar forecast is read from a configured forecast service (typically forecast.solar or Solcast) at planning time.

#### 1.5.1 Solar Generation Forecast
- **Fetch method:** `sensor._get_solar_forecast()` (sensor method)
- **File:Line:** `planning/forecast_update.py:1438`
- **Source:** Home Assistant helper entity (typically `sensor.forecast_solar_estimate_…` or `sensor.solcast_…`)
- **Data shape:** Dict mapping ISO timestamps to kWh: `{"2026-07-26T10:00:00": 0.125, "2026-07-26T10:15:00": 0.132, ...}`
- **Units:** kWh per 15-minute interval
- **Horizon:** 48 hours
- **Availability:** Often degrades after sunset (forecasts become zero or missing)
- **Effect:** Determines when the battery will fill from solar alone vs. needing grid; enables low-cost export windows
- **Effect direction:** Higher solar ⇒ less grid pre-charging needed; lower ⇒ more
- **Exposed in wizard:** YES (shown in forecast timeline; read-only)
- **Plain-Czech draft:** *Předpověď slunečního generování baterie na příštích 48 hodin. Vyšší sluneční produkce = méně nabíjení ze sítě. Bez té se plán přepočítá levněji, ale s vyšším rizikem nedostatku v noci.*

**Impact:** Converted to `PlannerInputs.solar_forecast` list. Mapped to each interval's timestamp via `_build_solar_kwh_list()`. Solar values are clamped to [0, ∞) to defend against forecaster glitches (negative values).

**Adaptive correction (§1.5.2):** After fetch, `_maybe_apply_solar_correction()` may apply a learned correction factor to account for systematic bias (e.g., "forecast.solar undershoots by 12% on this site"). Factor comes from recent observed ratio of actual PV generation vs. forecast.

---

### 1.6 Derived Datasets: Load Forecast

Consumption (household load) forecast is derived from multiple sources at planning time.

#### 1.6.1 Adaptive Load Profiles
- **Fetch method:** `AdaptiveConsumptionHelper.get_adaptive_load_prediction()`
- **File:Line:** `planning/forecast_update.py:1446`
- **Source:** Home Assistant recorder (learned from 48+ hours of consumption history) via internal helper
- **Data shape:** Optional dict with "today_profile" and "tomorrow_profile", each containing:
  - `hourly_consumption`: List of 24 kWh/hour values or dict of hour→kWh
  - `avg_kwh_h`: Fallback average if hourly data missing
  - `start_hour`: Offset if profiles don't start at midnight
- **Units:** kWh/hour (hourly rates; planner divides by 4 for 15-min interval)
- **Availability:** Unavailable until ~48h of history is recorded after first config
- **Effect:** Primary consumption forecast when available; captures diurnal patterns (high morning peak, midday dip, evening peak)
- **Effect direction:** Higher profile values ⇒ higher predicted consumption ⇒ more pre-charging
- **Exposed in wizard:** NO (internal; profiles built from historical data)
- **Plain-Czech draft:** *Naučený vzorec vaší spotřeby z minulých 2 dnů. Plán ví, že ráno i večer konzumujete víc, v poledne míň. Bez toho se odhaduje ze všeobecného průměru.*

**Impact:** If profiles are usable (have hourly series or avg_kwh_h), the planner uses hourly values for each interval. If missing or corrupt, falls back to load_avg_sensors (§1.6.2).

---

#### 1.6.2 Load Average Sensors
- **Fetch method:** `sensor._get_load_avg_sensors()` (sensor method)
- **File:Line:** `planning/forecast_update.py:1439`
- **Source:** Home Assistant historical statistics (integration: `sensor.oig_{box_id}_load_avg_*`)
- **Data shape:** Time-series of rolling averages (30-min, 1-hour, 4-hour)
- **Units:** kWh per 15-minute interval (averaged from historical 15-min consumption)
- **Availability:** Always available if power meter is configured
- **Effect:** Fallback consumption forecast when adaptive profiles unavailable or corrupt
- **Effect direction:** Higher historical average ⇒ higher predicted consumption
- **Exposed in wizard:** NO (internal metric)
- **Plain-Czech draft:** *Průměrná spotřeba ze statistik za poslední hodinu. Pokud není naučený vzorec, plán používá tento průměr jako odhad.*

**Impact:** Via `get_load_avg_for_timestamp()` in `data/input.py`. Used for every interval's `load_forecast[i]` if no usable adaptive profile exists.

---

#### 1.6.3 Boiler Grid Load Overlay (Coupling)
- **Fetch method:** `_read_boiler_grid_load_overlay()` (local)
- **File:Line:** `planning/forecast_update.py:545, 1467`
- **Source:** Last boiler planner result stored in hass.data[DOMAIN][entry_id][KEY_BOILER_RUNTIMES]
- **Data shape:** Dict mapping interval start times to boiler load: `{datetime(...): 1.2, ...}`
- **Units:** kWh (boiler grid + battery load for this interval only)
- **Timing:** One-cycle lag — the boiler plan is from the *previous* battery planner cycle (typically 15–30 min old)
- **Effect:** Adds planned boiler heating load on top of historical consumption, so battery pre-charge accounts for boiler's upcoming grid draw
- **Effect direction:** Higher overlay ⇒ higher total predicted load ⇒ more pre-charging
- **Exposed in wizard:** NO (internal; boiler coupling detail)
- **Plain-Czech draft:** *Plánovaná spotřeba bojleru ze sítě v příštích intervalech. Plán si ji vezme do úvahy, aby měla baterie dost energie na bojler i na domácnost.*

**Impact:** Applied in `_apply_boiler_grid_load_overlay()` — for each interval in the overlay dict, the load_forecast[i] is incremented. One-cycle lag means the first battery forecast after a new boiler plan sees zero overlay; this is intentional (documented in R6 design).

**Included/Excluded:** Includes boiler's grid_kwh (normal grid heating) + battery_kwh (Home 5 maneuver — battery discharge for boiler). Excludes pv_kwh (overflow surplus; already modeled in battery sim's export).

---

### 1.7 Hardcoded Constants Acting as Parameters

These are defined in code and not currently configurable, but act as planner behavior parameters. Per P8 audit, some should be promoted to config.

#### 1.7.1 Hardware Minimum Fraction
- **Constant:** `_HW_MIN_FRACTION = 0.20`
- **File:Line:** `presentation/detail_tabs_baseline.py:24` (also implicit in forecast_update.py:903)
- **Effect:** Hardware safety floor as a fraction of max capacity
- **Default:** 20% (0.20)
- **Used for:** `hw_min_kwh = max_capacity * 0.20`
- **Effect direction:** Higher ⇒ deeper floor, narrower usable band
- **Promotion candidate:** YES — could be exposed as "Hardware Safety Margin %" in expert settings
- **Plain-Czech draft (if promoted):** *Absolutní bezpečnostní rezerva hardware jako procento kapacity. Zvýšení omezuje, kolik energy se dá použít. Typicky 20% pro CBB.*

**Impact:** When boiler is not coupled, `planning_min_percent` = hw_min_percent (≈20%). When coupled, it may increase per boiler's min_soc_percent + safety margin (see §1.3.1).

---

#### 1.7.2 Comfort Top-Up Percentile Threshold
- **Constant:** `_COMFORT_CHEAP_PERCENTILE = 0.30`
- **File:Line:** `economic_planner.py:28`
- **Effect:** Comfort SoC is topped up ONLY during intervals below this price percentile (i.e., the cheapest 30% of the horizon)
- **Default:** 0.30 (30th percentile = cheapest third)
- **Used for:** Filtering which intervals can contribute to comfort pre-charge
- **Effect direction:** Higher threshold ⇒ more intervals eligible for comfort charging
- **Promotion candidate:** MAYBE — expert-only; affects comfort aggressiveness
- **Plain-Czech draft (if promoted):** *Která procenta "levných" cen se počítají pro komfortní nabíjení. 30% = jen v nejlevnější třetině hodin. Nižší = riskantní, vyšší = agresivněji nabíjet.*

**Impact:** In `economic_planner.py:plan_battery_schedule()`, during comfort charging phase, only intervals at or below the 30th percentile price are considered eligible. Above this threshold, comfort charging is rejected (battery allowed to descend).

---

#### 1.7.3 Mode Guard Window Duration
- **Constant:** `MODE_GUARD_MINUTES = 60`
- **File:Line:** `planning/forecast_update.py:42`
- **Effect:** After a mode change, the mode guard prevents switching back for at least this duration to avoid oscillation
- **Default:** 60 minutes (4 × 15-min intervals)
- **Used for:** `build_plan_lock()` in mode_guard_module
- **Effect direction:** Longer guard ⇒ stickier modes, fewer switches; shorter ⇒ more adaptive
- **Promotion candidate:** MAYBE — expert-only; affects mode stability
- **Plain-Czech draft (if promoted):** *Jak dlouho se reżim drží po přepnutí, aby se neměnil "příliš často". 60 minut = jednou za hodinu maximum. Vyšší = stabilnější, nižší = více adaptivní.*

**Impact:** After any mode change, a "lock" is recorded with lock_until = now + 60 minutes. The mode guard refuses mode changes during this window, even if conditions favor a different mode. Protects against hysteresis (rapid flip-flop between HOME_I and HOME_III).

---

#### 1.7.4 Minimum Mode Duration
- **Constant:** `MIN_MODE_DURATION` dict in `types.py:131-136`
- **File:Line:** `types.py:131-136`, enforced in `mode_guard.enforce_min_mode_duration()`
- **Effect:** Each mode must run for at least this many intervals to avoid short bursts
- **Default:** HOME_UPS ≥ 2 intervals (30 min), others ≥ 1 interval (15 min)
- **Used for:** Post-planning smoothing; extends short HOME_UPS windows to ≥30 min
- **Effect direction:** Longer minimum ⇒ fewer, longer mode windows; shorter ⇒ more granular
- **Promotion candidate:** MAYBE — expert-only; affects battery wear vs. responsiveness trade-off
- **Plain-Czech draft (if promoted):** *Minimální doba, kterou se reżim drží. Např. UPS musí běžet alespoň 30 minut, aby se vyplatilo. Nižší = více přepínání, vyšší = delší periody.*

**Impact:** After `plan_battery_schedule()` returns modes, `enforce_min_mode_duration()` scans for windows shorter than the minimum and extends them forward, merging with adjacent intervals. Prevents short UPS "spikes" that would waste energy on switching overhead.

---

#### 1.7.5 Planning Horizon Maximum Intervals
- **Constant:** `max_intervals = 36 * 4` (144 intervals)
- **File:Line:** `planning/forecast_update.py:883`
- **Effect:** Planner is capped to this many intervals (~36 hours from current time)
- **Default:** 144 intervals = 36 × 4 intervals/hour × 15 min/interval = 36 hours
- **Used for:** Truncating spot prices, load, solar if longer data is fetched
- **Effect direction:** Longer horizon ⇒ planner can see further ahead (more expensive windows), risk of stale data; shorter ⇒ more responsive, less future visibility
- **Promotion candidate:** NO — internal optimization; no user value in exposing
- **Plain-Czech draft:** *Jak далeko dopředu si plán počítá. 36 hodin obvykle stačí na pokrytí "drahého" období. Delší = lepší viditelnost, ale pomalejší výpočet.*

**Impact:** If spot_prices, export_prices, load_forecast, solar_kwh_list are longer than 144 intervals, they are silently truncated. This prevents runaway computation and ensures prices don't span >48 hours (most forecasters provide ~48h, so this is rarely hit).

---

#### 1.7.6 Round-Trip Efficiency (AC-AC)
- **Constant:** `DEFAULT_ROUND_TRIP_EFFICIENCY = DEFAULT_EFFICIENCY × DEFAULT_CHARGE_EFFICIENCY` = 0.882 × 0.95 = 0.8379
- **File:Line:** `economic_planner_types.py:21`, `types.py:86-87`
- **Effect:** AC grid ⇒ battery ⇒ AC load efficiency. Used by the economic gate (cheap/η < expensive) to decide if pre-charging pays off
- **Default:** 0.8379 (83.79%)
- **Used for:** Clamping `directional_efficiency` in `_round_trip_to_directional()`, and in `PlannerInputs.round_trip_efficiency`
- **Effect direction:** Higher efficiency ⇒ cheaper to store energy ⇒ more pre-charging; lower ⇒ more expensive ⇒ less
- **Promotion candidate:** YES — per P8 audit; should be read from battery health sensor or config
- **Plain-Czech draft (if promoted):** *Účinnost baterie při nabíjení a vybíjení. 84% = když nabiju 100 Wh ze sítě, jen 84 Wh se vrátí do domácnosti. Vyšší = levnější uskladnění, více nabíjení.*

**Impact:** In `_simulate_interval()` and economic gate logic:
- Charge rate per interval = charge_rate_kw × (15min / 60min) ÷ charge_efficiency (0.95)
- Discharge rate = stored kWh × discharge_efficiency (0.882)
- Cost gate: pre-charge only if `cheap_price / efficiency < expensive_price`

Note: The planner deliberately uses the constant (not a sensor) to ensure all decision layers (timeline, mode guard, cost sim) agree on the efficiency model. A sensor-based efficiency would create inconsistency if the sensor changes mid-cycle.

---

#### 1.7.7 Holding SoC Threshold (Balancing)
- **Constant:** `_HOLDING_SOC_THRESHOLD = 97.0` (%)
- **File:Line:** `balancing/core.py:629`
- **Effect:** When battery SoC is ≥97%, it is considered "at holding" and the balancing manager maintains it there
- **Default:** 97%
- **Used for:** Balancing state machine; determines when holding period begins
- **Effect direction:** Higher threshold ⇒ balancing starts at higher SoC; lower ⇒ earlier
- **Promotion candidate:** MAYBE — expert-only; affects balancing timing
- **Plain-Czech draft (if promoted):** *Hranice pro začátek "udržování" baterie na 100% během vyvažování. 97% = jakmile je baterie nad 97%, je považována za "drženou na plnou". Nižší = dříve začít, vyšší = později.*

**Impact:** Used in `BalancingManager.is_holding()` to determine if the current SoC qualifies for "holding" state (attempting to maintain 100% during the 3-hour holding window). This is separate from planner min/max logic; it gates when the balancing manager activates its charge-hold discharge cycle.

---

### 1.8 Summary Table: Input Inventory

| Category | Name | Key/Constant | Type | Default | User-Configurable | Exposed in Wizard | File:Line |
|----------|------|--------------|------|---------|-------------------|-------------------|-----------|
| **Config Options** | Charge Rate | `home_charge_rate` | float (kW) | 2.8 | YES | YES | forecast_update.py:902 |
| | Comfort SoC % | `battery_comfort_soc_percent` | float (%) | 50.0 | YES | NO | forecast_update.py:920 |
| | Expensive Percentile | `expensive_percentile` | float (0–1) | 0.70 | YES | NO | forecast_update.py:939 |
| **Live Sensors** | Current SoC | `_get_current_battery_capacity()` | float (kWh) | — | NO | YES (read-only) | forecast_update.py:362 |
| | Max Capacity | `_get_max_battery_capacity()` | float (kWh) | — | NO | YES (read-only) | forecast_update.py:363 |
| | Min Capacity (HW) | `_get_min_battery_capacity()` | float (kWh) | — | NO | NO | forecast_update.py:364 |
| **Derived Config** | Planning Min % | `_derive_planning_min_percent()` | float (%) | hw_min% + boiler margin | PARTIAL* | NO | forecast_update.py:912 |
| **Price Data** | Spot Prices | `_get_spot_price_timeline()` | list[dict] | — | NO | YES (display) | forecast_update.py:414 |
| | Export Prices | `_get_export_price_timeline()` | list[dict] | — | NO | NO | forecast_update.py:439 |
| **Forecast Data** | Solar Forecast | `_get_solar_forecast()` | dict[ts→kWh] | — | NO | YES (display) | forecast_update.py:1438 |
| | Adaptive Profiles | `get_adaptive_load_prediction()` | dict | — | NO | NO | forecast_update.py:1446 |
| | Load Avg Sensors | `_get_load_avg_sensors()` | time-series | — | NO | NO | forecast_update.py:1439 |
| | Boiler Grid Overlay | `_read_boiler_grid_load_overlay()` | dict[ts→kWh] | — | NO | NO | forecast_update.py:545 |
| **Hardcoded Constants** | HW Min Fraction | `_HW_MIN_FRACTION` | float (fraction) | 0.20 | NO | NO | detail_tabs_baseline.py:24 |
| | Comfort Cheap %-ile | `_COMFORT_CHEAP_PERCENTILE` | float (0–1) | 0.30 | NO | NO | economic_planner.py:28 |
| | Mode Guard Duration | `MODE_GUARD_MINUTES` | int (min) | 60 | NO | NO | forecast_update.py:42 |
| | Min Mode Duration | `MIN_MODE_DURATION` | dict[mode→intervals] | UPS:2, other:1 | NO | NO | types.py:131 |
| | Planning Horizon | `max_intervals` | int | 144 (36h) | NO | NO | forecast_update.py:883 |
| | Round-Trip Efficiency | `DEFAULT_ROUND_TRIP_EFFICIENCY` | float | 0.8379 | NO | NO | types.py:21 |
| | Holding SoC Threshold | `_HOLDING_SOC_THRESHOLD` | float (%) | 97.0 | NO | NO | balancing/core.py:629 |

\* `planning_min_percent` is hardcoded as hw_min_percent (20%) unless boiler is coupled; boiler min_soc is set via boiler config, not battery config.

---

## Part 2: Revision Recommendations

### 2.1 Inputs Belonging in the Wizard (User-Facing)

**Current state:** The wizard battery step exposes current/max capacity (read-only) and home_charge_rate (config).

**Recommendation:** Add two more user-meaningful options to the wizard's battery configuration step:

1. **Battery Comfort SoC Target** (`battery_comfort_soc_percent`)
   - **Why:** Users ask "why does my battery drop to 20% at night?" — a comfort buffer of 40–50% (instead of 20%) directly addresses this concern.
   - **How:** Offer a slider 0–90%, labeled "Keep Battery Above ___%" with examples:
     - 20% (default): Use all battery capacity, rely on grid at night
     - 50%: Keep half-full overnight, more expensive but safer
     - 80%: Keep mostly full, maximal reserve, expensive grid charging
   - **Wiring:** Already in config_entry.options; wizard just needs to expose the field in its battery step.

2. **Expensive Price Threshold** (derived; not `expensive_percentile` directly)
   - **Why:** Expert users managing high-variability price regions want to tune when the planner considers a price "too expensive to avoid via pre-charging."
   - **How:** Do NOT expose the raw percentile. Instead, show a derived explanation:
     - "Pre-charge when price is above the **top 30% of daily prices** (Threshold = 70th percentile)"
     - Offer a slider: "Top ___% of prices" (currently 30, 25, 35, 40) mapped to percentile thresholds
     - This is more intuitive than "0.70 percentile."
   - **Wiring:** Read expensive_percentile from options; display as derived value; map user selection back to config.
   - **Placement:** Expert-only section, not main battery step.

---

### 2.2 Inputs Belonging in Settings (Expert-Only)

**Recommendation:** Move the following to a dedicated "Battery Optimization" tab in Nastavení, available only to users who enable "Show Advanced Options":

1. **Charge Rate** (`home_charge_rate`)
   - Already wired; move its UI from wizard to Settings for clarity.
   - Add validation: 0.5–5.0 kW range, warning if >inverter max.

2. **Comfort Charging Percentile Threshold** (`_COMFORT_CHEAP_PERCENTILE` → promote to config)
   - Currently hardcoded to 0.30. Promote to config_entry.options key: `comfort_cheap_percentile`.
   - Label: "Comfort Charging Window: Cheapest **___% of Daily Prices**"
   - Default: 30%, range 20–50%.
   - Rationale: Users wanting aggressive comfort top-up (e.g., 50%) vs. conservative (e.g., 15%) can tune this.

3. **Mode Guard Lock Duration** (`MODE_GUARD_MINUTES` → promote to config)
   - Currently hardcoded to 60 min. Promote to config_entry.options key: `mode_guard_minutes`.
   - Label: "Minimum Time Between Mode Changes: **___ minutes**"
   - Default: 60, range: 15–120.
   - Rationale: Users in oscillating price regions might want 15 min (more adaptive); rural users with stable weather might prefer 120 (stabler).

4. **Planning Min % Safety Margin** (`_HW_MIN_FRACTION` → promote to config)
   - Currently implicit in hw_min_kwh = max_capacity × 0.20. Promote to config_entry.options key: `hw_min_fraction`.
   - Label: "Hardware Safety Floor: **___% of Battery Capacity**"
   - Default: 20%, range: 15–25%.
   - Rationale: Advanced users with robust UPS needs might lower to 15%; conservative users prefer 25%.
   - **Note:** If boiler is coupled, this value is merged with boiler's min_soc; document the interaction.

5. **Round-Trip Efficiency** (promote `DEFAULT_ROUND_TRIP_EFFICIENCY` to config)
   - Currently hardcoded to 0.8379 (83.79%). Promote to config_entry.options key: `round_trip_efficiency`.
   - Label: "Battery Round-Trip Efficiency: **___% (Grid→Battery→Home)**"
   - Default: 83.79%, range: 75–90%.
   - Rationale: Users with newer batteries (higher efficiency) or degraded batteries (lower) can tune; affects pre-charge ROI gate.
   - **Measurement:** Suggest integrating a sensor that measures actual efficiency from charge/discharge cycles; feed that as the default when available.

---

### 2.3 Inputs That Should Stay Hidden (Internal)

The following are implementation details that must not leak into wizard/settings:

1. **Planning Horizon Maximum** (144 intervals / 36 hours)
   - Internal optimization; no user value in exposing.
   - Affects memory/computation; users don't manage this.

2. **Minimum Mode Duration** (UPS ≥ 2 intervals, others ≥ 1)
   - This is a safety constraint (prevent rapid UPS churn) and should not be user-tuned.
   - If a user asks "why does UPS always last 30 min?", explain: "Prevents inefficient rapid switching."

3. **Comfort Top-Up Percentile Threshold** (0.30) — **Exception to 2.2**
   - While this *could* be promoted (see 2.2 #2), it's currently rarely asked about.
   - Keep hardcoded for Phase F1; promote to config in F2 if users request.

4. **Adaptive Load Profiles**
   - These are automatic (learned from history) and non-configurable. Display them in diagnostics/debug only.

5. **Boiler Grid Load Overlay**
   - Soft dependency; user sees "boiler planned load" in timeline read-only, but doesn't configure it here (it's in boiler settings).

---

### 2.4 Dead/Ineffective Options (Evidence Required)

**Research finding:** No option keys discovered in the battery_forecast module that are read but never used.

All config_entry.options keys found are actively consumed:
- `home_charge_rate` → used in _run_planner
- `battery_comfort_soc_percent` → used in _run_planner
- `expensive_percentile` → used in _run_planner

**Recommendation:** No cleanup needed. If a user sets an option that isn't read anywhere, it won't affect behavior, but this is not a correctness issue — it's a user experience issue (option has no effect, but doesn't cause errors). Document expected option keys in manifest.json's config_schema for clarity.

---

## Part 3: Simulator Feasibility

### 3.1 Narrowest Real Entry Point

The narrowest entry point for a dry-run simulator (accepting synthetic inputs without touching live state) is:

**Function:** `plan_battery_schedule(inputs: PlannerInputs) → PlannerResult`

**File:Line:** `economic_planner.py:main_planning_function()` (exact name TBD; search for the function that takes PlannerInputs and returns mode list)

**Signature (assumed):**
```python
def plan_battery_schedule(inputs: PlannerInputs) -> PlannerResult:
    """
    Core economic planning engine.

    Inputs: PlannerInputs dataclass (all synthetic, no Home Assistant calls)
    Returns: PlannerResult with modes[], decisions[], total_cost, states[]

    Pure function; no I/O.
    """
```

**Entry point justification:**
- Takes fully-constructed `PlannerInputs` (no sensor reads)
- Returns planner result (modes, costs, SoC trajectory)
- All physics simulation happens here; no dependencies on config_entry, hass, or sensors
- Can be called directly with synthetic data

**Refactoring needed for `/planner_simulate` endpoint:**
- **Minimal:** None. Call `plan_battery_schedule(synthetic_inputs)` directly.
- **Recommended:** Wrap the call in a request-validation layer:
  ```python
  async def post_planner_simulate(request_payload):
      # Validate payload shape
      inputs = PlannerInputs.from_dict(request_payload)
      # Simulate
      result = plan_battery_schedule(inputs)
      # Return timeline + cost
      return {
          "timeline": result.states,
          "modes": result.modes,
          "total_cost": result.total_cost,
          "decisions": result.decisions,
      }
  ```
- **No** upstream refactoring needed (forecast_update, data fetching, etc.)

---

### 3.2 Scenario Presets

Define 6 year-typical scenarios for the simulator UI. Each preset has:
- A **label** (Czech, user-facing)
- **Input series** (prices, solar, load, SoC)
- **Expected outcome** (rough mode distribution)

#### Scenario 1: Winter Peak (High Load, High Price, Low Solar)
- **Label:** "Zimní špička – vysoká spotřeba, drahá elektřina"
- **Season:** December–February
- **Input shape:**
  - Prices: Bimodal (cheap 22:00–06:00, expensive 06:00–22:00); range 2–8 CZK/kWh
  - Solar: Flat near-zero (3% of summer peak); max ~0.1 kWh/interval
  - Load: High constant (~0.4 kWh/interval day, ~0.5 night)
  - Starting SoC: 50% (middle of band)
- **Expected plan:** Pre-charge from cheap night windows; HOME_I day (grid covers load), HOME_II/UPS night if SoC depletes
- **Timeline length:** 48 intervals (12 hours) with day/night cycle visible

**Why this scenario:** Tests hard floor defense (minimal solar means grid reliance) and comfortable pre-charge behavior in price-stable regions.

---

#### Scenario 2: Summer Low-Price (High Solar, Low Price, Medium Load)
- **Label:** "Letní slunečno – levná elektřina, vysoký generátor"
- **Season:** June–August
- **Input shape:**
  - Prices: Flat-low (~0.5–2 CZK/kWh, minimal variation)
  - Solar: High (peaks 0.8 kWh/interval midday, ~10% of day production in each interval)
  - Load: Moderate (~0.25 kWh/interval constant)
  - Starting SoC: 40% (below comfort)
- **Expected plan:** HOME_III most of day (solar surplus); brief HOME_UPS if load spikes; battery tops up to comfort when solar > load
- **Timeline length:** 48 hours (full day/night cycle to show afternoon solar peak)

**Why this scenario:** Tests self-sufficiency and minimal grid reliance in high-solar, low-price days.

---

#### Scenario 3: Price Spike Day (Moderate Solar, Sudden Expensive Window, High Load)
- **Label:** "Energetická krize – náhlá drahá elektřina"
- **Season:** Any (models demand response day)
- **Input shape:**
  - Prices: Normal (~1.5 CZK/kWh) for 06:00–14:00, spike to 12 CZK/kWh for 16:00–20:00, drop to 0.8 CZK/kWh after 20:00
  - Solar: Moderate (0.3–0.6 kWh/interval midday, zero after 18:00)
  - Load: High constant (~0.35 kWh/interval)
  - Starting SoC: 30% (low; needs pre-charge to survive spike)
- **Expected plan:** HOME_I morning (grid cheap, build reserve), HOME_III afternoon (solar useful), HOME_I early evening pre-charging (before spike, buying cheap), HOME_II/III during spike (battery discharges)
- **Timeline length:** 48 hours (show pre-charge build, spike handling, recovery)

**Why this scenario:** Tests dynamic reserve (planner builds buffer before predicted expensive window) and price-driven mode switching.

---

#### Scenario 4: Negative-Price Day (Free/Negative Prices, High Load, Any Solar)
- **Label:** "Záporné ceny – elektřina zdarma (nebo zaplacení za vývoz)"
- **Season:** Any, but typical spring/autumn with high wind
- **Input shape:**
  - Prices: Negative (~-2 CZK/kWh) for 12:00–16:00 (grid pays to consume), positive (~1 CZK/kWh) otherwise
  - Solar: Moderate (0.5 kWh/interval midday)
  - Load: Normal (~0.3 kWh/interval)
  - Starting SoC: 60% (middle)
- **Expected plan:** HOME_UPS aggressively during negative window (charge from grid, which pays you); HOME_I otherwise
- **Timeline length:** 48 intervals (show negative window and surrounding hours)

**Why this scenario:** Tests handling of unusual economics (free energy from grid) and confirms planner doesn't waste negative-price windows.

---

#### Scenario 5: Shoulder Season (Mild Weather, Variable Solar, Moderate Price)
- **Label:** "Přechodné období – slabý vítr, mírný generátor"
- **Season:** October–November, March–April
- **Input shape:**
  - Prices: Gentle variation (0.8–2.5 CZK/kWh, no sharp spikes)
  - Solar: Low-moderate (0.1–0.3 kWh/interval; cloudy)
  - Load: Moderate (~0.3 kWh/interval)
  - Starting SoC: 50%
- **Expected plan:** Mix of HOME_I, HOME_III, minor HOME_UPS; battery stays mid-band
- **Timeline length:** 36 hours (one full day/night)

**Why this scenario:** Tests "boring" day behavior where there's no heroic pre-charging needed and planner just balances supply/load.

---

#### Scenario 6: Grid Outage Recovery (SoC Depletion, Then Return to Grid)
- **Label:** "Výpadek elektřiny – baterie se vybíjí, pak se nabíjí zpět"
- **Season:** Any (models black-start + recovery)
- **Input shape:**
  - Prices: Normal (~2 CZK/kWh)
  - Solar: Moderate (0.3 kWh/interval)
  - Load: High constant (~0.4 kWh/interval, representing critical loads + recharge demand)
  - Starting SoC: 10% (extremely low; simulates battery depleted during outage)
- **Expected plan:** HOME_II/UPS for first 3–6 hours (rebuild SoC from solar + grid at any price), then back to normal (HOME_I/III) as SoC recovers
- **Timeline length:** 24 hours (recover and stabilize)

**Why this scenario:** Tests emergency recovery (floor defense is relaxed during extreme depletion) and confirms planner prioritizes SoC rebuild over cost.

---

### 3.3 Output Shape for Timeline Chart

The simulator returns per-interval data for a timeline visualization:

```python
{
    "horizon_intervals": 48,
    "interval_minutes": 15,
    "start_time": "2026-07-26T10:00:00+02:00",
    "end_time": "2026-07-27T10:00:00+02:00",
    "timeline": [
        {
            "interval_index": 0,
            "timestamp": "2026-07-26T10:00:00+02:00",
            "soc_kwh": 5.5,
            "soc_percent": 55.0,
            "mode": 0,  # int: 0=HOME_I, 1=HOME_II, 2=HOME_III, 3=HOME_UPS
            "mode_name": "HOME I",
            "solar_kwh": 0.0,
            "load_kwh": 0.35,
            "grid_import_kwh": 0.35,
            "grid_export_kwh": 0.0,
            "battery_charge_kwh": 0.0,
            "battery_discharge_kwh": 0.0,
            "spot_price_czk_kwh": 2.15,
            "export_price_czk_kwh": 1.90,
            "cost_czk": 0.75,  # grid_import * spot_price
            "reason": "cheap_import",  # or "solar_priority", "battery_discharge", "grid_outage_mode", etc.
            "is_mode_change": false,
            "is_guard_override": false,
        },
        // ... 47 more intervals
    ],
    "summary": {
        "total_cost_czk": 34.50,
        "total_grid_import_kwh": 16.8,
        "total_grid_export_kwh": 2.3,
        "total_solar_kwh": 8.1,
        "total_battery_charge_kwh": 6.5,
        "total_battery_discharge_kwh": 5.8,
        "min_soc_kwh": 4.2,
        "min_soc_percent": 42.0,
        "max_soc_kwh": 9.8,
        "max_soc_percent": 98.0,
        "mode_distribution": {
            "HOME_I": 18,  # intervals
            "HOME_II": 8,
            "HOME_III": 20,
            "HOME_UPS": 2,
        },
    },
}
```

**Chart rendering (frontend):**

1. **Top: Mode Bar**
   - 48 stacked segments (one per interval)
   - Color by mode (HOME_I=blue, HOME_II=orange, HOME_III=green, HOME_UPS=red)
   - Hover shows interval time + mode name + reason

2. **Middle: SoC Trajectory**
   - Line chart (interval vs. SoC %)
   - Shaded band for hard floor (20%) and comfort target (50% default)
   - Highlight min/max SoC on chart

3. **Lower: Cost Breakdown**
   - Stacked area: grid import cost (red), export savings (green minus)
   - Line overlay: spot price (CZK/kWh) on secondary axis

4. **Controls:**
   - Scenario selector dropdown (6 presets)
   - Input sliders (optional):
     - "Change Starting SoC: ___% (default ___)"
     - "Change Load +/- ___%" (multiplicative boost/cut)
     - "Change Solar +/- ___%" (same)
     - "Change Price Factor: × ___ (default 1.0)"
   - "Run Simulation" button → fetches from `/planner_simulate` with adjusted inputs

---

### 3.4 Refactoring Summary

**For a `POST /planner_simulate` endpoint:**

1. **Endpoint signature:**
   ```python
   async def post_planner_simulate(request: web.Request) -> web.Response:
       """Simulate battery planning with synthetic inputs."""
       try:
           payload = await request.json()
           inputs = PlannerInputs.from_dict(payload)
           result = plan_battery_schedule(inputs)
           return web.json_response({
               "timeline": [s.to_dict() for s in result.states],
               "modes": result.modes,
               "total_cost": result.total_cost,
               ...
           })
       except ValueError as e:
           return web.json_response({"error": str(e)}, status=400)
   ```

2. **Integration point:**
   - No upstream refactoring needed.
   - `plan_battery_schedule()` is already pure; use it as-is.
   - Add endpoint to REST API integration (`custom_components/oig_cloud/api_v1_rest.py` or similar).

3. **Input validation:**
   - `PlannerInputs.__post_init__()` already validates all fields.
   - If validation fails, return 400 with error message.

4. **Rate limiting:**
   - Endpoint should be rate-limited (e.g., 10 req/min per user session) to prevent DOS via expensive simulation.

5. **No changes needed:**
   - `forecast_update.py`, `economic_planner.py`, `data/`, sensor methods all stay as-is.
   - Simulator is a pure side-car using existing core logic.

---

## Appendix A: Hardcoded Constants Found (P8 Audit Reference)

Per the P8 audit, the following hardcoded constants were verified and cataloged:

| Constant | Value | File:Line | Status | Recommendation |
|----------|-------|-----------|--------|-----------------|
| `_HW_MIN_FRACTION` | 0.20 | detail_tabs_baseline.py:24 | Hardcoded | Promote to config |
| `MODE_GUARD_MINUTES` | 60 | forecast_update.py:42 | Hardcoded | Promote to config (expert) |
| `_COMFORT_CHEAP_PERCENTILE` | 0.30 | economic_planner.py:28 | Hardcoded | Promote to config (expert) in F2 |
| `DEFAULT_ROUND_TRIP_EFFICIENCY` | 0.8379 | economic_planner_types.py:21 | Hardcoded | Promote to config (read from sensor if available) |
| `MIN_MODE_DURATION[HOME_UPS]` | 2 intervals (30 min) | types.py:132 | Hardcoded | Keep as-is (safety constraint) |
| `_HOLDING_SOC_THRESHOLD` | 97.0 | balancing/core.py:629 | Hardcoded | Promote to config (expert) if balancing tuning requested |
| `max_intervals` | 144 (36 hours) | forecast_update.py:883 | Hardcoded | Keep as-is (internal optimization) |
| `DEFAULT_EFFICIENCY` | 0.882 | types.py:86 | Hardcoded | Keep as constant (foundational physics) |
| `DEFAULT_CHARGE_EFFICIENCY` | 0.95 | types.py:87 | Hardcoded | Keep as constant (foundational physics) |
| `INTERVAL_MINUTES` | 15 | types.py:80 | Hardcoded | Keep as constant (simulation resolution) |
| `INTERVALS_PER_HOUR` | 4 | types.py:81 | Derived from INTERVAL_MINUTES | Keep as-is |
| `DEFAULT_CHARGE_RATE_KW` | 2.8 | types.py:91 | Fallback to config | See `home_charge_rate` (§1.1.1) |

---

## Appendix B: File Structure Reference

Key files in the battery_forecast module:

```
custom_components/oig_cloud/battery_forecast/
├── planning/
│   ├── forecast_update.py          [Main update cycle, input assembly, planner entry]
│   ├── mode_guard.py               [Post-planning guard rails, mode guard logic]
│   ├── auto_switch.py              [Automatic mode switching logic]
│   └── scenario_analysis.py        [Scenario evaluation]
├── economic_planner.py             [Core economic planning engine]
├── economic_planner_types.py       [PlannerInputs, PlannerResult dataclasses]
├── types.py                        [Constants, mode enums, TypedDicts]
├── config.py                       [SimulatorConfig, HybridConfig, BalancingConfig]
├── data/
│   ├── input.py                    [Load/solar query helpers]
│   ├── pricing.py                  [Spot/export price handling]
│   ├── adaptive_consumption.py     [Adaptive load profile logic]
│   └── battery_state.py            [Capacity/SoC sensor methods]
├── balancing/
│   ├── core.py                     [Balancing state machine]
│   └── ...
└── sensors/
    └── ...
```

---

## Appendix C: Entry Points Summary

**Three levels of entry:**

1. **Planning orchestration:** `async_update()` in forecast_update.py:1482
   - Called on schedule (typically 15 min)
   - Fetches all live data, assembles inputs, calls planner, saves results

2. **Forecast assembly:** `_prepare_forecast_inputs()` in forecast_update.py:1410
   - Gathers capacity, prices, solar, load, adaptive profiles
   - Returns tuple of inputs to planner

3. **Core planning (entry for simulator):** `plan_battery_schedule(inputs)` in economic_planner.py
   - Pure function; takes synthetic PlannerInputs
   - Returns modes, costs, SoC trajectory
   - No sensor calls; no Home Assistant dependencies

---

## Appendix D: Box Telemetry Map — Planner & Boiler Inputs

**Follow-up research (2026-07-26):** This section maps each planner and boiler input (from Parts 1–2) against the actual Home Assistant sensor fields the box reports. For each input, we identify:
1. **Box field name:** Exact Home Assistant entity suffix or computed sensor key
2. **Sensor source:** Data/Batt/Extended/Boiler type category
3. **Recommendation:** Primary source (sensor vs. config vs. hardcoded)
4. **Risk note:** Staleness, unit mismatch, missing data

### Mapping Table: Planner Inputs → Box Telemetry

| Planner Input | Config Key / Fetch Method | Box Field (Home Assistant Entity Suffix) | Sensor Type | Recommendation | Risk Note |
|---|---|---|---|---|---|
| **Current SoC** | `_get_current_battery_capacity()` | `tbl_batt_bat_c` | Data/BATT | Sensor PRIMARY (read-only display) | None — real-time |
| **Max Battery Capacity** | `_get_max_battery_capacity()` | `installed_battery_capacity_kwh` (computed from config + sensors) | Extended/BATT | Sensor PRIMARY with config fallback | Static unless degradation tracked separately |
| **Min Battery Capacity (HW)** | `_get_min_battery_capacity()` | `tbl_batt_prms_bat_min` | Data/BATT | Sensor PRIMARY (box-reported HW floor) | Matches hardware; no override needed |
| **Charge Rate Limit (home_charge_rate)** | config_entry.options | None — NOT in box telemetry | Config only | Config PRIMARY | User sets; inverter max is separate |
| **Comfort SoC Target** | config_entry.options `battery_comfort_soc_percent` | None — NOT in box telemetry | Config only | Config PRIMARY | Entirely user-driven |
| **Expensive Percentile** | config_entry.options `expensive_percentile` | None — NOT in box telemetry | Config only | Config PRIMARY | No box-level correlation |
| **Spot Prices** | `_get_spot_price_timeline()` (cloud API) | None — from cloud, not box | Cloud API | Cloud PRIMARY | External provider (forecast.solar fallback if Solcast fails) |
| **Export Prices** | `_get_export_price_timeline()` (cloud API) | None — from cloud, not box | Cloud API | Cloud PRIMARY | Same provider as spot prices |
| **Solar Forecast** | `_get_solar_forecast()` (HA helper entity) | `sensor.forecast_solar_estimate_…` or `sensor.solcast_…` | Data/SOLAR_FORECAST | Sensor PRIMARY (computed from external service) | 48-hour horizon; degradation after sunset typical |
| **Adaptive Load Profiles** | `AdaptiveConsumptionHelper.get_adaptive_load_prediction()` | None — computed from history | Computed/history | Sensor-derived (historical patterns) | Requires 48+ hours of history; falls back to avg_sensors |
| **Load Average Sensors** | `_get_load_avg_sensors()` (statistics) | Historical: `sensor.oig_{box_id}_load_avg_*` | Data/statistics | Sensor PRIMARY (fallback) | 30-min, 1-hour, 4-hour rolling averages |
| **Boiler Grid Load Overlay** | `_read_boiler_grid_load_overlay()` (hass.data boundary) | None — boiler planner output, not a sensor | Computed/inter-module | Boiler plan PRIMARY | One-cycle lag (15–30 min old); soft-coupled |
| **Round-Trip Efficiency** | Hardcoded `DEFAULT_ROUND_TRIP_EFFICIENCY = 0.8379` | None — should read from `sensor.oig_{box_id}_battery_efficiency` | Hardcoded (with sensor availability) | **Promote to sensor if available** | Currently hardcoded; efficiency sensor exists but not used in planner |
| **HW Min Fraction** | Hardcoded `_HW_MIN_FRACTION = 0.20` | Implied in `tbl_batt_prms_bat_min` | Hardcoded | Promote to config (expert) | 20% default OK; advanced users may want 15–25% |
| **Comfort Cheap Percentile** | Hardcoded `_COMFORT_CHEAP_PERCENTILE = 0.30` | None — NOT in box telemetry | Hardcoded | Keep hardcoded (F1); promote to config in F2 | Derived from price timeline only |
| **Mode Guard Duration** | Hardcoded `MODE_GUARD_MINUTES = 60` | None — NOT in box telemetry | Hardcoded | Promote to config (expert, F2) | Affects mode stability; 60 min is safe default |
| **Planning Horizon** | Hardcoded `max_intervals = 144` (36 hours) | None — internal optimization | Hardcoded | Keep hardcoded | No user value in exposing |
| **Min Mode Duration** | Hardcoded `MIN_MODE_DURATION` dict | None — NOT in box telemetry | Hardcoded | Keep hardcoded (safety constraint) | UPS ≥30 min to avoid churn |
| **Box Floor Safety Margin** | Hardcoded `box_floor_safety_margin_pct` ~309 in forecast_update.py | (Not found in sensor inventory) | Hardcoded | **Verify existence and usage** | Appears in brief but not located in current code |

**Total mapped rows:** 19 planner inputs
**Box fields found:** 4 direct sensors (SoC%, min%, boiler state, installed capacity)
**Cloud/Config-only inputs:** 8 (prices, solar, comfort %, expensive %, charge rate, load profiles, etc.)
**Missing/Hardcoded:** 5 (efficiency, HW min fraction, mode durations, etc.)

---

### Mapping Table: Boiler Inputs → Box Telemetry

| Boiler Input | Source / Fetch Method | Box Field (Home Assistant Entity Suffix) | Sensor Type | Recommendation | Risk Note |
|---|---|---|---|---|---|
| **Boiler State (on/off/manual mode)** | Boiler module reads own sensor | `tbl_boiler_prms_ison`, `tbl_boiler_prms_manual` | Data/BOILER | Sensor PRIMARY | Real-time from boiler firmware |
| **Boiler Current Power (grid)** | Boiler module reads own sensor | `tbl_boiler_p` (CBB) or computed | Data/BOILER | Sensor PRIMARY (non-backup) | Live measurement; non-backup consumption tracked separately |
| **Boiler SSR Relay States** | Boiler module diagnostic | `tbl_boiler_prms_ssr0`, `tbl_boiler_prms_ssr1`, `tbl_boiler_prms_ssr2` | Data/BOILER | Diagnostic only | For troubleshooting; not used in planning |
| **Boiler Min SoC %** | Boiler config (coupling signal to planner) | None — from boiler config_entry, not battery sensor | Config/inter-module | Boiler config PRIMARY | Merged into battery `planning_min_percent` via `_derive_planning_min_percent()` |
| **Boiler Installed Power** | Boiler module sensor | `tbl_boiler_prms_p_set` | Data/BOILER | Sensor PRIMARY (diagnostic) | For capacity planning only |
| **Boiler Temperature (if T-sensor available)** | Would be: `sensor.oig_{box_id}_boiler_temp_*` | (Not found in SENSOR_TYPES; gas boilers may lack T-sensor) | Missing/Optional | Sensor PRIMARY if available | Gas boiler (memory) lacks temperature sensor; electric heater (Devi) has one |

**Total mapped rows:** 6 boiler-related inputs
**Box fields found:** 4 direct sensors (state, power, SSR relays, installed power)
**Temperature sensor:** Not in current inventory for gas boiler

---

### Top 5 Wire-to-Box Candidates (Primary Recommendations)

#### 1. **Battery Round-Trip Efficiency** (HIGH PRIORITY)
- **Current:** Hardcoded constant `0.8379` in `types.py:21`
- **Box field available:** `sensor.oig_{box_id}_battery_efficiency` (exists but not consumed by planner)
- **Recommendation:** Wire as PRIMARY sensor with constant fallback
- **Reason:** Efficiency degrades with battery age; reading live value enables per-site tuning without code changes
- **Implementation:** Read sensor in `forecast_update.py:_get_battery_efficiency()`, cache for 15-min cycle

#### 2. **Battery Hardware Minimum Capacity** (ALREADY WIRED, VERIFY)
- **Current:** Sensor `tbl_batt_prms_bat_min` exists and is read via `_get_min_battery_capacity()`
- **Box field:** `sensor.oig_{box_id}_batt_bat_min` (battery minimum percentage)
- **Recommendation:** CONFIRM it is used as PRIMARY in planner (it is — forecast_update.py:364)
- **Reason:** Hardware safety floor must come from box, never from user config
- **Status:** ✓ Correctly wired as sensor PRIMARY

#### 3. **Boiler Min SoC %** (ALREADY WIRED, VERIFY)
- **Current:** Boiler config read via `_resolve_proxy_bat_min_pct()` in forecast_update.py:912–914
- **Box field:** Not a sensor; boiler's own config_entry.options
- **Recommendation:** CONFIRM coupling is active and merged correctly
- **Reason:** Boiler's min SoC constrains battery planning min via `planning_min_percent`
- **Status:** ✓ Correctly coupled through inter-module config signal

#### 4. **Battery Current SoC** (ALREADY WIRED, VERIFY)
- **Current:** Sensor `tbl_batt_bat_c` exists and is read via `_get_current_battery_capacity()`
- **Box field:** `sensor.oig_{box_id}_batt_bat_c` (battery % live)
- **Recommendation:** CONFIRM as PRIMARY sensor (it is — forecast_update.py:362)
- **Reason:** Starting SoC is the foundation of all forecasts; must always be live
- **Status:** ✓ Correctly wired as sensor PRIMARY

#### 5. **Boiler Grid Load Forecast** (ALREADY WIRED, VERIFY)
- **Current:** Boiler planner result read via `_read_boiler_grid_load_overlay()` at forecast_update.py:545
- **Box field:** Not a sensor; boiler planner output stored in `hass.data[DOMAIN][entry_id][KEY_BOILER_RUNTIMES]`
- **Recommendation:** CONFIRM inter-module coupling and one-cycle lag are documented
- **Reason:** Boiler load must be folded into battery forecast to avoid pre-charge shortfall
- **Status:** ✓ Correctly coupled with documented one-cycle lag

---

### Missing Sensor: Box Floor Safety Margin

**Verification required:** The brief mentions `box_floor_safety_margin_pct` at `forecast_update.py:~309`, but this field was not located in the current sensor inventory or code search.

**Search result:**
```bash
$ grep -n "box_floor_safety_margin_pct\|floor_safety" /repos/wt-f1-boxmap/custom_components/oig_cloud/battery_forecast/planning/forecast_update.py
[No results]
```

**Status:** Field not found. Possibly:
1. Removed in a prior refactor
2. Named differently (e.g., `_HOLDING_SOC_THRESHOLD`, `_HW_MIN_FRACTION`)
3. In boiler module, not battery planner

**Recommendation:** Check boiler module docs for floor-related constants; confirm whether this is a gap or a naming difference.

---

### Summary: Sensor Primary vs. Config Primary

**Sensor PRIMARY (read from box at planning time):**
- Current SoC (battery %)
- Max/Min capacity (hardware floor)
- Boiler state (on/off, power, SSR relays)
- Boiler installed power (diagnostic)
- Load historical averages (rolling 30-min, 1-hour, 4-hour)

**Config PRIMARY (user-set, persisted in config_entry):**
- Charge rate limit (2.8 kW default)
- Comfort SoC target (50% default)
- Expensive price percentile (70th default)
- Boiler min SoC % (coupled to planner)
- Mode guard duration (60 min default)

**Cloud PRIMARY (external API, cached):**
- Spot prices (grid import)
- Export prices (grid export/feed-in)
- Solar forecast (48-hour ahead)

**Hardcoded (candidates for promotion to config/sensor):**
- Round-trip efficiency (0.8379 → promote to sensor)
- HW min fraction (0.20 → promote to config, expert)
- Comfort cheap percentile (0.30 → promote to config, expert, F2)
- Mode guard duration (60 min → promote to config, expert, F2)
- Holding SoC threshold (97% → keep hardcoded, internal)

---

**End of Research Report**
