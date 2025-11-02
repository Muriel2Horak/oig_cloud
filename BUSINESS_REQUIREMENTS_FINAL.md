# Business Požadavky - Finální Verze

**Datum:** 2. listopadu 2025
**Revize:** 2.0 (kompletní přepracování)

---

## 🎯 Primární Cíl

**Minimalizovat celkové náklady na dosažení a udržení požadovaného SoC při maximální stabilitě systému**

---

## 📋 Business Požadavky

### BR-0: Kapacitní Limity a Target z Config Flow 🔋

**Priorita:** P0 (FUNDAMENTÁLNÍ) - **Základní pravidla pro všechny výpočty**

#### 0.1 Fyzické a Konfigurační Kapacity

**Hardware limity (z Home Assistant senzorů):**
```python
# Sensor: sensor.oig_{box_id}_installed_battery_capacity_kwh
total_capacity = 15.36 kWh          # 100% instalované kapacity
# Kde najít: state.attributes.installed_battery_capacity_kwh
# Použití: _get_total_battery_capacity() lines ~3200-3245

# Sensor: sensor.oig_{box_id}_batt_bat_min
hardware_min_soc = 20%              # 3.072 kWh - HARD LIMIT (nikdy níž)
# Kde najít: state.attributes.batt_bat_min
# Použití: Validation check (nelze jít níž)

# Sensor: sensor.oig_{box_id}_usable_battery_capacity
usable_capacity = 12.29 kWh         # Dynamická hodnota z API (~80% total)
# Kde najít: state.attributes.usable_battery_capacity
# Použití: Display purposes (ne pro calculations)

# Sensor: sensor.oig_{box_id}_battery_soc
current_soc_percent = 55%           # Aktuální stav baterie (%)
# Kde najít: state.state (hlavní hodnota)
# Použití: Výchozí bod pro všechny výpočty

# Sensor: sensor.oig_{box_id}_battery_soc_kwh
current_soc_kwh = 8.45 kWh          # Aktuální stav baterie (kWh)
# Kde najít: state.state nebo vypočítat: total_capacity × (soc_percent / 100)
# Použití: Timeline calculations, forward/backward pass

# Sensor: sensor.oig_{box_id}_box_prms_mode
current_mode = "Home 1"             # Aktuální režim invertoru
# Kde najít: state.state (textové hodnoty: "Home 1", "Home 2", "Home 3", "Home UPS")
# Mapování: "Home 1"→0, "Home 2"→1, "Home 3"→2, "Home UPS"→3
# Použití: Mode tracking, history analysis (lines ~3590, ~3646-3683)

# Sensor: sensor.oig_{box_id}_battery_efficiency
battery_efficiency = 88.2%          # DC/AC conversion efficiency
# Kde najít: state.attributes.battery_efficiency nebo fallback 0.882
# Použití: _get_battery_efficiency(), discharge/charge calculations
```

**User konfigurace (Config Flow):**
```python
# Z config_entry.options nebo config_entry.data
min_capacity_percent = 33%          # Default (user adjustable 20-80%)
# Kde najít: config_entry.options.get("min_capacity_percent", 33)
# Použití: _get_min_battery_capacity() lines ~3295-3325

target_capacity_percent = 80%       # Default (user adjustable 50-100%)
# Kde najít: config_entry.options.get("target_capacity_percent", 80)
# Použití: Automatic planning endpoint (EOD target)

home_charge_rate = 2.8              # Max AC charging power (kW)
# Kde najít: config_entry.options.get("home_charge_rate", 2.8)
# Použití: UPS mode charging calculations
# Per interval: max_charge_per_interval = home_charge_rate / 4.0  # kWh/15min

# Vypočtené hodnoty
min_capacity_kwh = 15.36 × 0.33 = 5.0688 kWh    # User minimum
# Funkce: _get_min_battery_capacity()
# Použití: Forward/backward pass, deficit calculation, validation

target_capacity_kwh = 15.36 × 0.80 = 12.288 kWh # User target
# Funkce: _get_target_battery_capacity() (může existovat nebo inline výpočet)
# Použití: Automatic planning, EOD goal
```

**Vztahy:**
```
hardware_min_soc (20%)
    ≤ min_capacity_percent (33%)
    ≤ target_capacity_percent (80%)
    ≤ 100%

V kWh:
3.072 kWh (hardware)
    ≤ 5.0688 kWh (user min)
    ≤ 12.288 kWh (user target)
    ≤ 15.36 kWh (total)
```

**Jak získat hodnoty v kódu:**
```python
# V rámci OigCloudBatteryForecastSensor class:

# 1. Total capacity
total = self._get_total_battery_capacity()  # 15.36 kWh

# 2. Min capacity (user config)
min_kwh = self._get_min_battery_capacity()  # 5.0688 kWh

# 3. Target capacity (user config)
config = self._config_entry.options or self._config_entry.data
target_percent = config.get("target_capacity_percent", 80)
target_kwh = total * (target_percent / 100.0)  # 12.288 kWh

# 4. Current SoC
current_soc = self._get_current_battery_soc()  # např. 8.45 kWh

# 5. Charging rate
charge_rate_kw = config.get("home_charge_rate", 2.8)
charge_per_interval = charge_rate_kw / 4.0  # 0.7 kWh/15min

# 6. Efficiency
efficiency = self._get_battery_efficiency()  # 0.882

# 7. Current mode (z historie)
mode_state = self.hass.states.get(f"sensor.oig_{self._box_id}_box_prms_mode")
mode_text = mode_state.state  # "Home 1"
mode_int = self._convert_mode_text_to_int(mode_text)  # 0
```

#### 0.2 Požadavky na min_capacity

**HARD CONSTRAINT:** Baterie **NIKDY NESMÍ** klesnout pod `min_capacity_kwh`

**Implementace:**

1. **Plánování (timeline generation):**

```python
def _calculate_optimal_modes_hybrid(self, intervals_data, target_soc):
    """
    HLAVNÍ CHYBA BYLA TADY: Forward pass používal max(0, battery)
    místo max(min_capacity, battery)
    """

    min_capacity = self._get_min_battery_capacity()  # 5.0688 kWh

    # ❌ PŮVODNÍ KÓD (ŠPATNĚ):
    # PHASE 1: Forward pass - simulace spotřeby
    for i in range(len(intervals_data)):
        # ... výpočet spotřeby ...
        battery = battery - net_load + solar_production
        battery = max(0, min(battery, max_capacity))  # ❌ CHYBA!
        #            ^^^
        #            Tady je BUG - ignoruje min_capacity!

    # ✅ SPRÁVNÝ KÓD:
    # PHASE 1: Forward pass - simulace spotřeby
    for i in range(len(intervals_data)):
        # ... výpočet spotřeby ...
        battery = battery - net_load + solar_production
        battery = max(min_capacity, min(battery, max_capacity))  # ✅ CORRECT
        #            ^^^^^^^^^^^^^
        #            Respektuje user minimum!

        # Pokud jsme klesli na minimum → deficit
        if battery <= min_capacity + 0.01:  # Malá tolerance
            deficit_detected = True
            deficit_intervals.append(i)
```

**Dopad chyby:**
- Algoritmus plánoval režimy které vedly k SoC < min_capacity
- Uživatel viděl např. 15% SoC, přestože nastavil min 33%
- Baterie mohla klesnout k hardware minimu (20%)
- **Porušení business requirementu BR-0**

**Kde všude je chyba:**

```python
# Soubor: oig_cloud_battery_forecast.py

# Line ~1950: PHASE 1 - Forward Pass
battery = max(0, min(battery, max_capacity))  # ❌ BUG
# FIX: battery = max(min_capacity, min(battery, max_capacity))

# Line ~2020: PHASE 3 - Backward Pass
battery = max(0, min(battery, max_capacity))  # ❌ BUG
# FIX: battery = max(min_capacity, min(battery, max_capacity))

# Line ~2100: PHASE 5 - Deficit Calculation
battery = max(0, min(battery, max_capacity))  # ❌ BUG
# FIX: battery = max(min_capacity, min(battery, max_capacity))

# Line ~850: _simulate_interval_with_mode()
battery = max(0, min(battery, max_capacity))  # ❌ BUG
# FIX: battery = max(min_capacity, min(battery, max_capacity))
```

**VŠECHNY tyto řádky MUSÍ být opraveny!**

---

**2. Simulace Intervalů** - `_simulate_interval_with_mode()`

```python
def _simulate_interval_with_mode(
    self,
    battery_soc: float,
    mode: int,
    solar_kwh: float,
    home_consumption_kwh: float,
    interval_data: dict
) -> dict:
    """
    Simulace jednoho 15min intervalu.

    KRITICKÉ: MUSÍ respektovat min_capacity během všech výpočtů!
    """

    min_capacity = self._get_min_battery_capacity()
    max_capacity = self._get_total_battery_capacity()

    # Výchozí hodnoty
    battery = battery_soc
    grid_import = 0
    grid_export = 0

    # === Režim HOME I (0) ===
    if mode == 0:
        # FVE → load → baterie → grid
        remaining = solar_kwh - home_consumption_kwh

        if remaining > 0:
            # Přebytek → nabít baterii
            can_charge = max_capacity - battery
            charged = min(remaining, can_charge)
            battery += charged
            battery = min(battery, max_capacity)  # ✅ OK - max limit

            # Zbytek → export
            grid_export = remaining - charged

        else:
            # Deficit → baterie → grid
            deficit = abs(remaining)

            # ❌ PŮVODNÍ:
            # can_discharge = battery  # Může vybít až na 0

            # ✅ SPRÁVNĚ:
            can_discharge = max(0, battery - min_capacity)  # Rezervovat minimum!

            discharged = min(deficit, can_discharge)
            battery -= discharged
            battery = max(min_capacity, battery)  # ✅ ENFORCE minimum

            # Chybějící energie → ze sítě
            grid_import = deficit - discharged

    # === Režim HOME II (1) ===
    elif mode == 1:
        # FVE → load, baterie NETOUCHED
        # ... (baterie se nemění, min_capacity automaticky dodržen)

    # === Režim HOME III (2) ===
    elif mode == 2:
        # FVE → baterie, load → grid
        # ✅ SPRÁVNĚ: Nabíjení až na max_capacity (už implementováno)
        battery += solar_kwh
        battery = min(battery, max_capacity)
        grid_import = home_consumption_kwh

    # === Režim HOME UPS (3) ===
    elif mode == 3:
        # Grid → baterie (nabíjení)
        charge_rate_kw = self._config_entry.options.get("home_charge_rate", 2.8)
        charge_per_interval = charge_rate_kw / 4.0  # kWh per 15 min

        can_charge = max_capacity - battery
        charged = min(charge_per_interval, can_charge)

        battery += charged
        battery = min(battery, max_capacity)  # ✅ OK - max limit
        grid_import += charged / efficiency  # AC energie potřebná

    # === FINAL CLAMP (KRITICKÉ!) ===
    # ❌ PŮVODNÍ:
    # battery = max(0, min(battery, max_capacity))

    # ✅ SPRÁVNĚ:
    battery = max(min_capacity, min(battery, max_capacity))

    return {
        "battery_soc": battery,
        "grid_import": grid_import,
        "grid_export": grid_export,
        "mode": mode
    }
```

---

**3. Deficit Detection & UPS Charging**

```python
def detect_deficit_intervals(self, battery_trajectory, min_capacity):
    """
    Najít intervaly kde baterie klesá pod minimum.

    DŮLEŽITÉ: Toto je CONSEQUENCE chyby z forward passu.
    Pokud forward pass správně používá min_capacity,
    deficit detection by měl najít 0 deficitů (nebo velmi málo).
    """

    deficit_intervals = []

    for i, soc in enumerate(battery_trajectory):
        if soc < min_capacity - 0.01:  # Tolerance 10 Wh
            deficit = min_capacity - soc
            deficit_intervals.append({
                "interval": i,
                "soc": soc,
                "deficit_kwh": deficit,
                "severity": "critical" if deficit > 1.0 else "warning"
            })

    return deficit_intervals
```

**4. Validation po výpočtu**

```python
def validate_plan(self, timeline, min_capacity):
    """
    Ověřit že plán dodržuje min_capacity.

    MUSÍ běžet po každém výpočtu!
    """

    violations = []
    TOLERANCE = 0.01  # 10 Wh (floating point tolerance)

    for i, interval in enumerate(timeline):
        if interval["battery_soc"] < min_capacity - TOLERANCE:
            violations.append({
                "interval": i,
                "time": interval["time"],
                "soc": interval["battery_soc"],
                "min_required": min_capacity,
                "violation": min_capacity - interval["battery_soc"]
            })

    if violations:
        log_error(f"❌ Min capacity violated in {len(violations)} intervals!")
        for v in violations[:5]:  # Prvních 5
            log_error(
                f"  Interval {v['interval']} ({v['time']}): "
                f"SoC {v['soc']:.3f} kWh < {v['min_required']:.3f} kWh "
                f"(shortfall: {v['violation']:.3f} kWh)"
            )

        # Metadata pro debugging
        return {
            "valid": False,
            "violations_count": len(violations),
            "worst_violation": max(v["violation"] for v in violations),
            "violations": violations
        }

    log_info(f"✅ Plan validated: min_capacity respected in all {len(timeline)} intervals")
    return {"valid": True, "violations_count": 0}
```

---

##### 0.2.2 Failure Handling

**Co dělat když nelze dodržet min_capacity?**

```python
def handle_min_capacity_violation(self, timeline, min_capacity):
    """
    Pokud plán porušuje minimum → opravit.

    Strategie:
    1. Přidat UPS charging v deficitních intervalech
    2. Posunout UPS charging dříve (preventive)
    3. Pokud stále nelze → warning + best effort
    """

    # Krok 1: Najít deficity
    violations = self.validate_plan(timeline, min_capacity)

    if violations["valid"]:
        return timeline  # OK, nic dělat

    # Krok 2: Zkusit přidat emergency UPS charging
    log_info("Attempting to fix min_capacity violations with UPS charging...")

    for violation in violations["violations"]:
        i = violation["interval"]
        deficit = violation["violation"]

        # Najít nejbližší předchozí interval kde můžeme nabít
        for j in range(i - 1, -1, -1):
            if timeline[j]["mode"] == 0:  # HOME I
                # Změnit na UPS
                timeline[j]["mode"] = 3

                # Re-simulovat s UPS
                updated = self._simulate_interval_with_mode(
                    battery_soc=timeline[j-1]["battery_soc"] if j > 0 else current_soc,
                    mode=3,
                    ...
                )

                timeline[j] = updated

                # Kontrola zda to pomohlo
                if updated["battery_soc"] >= min_capacity:
                    log_info(f"Fixed interval {i} by adding UPS at interval {j}")
                    break

    # Krok 3: Re-validovat
    revalidation = self.validate_plan(timeline, min_capacity)

    if revalidation["valid"]:
        log_info("✅ Min_capacity violations fixed!")
        return timeline

    # Krok 4: Stále porušeno → warning (krajní případ)
    log_warning(
        f"⚠️ Cannot fix min_capacity violations. "
        f"Remaining violations: {revalidation['violations_count']}"
    )

    # Metadata pro UI
    timeline.metadata["min_capacity_achievable"] = False
    timeline.metadata["worst_soc"] = min(t["battery_soc"] for t in timeline)

    return timeline
```

---

##### 0.2.3 Testing & Verification

**Unit testy pro min_capacity:**

```python
def test_min_capacity_never_violated():
    """Test že min_capacity je VŽDY dodrženo."""

    min_capacity = 5.0688  # 33% z 15.36 kWh

    # Extrémní scénář: vysoká spotřeba, nulové FVE
    timeline = calculate_plan(
        current_soc=6.0,  # Těsně nad minimem
        consumption_kwh=2.0,  # Vysoká spotřeba per interval
        solar_kwh=0.0,  # Žádné FVE
        intervals=96  # Celý den
    )

    # Ověřit KAŽDÝ interval
    for i, interval in enumerate(timeline):
        assert interval["battery_soc"] >= min_capacity, \
            f"Interval {i}: SoC {interval['battery_soc']} < min {min_capacity}"

    print("✅ min_capacity respected in all intervals")


def test_forward_pass_clamp():
    """Test že forward pass používá správný clamp."""

    # Simulovat forward pass kód
    battery = 4.0  # Pod minimem (5.0688)
    min_capacity = 5.0688
    max_capacity = 15.36

    # ❌ Špatný clamp
    wrong = max(0, min(battery, max_capacity))
    assert wrong == 4.0  # Vrátí 4.0 (POD minimem!)

    # ✅ Správný clamp
    correct = max(min_capacity, min(battery, max_capacity))
    assert correct == 5.0688  # Vrátí minimum (SPRÁVNĚ!)

    print("✅ Clamp works correctly")
```

---

##### 0.2.4 Config Flow Validation

```python
# V config_flow.py

async def async_step_user(self, user_input=None):
    """Validovat min_capacity při uložení."""

    errors = {}

    if user_input is not None:
        min_percent = user_input.get("min_capacity_percent")

        # Validace 1: min ≥ hardware minimum (20%)
        if min_percent < 20:
            errors["min_capacity_percent"] = "below_hardware_minimum"

        # Validace 2: min < target
        target_percent = user_input.get("target_capacity_percent", 80)
        if min_percent >= target_percent:
            errors["min_capacity_percent"] = "must_be_below_target"

        # Validace 3: Reasonable range
        if min_percent > 80:
            errors["min_capacity_percent"] = "too_high"

        if not errors:
            return self.async_create_entry(
                title="OIG Cloud",
                data=user_input
            )

    return self.async_show_form(
        step_id="user",
        data_schema=vol.Schema({
            vol.Required("min_capacity_percent", default=33): vol.All(
                vol.Coerce(int),
                vol.Range(min=20, max=80)
            ),
            vol.Required("target_capacity_percent", default=80): vol.All(
                vol.Coerce(int),
                vol.Range(min=50, max=100)
            ),
        }),
        errors=errors
    )
```

#### 0.3 Požadavky na target_capacity

**SOFT CONSTRAINT:** Baterie **BY MĚLA** dosáhnout `target_capacity_kwh` do konce plánovacího období

**Typy target:**

##### 1. **Automatic Target (EOD - End of Day)**
```python
# Default automatické plánování
target_soc = config.target_capacity_percent  # 80%
deadline = end_of_day  # 23:59

# Požadavek: Dosáhnout 80% do půlnoci
# Pokud nelze → best effort + warning
```

##### 2. **Manual Target (User-specified)**
```python
# Uživatel zadá specifický cíl
target_soc = 90%           # Vyšší než default
deadline = "06:00"         # Konkrétní čas
holding_duration = 2h      # Držet 06:00-08:00

# Požadavek: Dosáhnout 90% do 06:00 a držet
```

##### 3. **Emergency Target**
```python
# Speciální režim (např. očekávaný výpadek)
target_soc = 100%
deadline = "now + 2h"
mode = "fast"  # Ignorovat cenu, rychle nabít

# Požadavek: ASAP nabít na maximum
```

**Pravidla:**

1. **Achievability Check:**
   ```python
   def is_target_achievable(
       current_soc: float,
       target_soc: float,
       deadline: datetime,
       max_charging_power: float
   ) -> bool:
       """Ověřit zda je target reálně dosažitelný."""

       time_available = (deadline - now).total_seconds() / 3600  # hours
       charge_needed = target_soc - current_soc  # kWh

       # Max charging rate (kW) × čas (h) = max možné nabití (kWh)
       max_possible_charge = max_charging_power * time_available * efficiency

       return max_possible_charge >= charge_needed
   ```

2. **Fallback Strategy:**
   ```python
   if not is_target_achievable(target):
       # Spočítat best effort target
       best_effort = current_soc + (max_possible_charge × 0.95)  # 5% margin

       log_warning(
           f"Target {target}% not achievable, best effort: {best_effort:.1f}%"
       )

       metadata["target_achievable"] = False
       metadata["predicted_soc"] = best_effort
       metadata["shortfall"] = target - best_effort

       # Použít best effort jako nový target
       adjusted_target = best_effort
   ```

3. **Target vs min_capacity Priority:**
   ```python
   # ALWAYS: min_capacity má prioritu nad target

   if achieving_target_would_violate_minimum:
       # Obětovat target, zachovat minimum
       log_info("Target adjusted to maintain min_capacity")
       target = max(target, min_capacity + safety_margin)
   ```

4. **Continuous Tracking:**
   ```python
   # Během běhu plánu sledovat progress
   progress_to_target = {
       "current_soc": actual_soc,
       "target_soc": target_soc,
       "time_remaining": deadline - now,
       "on_track": actual_soc >= planned_soc - tolerance,
       "estimated_final": predict_final_soc(),
   }

   # Pokud off-track → replan
   if not progress_to_target["on_track"]:
       trigger_replan()
   ```

#### 0.4 Konfigurace z Config Flow

**User-adjustable parametry:**

```python
# Config Flow schema
{
    "min_capacity_percent": {
        "type": "integer",
        "default": 33,
        "min": 20,  # Nesmí být pod hardware minimum
        "max": 80,  # Nesmí být nad target
        "description": "Minimální úroveň baterie (%)",
        "step": 1
    },
    "target_capacity_percent": {
        "type": "integer",
        "default": 80,
        "min": 50,  # Rozumný minimum
        "max": 100,
        "description": "Cílová úroveň baterie na konci dne (%)",
        "step": 1
    },
    "home_charge_rate": {
        "type": "float",
        "default": 2.8,
        "min": 1.0,
        "max": 5.0,
        "description": "Max rychlost AC nabíjení (kW)",
        "step": 0.1
    }
}
```

**Validation při uložení:**
```python
def validate_config(config):
    """Validovat config flow hodnoty."""

    errors = []

    # min ≥ hardware minimum
    if config["min_capacity_percent"] < 20:
        errors.append("min_capacity nesmí být pod 20% (hardware limit)")

    # min < target
    if config["min_capacity_percent"] >= config["target_capacity_percent"]:
        errors.append("min_capacity musí být menší než target_capacity")

    # Reasonable ranges
    if config["target_capacity_percent"] < 50:
        errors.append("target_capacity by měl být alespoň 50%")

    if config["home_charge_rate"] < 1.0:
        errors.append("home_charge_rate příliš nízký (min 1.0 kW)")

    return errors
```

**Dynamic updates:**
```python
# Když uživatel změní config
async def on_config_change(old_config, new_config):
    """Reagovat na změnu konfigurace."""

    if new_config["min_capacity_percent"] != old_config["min_capacity_percent"]:
        log_info(f"Min capacity changed: {old_config['min_capacity_percent']}% → {new_config['min_capacity_percent']}%")

        # Invalidovat aktuální plán
        invalidate_active_plan()

        # Přepočítat s novým minimum
        await recalculate_plan()

    if new_config["target_capacity_percent"] != old_config["target_capacity_percent"]:
        log_info(f"Target capacity changed: {old_config['target_capacity_percent']}% → {new_config['target_capacity_percent']}%")

        # Přepočítat pouze pokud je automatic plan
        if active_plan.requester == "automatic":
            await recalculate_plan()
        # Manual plan není ovlivněn (má vlastní target)
```

#### 0.5 Integration s Plánováním

**V automatic režimu:**
```python
# Běží každých 15 minut
def automatic_planning():
    config = get_config()

    plan = calculate_optimal_plan(
        current_soc=get_current_soc(),
        min_capacity=config.min_capacity_percent / 100 * total_capacity,
        target_capacity=config.target_capacity_percent / 100 * total_capacity,
        deadline=end_of_day,
        max_charge_rate=config.home_charge_rate
    )

    # Validate constraints
    assert all(interval.soc >= min_capacity for interval in plan.timeline)

    return plan
```

**V manual režimu:**
```python
# Uživatel specifikuje vlastní target
def manual_planning(user_target_percent, user_deadline):
    config = get_config()

    # min_capacity VŽDY platí (z config)
    min_capacity = config.min_capacity_percent / 100 * total_capacity

    # target je user-specified (může být jiný než config.target_capacity_percent)
    target_capacity = user_target_percent / 100 * total_capacity

    plan = calculate_optimal_plan(
        current_soc=get_current_soc(),
        min_capacity=min_capacity,  # ← Z config (HARD)
        target_capacity=target_capacity,  # ← User (SOFT)
        deadline=user_deadline,
        max_charge_rate=config.home_charge_rate
    )

    return plan
```

**Summary:**
- `min_capacity` = HARD constraint, VŽDY z config, NESMÍ být porušen
- `target_capacity` = SOFT constraint, z config (automatic) nebo user (manual), best effort
- Config changes → invalidate plans → recalculate
- Validation při uložení i runtime

---

### BR-1: Minimální Doba Trvání Režimu ⚡

**Požadavek:** Každý režim musí běžet minimálně **2 intervaly (30 minut)**

**ŽÁDNÁ VÝJIMKA** - platí pro všechny režimy **včetně HOME I**

**Implementace:**
```python
MIN_MODE_DURATION = {
    "Home I": 2,      # 30 minut minimum - ŽÁDNÁ VÝJIMKA
    "Home II": 2,     # 30 minut minimum
    "Home III": 2,    # 30 minut minimum
    "Home UPS": 2,    # 30 minut minimum
}
```

**Zdůvodnění:**
- Stabilita systému (mechanical wear, UX, predictability)
- Pokud přepínáme, ať to má smysl
- 15 minut = max 0.7 kWh → malý benefit
- 30 minut = max 1.4 kWh → rozumný benefit

**Priorita:** P1 (HIGH)

---

### BR-2: Cost/Benefit Optimalizace - KRITICKÝ POŽADAVEK 🔥

**Priorita:** P1 (hned po bug fixes) - **KLÍČOVÉ PRO CELÉ PLÁNOVÁNÍ**

**Požadavek:** Vybrat strategii, která minimalizuje **celkovou cenu za dosažení cíle** (target SoC v target time)

#### 2.1 Definice Celkové Ceny

```python
total_plan_cost = sum([
    interval.grid_import * interval.spot_price      # Nákup ze sítě
    - interval.grid_export * interval.export_price  # Prodej do sítě
    + interval.opportunity_cost                     # Ušlá příležitost
    for interval in timeline
])
```

**Opportunity Cost:**
- Pokud nabíjíme v čase T1 za cenu P1, ale později (T2) je cena P2 < P1
- `opportunity_cost = (P1 - P2) × nabité_kwh`
- Penalizace za suboptimální timing

**Baseline:**
```python
baseline_cost = cost_with_home_i_only  # Bez optimalizace
optimized_cost = total_plan_cost       # S UPS/II/III
savings = baseline_cost - optimized_cost
```

**Threshold:** Optimalizace má smysl když `savings > 5 Kč` za celý plán

#### 2.2 Multi-Scenario Planning

**Algoritmus MUSÍ porovnat různé strategie a vybrat nejlepší:**

```python
scenarios = [
    {
        "name": "aggressive_ups",
        "description": "Nabíjet UPS vždy když price < avg",
        "strategy": aggressive_charging_strategy,
    },
    {
        "name": "solar_priority",
        "description": "Max využití FVE, UPS minimálně",
        "strategy": solar_first_strategy,
    },
    {
        "name": "balanced_hybrid",
        "description": "Hybrid - UPS v nejlevnějších + solar max",
        "strategy": current_hybrid_algorithm,
    },
    {
        "name": "conservative",
        "description": "Minimální UPS, spoléhat na FVE a baterii",
        "strategy": conservative_strategy,
    }
]

# Pro každý scénář:
for scenario in scenarios:
    simulation = simulate_full_timeline(scenario.strategy)

    scenario.metrics = {
        "total_cost": simulation.total_cost,
        "target_achievable": simulation.final_soc >= target_soc,
        "final_soc": simulation.final_soc,
        "mode_switches": simulation.mode_switches,
        "ups_hours": simulation.count_ups_intervals,
        "grid_kwh": simulation.total_grid_import,
    }

# Vybrat nejlepší (dosažitelný + nejlevnější)
best_scenario = min(
    [s for s in scenarios if s.metrics.target_achievable],
    key=lambda s: s.metrics.total_cost
)

# Pokud žádný nedosáhne target → best effort
if not best_scenario:
    best_scenario = max(scenarios, key=lambda s: s.metrics.final_soc)
    log_warning(f"Target {target_soc}% nedosažitelný, best effort: {best_scenario.final_soc}%")
```

#### 2.3 Režimová Optimalizace pro Jednotlivé Intervaly

**Výběr režimu pro interval `i`:**

```python
def select_optimal_mode(
    interval_index: int,
    current_soc: float,
    target_soc: float,
    target_time: datetime,
    solar_kwh: float,
    spot_price: float,
    future_prices: List[float],
    future_solar: List[float]
) -> str:
    """
    Vybrat režim který minimalizuje celkovou cenu PLUS dosáhne target.

    Priority:
    1. Dosažení target (HARD constraint)
    2. Minimalizace celkové ceny (optimization goal)
    3. Stabilita (min mode switches) - soft constraint via BR-1
    """

    # === FVE = 0 (NOC) ===
    if solar_kwh < 0.01:
        # Potřebujeme nabíjet pro dosažení target?
        required_charge = calculate_required_charge_by(target_time)

        if required_charge > 0:
            # Je to levná hodina? (< 90% průměru)
            avg_price = calculate_average_price(future_prices)

            if spot_price < avg_price * 0.9:
                # LEVNÁ HODINA → nabíjet teď
                return "Home UPS"
            else:
                # DRAHÁ HODINA → čekat na levnější
                # Pokud ještě jsou levnější hodiny před target_time
                cheapest_remaining = min(
                    price for price, time in future_prices
                    if time < target_time
                )

                if cheapest_remaining < spot_price:
                    return "Home I"  # Počkat
                else:
                    return "Home UPS"  # Teď nebo nikdy
        else:
            # Target dosažitelný bez nabíjení
            return "Home I"  # Default

    # === FVE > 0 (DEN) ===
    else:
        soc_percent = current_soc / max_capacity

        # Baterie skoro plná (> 85%)
        if soc_percent > 0.85:
            return "Home I"  # Normální režim, přebytek → export

        # Potřebujeme nabít + svítí slunce
        if current_soc < target_soc and solar_kwh > 0.5:
            return "Home III"  # Max využití FVE → baterie

        # Drahá špička později + máme rezervu
        max_future_price = max(future_prices[:12])  # Next 3h

        if max_future_price > spot_price * 1.4 and soc_percent > 0.4:
            return "Home II"  # Šetři baterii na špičku

        # Default
        return "Home I"
```

**Kritérium pro přepnutí (s ohledem na BR-1):**

```python
def should_switch_mode(
    current_mode: str,
    proposed_mode: str,
    time_in_current_mode: int,  # Počet intervalů
    benefit_delta: float  # Rozdíl v celkové ceně
) -> bool:
    """
    Rozhodnout zda přepnout režim.

    BR-1: Každý režim min 2 intervaly
    Ale pokud benefit je HODNĚ velký, můžeme přepnout dřív
    """

    # BR-1 enforcement
    if time_in_current_mode < MIN_MODE_DURATION[current_mode]:
        # Jsme v režimu kratší dobu než minimum

        # Exception: KRITICKÝ benefit (> 10 Kč za plán)
        if benefit_delta > 10.0:
            log_info(f"Override BR-1: benefit {benefit_delta:.2f} Kč > 10 Kč")
            return True
        else:
            return False  # Zůstat v current_mode

    # Běžné přepnutí (po splnění minimum duration)
    SWITCH_THRESHOLD = 2.0  # Kč za celý plán

    if benefit_delta > SWITCH_THRESHOLD:
        return True
    else:
        return False  # Stabilita
```

---

### BR-3: Simulace, Aplikace a Revert Plánu 🔄

**Priorita:** P2 (důležité pro UX)

#### 3.1 Typy Plánů

**Systém má 3 typy plánů:**

| Typ | Spouštěč | Auto-apply | Requester | Použití |
|-----|----------|-----------|-----------|---------|
| **AUTOMATIC** | Každých 15 min | ✅ Ano | `automatic` | Default denní plánování |
| **MANUAL** | Uživatel | ❌ Ne (explicitní apply) | `manual` | Specifický cíl (např. ranní nabití) |
| **SIMULATION** | Uživatel | ❌ Nikdy | `simulation` | What-if analýza, testování |

#### 3.2 Automatic Plán

**Chování:**
```python
# Každých 15 minut (při update sensoru)
if plan_type == "automatic":
    target_soc = config.target_capacity_percent  # Např. 80%
    deadline = end_of_day  # 23:59

    plan = calculate_optimal_plan(
        current_soc=battery_soc,
        target_soc=target_soc,
        deadline=deadline,
        requester="automatic"
    )

    # Automaticky aplikovat
    apply_plan(plan)
```

**Lifecycle:**
- `PLANNED` → `LOCKED` (5 min před začátkem)
- `LOCKED` → `RUNNING` (při dosažení času)
- `RUNNING` → `COMPLETED` (po dokončení)

#### 3.3 Manual Plán - Workflow

**Scénář:** Uživatel chce mít baterii nabitou na 90% do 06:00 a držet 2 hodiny

**Krok 1: Vytvoření plánu**

```python
# API call (nebo dashboard button)
manual_plan = await sensor.plan_charging_to_target(
    target_soc_percent=90,
    deadline="2025-11-03T06:00:00",
    holding_duration_hours=2,
    mode="economic",  # nebo "fast", "solar_priority"
    requester="manual"
)

# Response - plán JE vytvořen, ale NENÍ aplikován
{
    "plan_id": "plan_abc123",
    "status": "pending",  # Čeká na apply
    "created_at": "2025-11-02T20:00:00",
    "target_soc": 90,
    "deadline": "2025-11-03T06:00:00",
    "holding_until": "2025-11-03T08:00:00",
    "predicted_result": {
        "achievable": true,
        "final_soc": 91.2,
        "total_cost": 42.5,
        "savings_vs_baseline": 8.3,
        "mode_switches": 5
    },
    "timeline": [...]  # Detailní timeline
}
```

**Krok 2: Review v dashboardu**

Uživatel vidí:
- 📊 Graf: Plánovaný SoC vs čas
- 🎨 Timeline: Barevné bloky režimů
- 💰 Cost: 42.5 Kč (vs baseline 50.8 Kč, úspora 8.3 Kč)
- 🔄 Switches: 5 přepnutí
- ⚡ UPS bloky: 04:00-05:30 (1.5h @ avg 1.8 Kč/kWh)

**Krok 3: Aplikace**

```python
# Explicitní apply
result = await sensor.apply_plan("plan_abc123")

# Co se stane:
# 1. Automatic plán → PAUSED
# 2. Manual plán → ACTIVE
# 3. Tracking začíná (actual vs planned)

# Response
{
    "plan_id": "plan_abc123",
    "status": "active",
    "applied_at": "2025-11-02T20:05:00",
    "overrides": "automatic",
    "next_mode_switch": "2025-11-02T22:00:00"
}
```

#### 3.4 Simulation - What-If Analýza

**Scénář:** Uživatel chce porovnat různé strategie

**Vytvoření simulací:**

```python
# Simulace A: Economic (nejlevnější)
sim_a = await sensor.simulate_charging_plan(
    target_soc_percent=90,
    deadline="2025-11-03T06:00:00",
    mode="economic",
    scenario_name="Ekonomický - UPS v nejlevnějších hodinách"
)

# Simulace B: Fast (rychlé nabití)
sim_b = await sensor.simulate_charging_plan(
    target_soc_percent=90,
    deadline="2025-11-03T06:00:00",
    mode="fast",
    scenario_name="Rychlé - UPS hned teď"
)

# Simulace C: Solar priority (max využití FVE)
sim_c = await sensor.simulate_charging_plan(
    target_soc_percent=90,
    deadline="2025-11-03T06:00:00",
    mode="solar_priority",
    scenario_name="Solar first - minimální UPS"
)
```

**Porovnání výsledků:**

| Simulace | Cost | Target | Switches | UPS hours | Solar utilized |
|----------|------|--------|----------|-----------|----------------|
| A (economic) | 42.5 Kč | ✅ 91% | 5 | 2.5h | 85% |
| B (fast) | 55.2 Kč | ✅ 92% | 3 | 4.0h | 70% |
| C (solar) | 48.0 Kč | ⚠️ 88% | 6 | 1.0h | 95% |

**Aplikace simulace:**

```python
# Uživatel vybere simulaci A
result = await sensor.apply_simulation("sim_abc123")

# Simulace se převede na MANUAL plán a aplikuje
```

**KRITICKÉ:** Simulace **NIKDY** není auto-applied, vždy vyžaduje explicitní apply!

#### 3.5 Revert Plánu

**Scénáře:**

##### 1. Manuální Revert
```python
# Uživatel nechce manual plán pokračovat
await sensor.revert_to_automatic()

# Co se stane:
# - ACTIVE manual plan → status CANCELLED
# - Automatic plán → RESUMED
# - Nový automatic plán se vypočítá s aktuálním SoC
```

##### 2. Automatický Revert po Completion
```python
# Manual plán dosáhl deadline + holding_duration
if now > plan.deadline + plan.holding_duration:
    log_info("Manual plan completed, reverting to automatic")
    cancel_plan(manual_plan_id)
    resume_automatic_planning()
```

##### 3. Revert při Failure
```python
# Plán nelze dodržet (critical deviation)
CRITICAL_DEVIATION = 10  # kWh

if abs(actual_soc - planned_soc) > CRITICAL_DEVIATION:
    log_error(f"Plan failed: actual={actual_soc}, planned={planned_soc}")
    cancel_plan(manual_plan_id)
    resume_automatic_planning()

    # Notifikace uživateli
    notify_user("Plán selhal - návrat k automatickému režimu")
```

##### 4. Explicitní Cancel
```python
# Uživatel zruší plán (před nebo během běhu)
await sensor.cancel_plan("plan_abc123")

# Co se stane:
# - Plan → CANCELLED (v historii zůstává pro analýzu)
# - Pokud byl ACTIVE → revert to automatic
```

#### 3.6 Plánování za Target Time

**Problém:** Target je 06:00, ale plánujeme timeline až do 23:59 (konec dne)

**Řešení: Timeline se dělí na 3 části**

```python
def plan_with_target_and_beyond(
    target_soc: float,
    target_time: datetime,
    holding_duration_hours: float,
    end_of_day: datetime
):
    """
    Vytvoří timeline ve 3 částech:
    1. Pre-target: Dosáhnout target_soc do target_time
    2. Holding: Udržet target_soc po dobu holding_duration
    3. Post-holding: Normální provoz (default target)
    """

    holding_end = target_time + timedelta(hours=holding_duration_hours)

    # ČÁST 1: Pre-target (teď → target_time)
    pre_target_timeline = calculate_optimal_modes_hybrid(
        current_soc=current_soc,
        target_soc=target_soc,
        deadline=target_time,
        goal="reach_target"
    )

    # ČÁST 2: Holding (target_time → holding_end)
    holding_timeline = calculate_holding_modes(
        maintain_soc=target_soc,
        start=target_time,
        end=holding_end,
        tolerance=2  # ±2% SoC
    )

    # ČÁST 3: Post-holding (holding_end → EOD)
    # Vrátit se k default target (např. 80% EOD)
    default_target = config.target_capacity_percent

    post_holding_timeline = calculate_optimal_modes_hybrid(
        current_soc=target_soc,  # Předpoklad: držíme target
        target_soc=default_target,
        deadline=end_of_day,
        goal="normal_operation"
    )

    # Merge všech částí
    full_timeline = (
        pre_target_timeline
        + holding_timeline
        + post_holding_timeline
    )

    return full_timeline
```

**Příklad:**

```
Nyní:     20:00 (SoC 45%)
Target:   06:00 (SoC 90%)
Holding:  2 hodiny (do 08:00)
EOD:      23:59

Timeline:
─────────────────────────────────────────────────────────
20:00-22:00  HOME I       (čekat na levnou elektřinu)
22:00-04:00  HOME I       (baterie → load)
04:00-06:00  HOME UPS     (nabíjet na 90% @ levné ceny)
─────────────────────────────────────────────────────────
06:00-08:00  HOME II      (držet 90%, šetřit baterii)
─────────────────────────────────────────────────────────
08:00-16:00  HOME III     (využít FVE max)
16:00-18:00  HOME II      (šetřit na večer)
18:00-20:00  HOME I       (špička - baterie dodává)
20:00-23:59  HOME I       (nabít na default 80% EOD)
─────────────────────────────────────────────────────────
```

**Režimová logika pro holding period:**

```python
def calculate_holding_modes(maintain_soc, start, end, tolerance):
    """
    Držet SoC v rozmezí [maintain_soc - tolerance, maintain_soc + tolerance]

    Strategie:
    - HOME II priorita (šetří baterii)
    - HOME III když svítí slunce (nabíjí ze solaru)
    - HOME I jako fallback
    - NIKDY HOME UPS (neplatí za holding ze sítě)
    """

    timeline = []

    for interval in range(start, end):
        solar = get_solar_forecast(interval)
        price = get_spot_price(interval)
        predicted_soc = estimate_soc(interval)

        # SoC klesá pod minimum holding?
        if predicted_soc < maintain_soc - tolerance:
            if solar > 0.5:
                mode = "Home III"  # Nabít ze solaru
            else:
                mode = "Home I"  # Minimize drain

        # SoC roste nad maximum holding?
        elif predicted_soc > maintain_soc + tolerance:
            mode = "Home I"  # Export surplus

        # V toleranci - šetřit
        else:
            if solar > 0.5:
                mode = "Home II"  # FVE → load, baterie netouched
            else:
                mode = "Home II"  # Grid → load, baterie netouched

        timeline.append({"time": interval, "mode": mode})

    return timeline
```

---

## 🎯 Prioritizace Business Požadavků

| BR | Název | Priorita | Důvod | Odhad času |
|----|-------|----------|-------|------------|
| **BR-1** | Min duration | **P1** | Stabilita systému | 3h |
| **BR-2** | Cost/Benefit | **P1** | KLÍČOVÉ - celá ekonomika plánu | 8-10h |
| **BR-3** | Simulace & Plány | **P2** | UX, testování | 6-8h |

**Celkem P1:** 11-13 hodin
**Celkem P1+P2:** 17-21 hodin

---

## ✅ Success Kritéria

Po implementaci očekáváme:

### 1. Stabilní Provoz
- ✅ Každý režim běží min 2 intervaly (30 min) - BR-1
- ✅ Max 6-10 přepnutí za den (důsledek BR-1)

### 2. Ekonomická Optimalizace
- ✅ Multi-scenario comparison funguje - BR-2
- ✅ Vybraný plán má nejnižší `total_cost` - BR-2
- ✅ Opportunity cost zahrnutý v ceně - BR-2
- ✅ Threshold 5 Kč pro meaningful optimization - BR-2

### 3. Simulace & UX
- ✅ Uživatel může vytvořit simulace bez aplikace - BR-3
- ✅ Porovnání simulací v dashboardu - BR-3
- ✅ Manual plán vyžaduje explicitní apply - BR-3
- ✅ Revert funguje (manual → automatic) - BR-3

### 4. Plánování za Target
- ✅ Timeline správně dělená na pre/holding/post - BR-3
- ✅ Holding period respektuje tolerance - BR-3
- ✅ Post-holding návrat k default target - BR-3

### 5. Robustnost
- ✅ Graceful degradation pokud target nedosažitelný
- ✅ Failure detection a auto-revert
- ✅ Validace vstupů (target, deadline, holding)

---

## 🔄 Co se MĚNÍ oproti původním požadavkům

### ❌ ODSTRANIT:
- **BR-2 (Gap Merging)** - zbytečné pokud máme BR-1 (min 2 intervaly)
- **BR-3 (Max switches/den)** - důsledek BR-1, není třeba samostatný požadavek

### ⬆️ POVÝŠIT:
- **BR-4 → BR-2** - Cost/Benefit je KRITICKÝ, priorita P1
- **BR-5 → BR-3** - Simulace a workflow do P2

### ➕ ROZŠÍŘIT:
- **BR-2:** Multi-scenario planning + opportunity cost
- **BR-3:** Komplexní workflow (automatic/manual/simulation)
- **BR-3:** Plánování za target time (3-part timeline)
- **BR-3:** Revert mechanismy

---

## 📝 Poznámky k Implementaci

### BR-1: Minimum Duration
- Jednoduchá implementace, už částečně existuje (PHASE 8)
- Rozšířit na všechny režimy včetně HOME I
- Testování s real data

### BR-2: Cost/Benefit Optimalizace
- **NEJKOMPLEXNĚJŠÍ** - vyžaduje:
  - Multi-scenario framework
  - Opportunity cost calculation
  - Benefit comparison logic
  - Integration do `_calculate_optimal_modes_hybrid()`
- Klíčové pro celou ekonomiku systému
- Musí být hotové před BR-3

### BR-3: Simulace & Workflow
- Vyžaduje dokončené BR-2 (simulace používají cost calculation)
- API rozšíření (plan_charging_to_target, apply_plan, revert)
- Dashboard integration
- State management (AUTOMATIC/MANUAL/SIMULATION)

---

**Potřebujeme ještě něco upřesnit nebo doplnit?**
