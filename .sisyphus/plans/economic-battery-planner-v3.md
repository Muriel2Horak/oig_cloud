# Ekonomický Plánovač Baterie - Dynamický Algoritmus v3

## TL;DR
> **Všechny parametry dynamické** - žádné hardcoded hodnoty:
> - HW minimum: ze senzoru `batt_bat_min`
> - Max capacity: ze senzoru `batt_bat_c`  
> - Planning minimum: z config flow (>= HW min)
> - Nabíjecí výkon: z config flow (default 2.8 kW)
> - Všechny ceny a prognózy: ze senzorů
>
> **Primární cíl**: Minimalizovat náklady na elektřinu
> **Sekundární cíl**: Nikdy nespadnout pod HW minimum

---

## Architektura: Čistě Dynamická

### Vstupní Parametry (Žádné Konstanty)

```python
@dataclass
class PlannerInputs:
    """Všechny vstupy se načítají dynamicky. Žádné hardcoded hodnoty!"""
    
    # Ze senzorů (každý box má jiné)
    current_soc_kwh: float          # z sensor.battery_level
    max_capacity_kwh: float         # z sensor.batt_bat_c
    hw_min_kwh: float               # z sensor.batt_bat_min
    
    # Z config flow (uživatelské nastavení)
    planning_min_percent: float      # default = HW%, >= HW%
    charge_rate_kw: float          # default 2.8 kW, konfigurovatelné
    
    # Vypočtené hodnoty (validace při inicializaci)
    planning_min_kwh: float         # planning_min_percent * max_capacity
    
    # Prognózy (ze senzorů)
    intervals: List[IntervalData]   # 96 intervalů po 15 minutách
    prices: List[float]             # ceny pro každý interval
    solar_forecast: List[float]     # FVE prognóza
    load_forecast: List[float]      # Spotřeba prognóza
    
    def __post_init__(self):
        """Validace: planning_min nesmí být < HW minimum"""
        if self.planning_min_kwh < self.hw_min_kwh:
            raise ValueError(
                f"Planning minimum ({self.planning_min_kwh:.2f} kWh) "
                f"nesmí být nižší než HW minimum ({self.hw_min_kwh:.2f} kWh)"
            )
        
        if self.charge_rate_kw <= 0:
            raise ValueError("Nabíjecí výkon musí být > 0")
```

### Konstanty (Pouze Fyzické Konstanty CBB)

```python
# Tyto hodnoty jsou fyzické vlastnosti inverteru, neměnné
PHYSICAL_CONSTANTS = {
    "interval_minutes": 15,
    "intervals_per_hour": 4,
    "charge_efficiency": 0.95,      # DC-DC nabíjení
    "discharge_efficiency": 0.882,  # DC-AC vybíjení
    "home_ups_efficiency": 0.95,    # AC-DC nabíjení ze sítě
}
```

---

## Algoritmus: 4-Fázový Ekonomický

### FÁZE 0: Načtení a Validace Dat

```python
def load_planner_inputs(coordinator, config_entry) -> PlannerInputs:
    """
    Načte všechny vstupy dynamicky ze senzorů a konfigurace.
    """
    # Ze senzorů (každý běh aktuální hodnoty)
    current_soc = coordinator.data["battery_soc_kwh"]  # Např. 6.96
    max_capacity = coordinator.data["batt_bat_c"]     # Např. 10.24
    hw_min = coordinator.data["batt_bat_min"]         # Např. 2.05 (20%)
    
    # Z config flow (uživatelské nastavení)
    planning_min_pct = config_entry.options.get(
        "planning_min_percent", 
        (hw_min / max_capacity) * 100  # Default = HW%
    )
    charge_rate = config_entry.options.get("charge_rate_kw", 2.8)
    
    # Výpočet planning_min kWh
    planning_min_kwh = max_capacity * (planning_min_pct / 100)
    
    # Z prognóz
    intervals = build_intervals_from_forecast(coordinator)
    prices = get_spot_prices(coordinator)
    solar = get_solar_forecast(coordinator)
    load = get_load_forecast(coordinator)
    
    return PlannerInputs(
        current_soc_kwh=current_soc,
        max_capacity_kwh=max_capacity,
        hw_min_kwh=hw_min,
        planning_min_percent=planning_min_pct,
        charge_rate_kw=charge_rate,
        planning_min_kwh=planning_min_kwh,
        intervals=intervals,
        prices=prices,
        solar_forecast=solar,
        load_forecast=load
    )
```

### FÁZE 1: Prediktivní Simulace HOME I

```python
def simulate_home_i_detailed(inputs: PlannerInputs) -> List[SimulatedState]:
    """
    Simuluje každý 15min interval v režimu HOME I.
    HOME I: FVE → spotřeba, deficit z baterie (pokud > HW min), zbytek ze sítě
    """
    states = []
    soc = inputs.current_soc_kwh
    
    for i in range(len(inputs.intervals)):
        solar = inputs.solar_forecast[i]
        load = inputs.load_forecast[i]
        price = inputs.prices[i]
        
        # FYZIKA HOME I:
        if solar >= load:
            # Přebytek FVE jde do baterie
            surplus = solar - load
            space = inputs.max_capacity_kwh - soc
            charge = min(surplus, space)
            soc += charge * PHYSICAL_CONSTANTS["charge_efficiency"]
            grid_import = 0
            battery_discharge = 0
        else:
            # Deficit - nejdřív z baterie (pokud můžeme)
            deficit = load - solar
            
            # Kolik můžeme vzít z baterie?
            # Pouze nad HW minimum (to je rezerva)
            available_above_hw = max(0, soc - inputs.hw_min_kwh)
            usable = available_above_hw * PHYSICAL_CONSTANTS["discharge_efficiency"]
            
            discharge = min(deficit, usable)
            
            if discharge > 0:
                # Vzali jsme z baterie
                soc -= discharge / PHYSICAL_CONSTANTS["discharge_efficiency"]
                grid_import = deficit - discharge
                battery_discharge = discharge
            else:
                # Baterie prázdná (na HW min), bereme ze sítě
                grid_import = deficit
                battery_discharge = 0
        
        # Náklady tohoto intervalu
        cost = grid_import * price
        
        states.append(SimulatedState(
            interval=i,
            time=inputs.intervals[i].time,
            soc=soc,
            grid_import=grid_import,
            cost=cost,
            mode="HOME_I",
            solar=solar,
            load=load
        ))
    
    return states
```

### FÁZE 2: Detekce Kritických Momentů

```python
def find_critical_moments(
    states: List[SimulatedState], 
    inputs: PlannerInputs
) -> List[CriticalMoment]:
    """
    Najde okamžiky kde SOC klesne pod kritické hranice.
    
    Dva typy kritických momentů:
    1. PLANNING_MIN: SOC < planning_min → měli bychom jednat
    2. EMERGENCY: SOC < hw_min → musíme jednat okamžitě
    """
    moments = []
    
    for i, state in enumerate(states):
        # Typ 1: Pod plánovací minimum
        if state.soc < inputs.planning_min_kwh:
            deficit = inputs.planning_min_kwh - state.soc
            
            # Kolik intervalů nabíjení potřebujeme?
            charge_per_interval = inputs.charge_rate_kw * 0.25  # kWh/15min
            intervals_needed = ceil(deficit / charge_per_interval)
            
            # Kdy musíme začít nabíjet?
            must_start = max(0, i - intervals_needed)
            
            moments.append(CriticalMoment(
                type="PLANNING_MIN",
                interval=i,
                time=state.time,
                current_soc=state.soc,
                target_soc=inputs.planning_min_kwh,
                deficit_kwh=deficit,
                intervals_needed=intervals_needed,
                must_start_charging=must_start,
                price_at_moment=inputs.prices[i]
            ))
        
        # Typ 2: Pod HW minimum (kritické!)
        if state.soc < inputs.hw_min_kwh:
            moments.append(CriticalMoment(
                type="EMERGENCY",
                interval=i,
                time=state.time,
                current_soc=state.soc,
                target_soc=inputs.hw_min_kwh,
                deficit_kwh=inputs.hw_min_kwh - state.soc,
                intervals_needed=0,  # Ihned!
                must_start_charging=i,  # Už je pozdě!
                price_at_moment=inputs.prices[i],
                is_emergency=True
            ))
    
    return moments
```

### FÁZE 3: Ekonomické Rozhodnutí

```python
def make_economic_decisions(
    moments: List[CriticalMoment],
    inputs: PlannerInputs
) -> List[Decision]:
    """
    Pro každý kritický okamžik vyber nejlevnější variantu.
    
    Varianty:
    A. Použij baterii až na HW min, pak ber ze sítě (neplánuj nabíjení)
    B. Nabij v nejlevnějších intervalech PŘED kritickým okamžikem
    C. Počkej na FVE (pokud brzy začne)
    """
    decisions = []
    
    for moment in moments:
        if moment.type == "EMERGENCY":
            # Nouzový režim - musíme nabít hned
            decision = Decision(
                moment=moment,
                strategy="EMERGENCY_CHARGE",
                reason=f"Kritické: SOC by kleslo na {moment.current_soc:.2f} kWh",
                cost=float('inf'),  # V nouzi neřešíme cenu
                charge_intervals=[moment.interval - 1] if moment.interval > 0 else [0]
            )
            decisions.append(decision)
            continue
        
        # Není nouze - můžeme optimalizovat
        deficit = moment.deficit_kwh
        start_idx = moment.must_start_charging
        end_idx = moment.interval
        
        # Varianta A: Použij baterii až na HW min
        cost_a = calculate_cost_use_battery(moment, inputs)
        
        # Varianta B: Nabij v nejlevnějších intervalech
        cost_b = calculate_cost_charge_cheapest(
            start_idx, end_idx, deficit, inputs
        )
        
        # Varianta C: Počkej na FVE
        cost_c = calculate_cost_wait_for_solar(moment, inputs)
        
        # Vyber nejlevnější
        costs = [
            ("USE_BATTERY", cost_a),
            ("CHARGE_CHEAPEST", cost_b),
            ("WAIT_FOR_SOLAR", cost_c)
        ]
        best_strategy, best_cost = min(costs, key=lambda x: x[1])
        
        # Naplánuj nabíjení podle nejlepší strategie
        if best_strategy == "CHARGE_CHEAPEST":
            charge_intervals = find_cheapest_intervals(
                start_idx, end_idx, moment.intervals_needed, inputs
            )
        else:
            charge_intervals = []
        
        decisions.append(Decision(
            moment=moment,
            strategy=best_strategy,
            reason=f" Nejlevnější varianta: {best_cost:.2f} Kč",
            cost=best_cost,
            charge_intervals=charge_intervals
        ))
    
    return decisions


def calculate_cost_use_battery(moment: CriticalMoment, inputs: PlannerInputs) -> float:
    """
    Spočítá náklady pokud necháme baterii klesnout.
    """
    # Simuluj od nyní do konce dne bez nabíjení
    cost = 0
    soc = moment.current_soc
    
    for i in range(moment.interval, len(inputs.intervals)):
        solar = inputs.solar_forecast[i]
        load = inputs.load_forecast[i]
        price = inputs.prices[i]
        
        # HOME I simulace
        if solar < load:
            deficit = load - solar
            available = max(0, soc - inputs.hw_min_kwh)
            usable = available * PHYSICAL_CONSTANTS["discharge_efficiency"]
            discharge = min(deficit, usable)
            
            if discharge > 0:
                soc -= discharge / PHYSICAL_CONSTANTS["discharge_efficiency"]
                grid_import = deficit - discharge
            else:
                grid_import = deficit
            
            cost += grid_import * price
    
    return cost


def calculate_cost_charge_cheapest(
    start_idx: int, 
    end_idx: int, 
    deficit: float,
    inputs: PlannerInputs
) -> float:
    """
    Spočítá náklady nabíjení v nejlevnějších intervalech.
    """
    # Najdi nejlevnější intervaly
    candidates = [
        (i, inputs.prices[i]) 
        for i in range(start_idx, end_idx)
    ]
    candidates.sort(key=lambda x: x[1])
    
    # Naplánuj nabíjení (s ohledem na rychlost)
    charge_per_interval = inputs.charge_rate_kw * 0.25
    cost = 0
    needed = deficit
    
    for i, price in candidates:
        if needed <= 0:
            break
        charge = min(charge_per_interval, needed)
        # Náklady + ztráty (zaplatíme za víc, než dostaneme)
        effective_charge = charge * PHYSICAL_CONSTANTS["home_ups_efficiency"]
        cost += charge * price
        needed -= effective_charge
    
    # Pokud nestíháme nabít vše
    if needed > 0:
        cost += needed * 100  # Penalizace - nestíháme!
    
    return cost


def calculate_cost_wait_for_solar(moment: CriticalMoment, inputs: PlannerInputs) -> float:
    """
    Spočítá náklady čekání na FVE.
    
    Pokud FVE brzy začne a pokryje spotřebu → levné
    Pokud FVE nepřijde včas → drahé (musíme brát ze sítě)
    """
    # Najdi kdy začne FVE pokrývat spotřebu
    solar_start = None
    for i in range(moment.interval, len(inputs.intervals)):
        if inputs.solar_forecast[i] > inputs.load_forecast[i]:
            solar_start = i
            break
    
    if solar_start is None:
        # FVE nepřijde - drahé
        return float('inf')
    
    # Kolik intervalů čekáme?
    wait_intervals = solar_start - moment.interval
    
    # Náklady mezitím (musíme brát ze sítě nebo baterii)
    cost = 0
    for i in range(moment.interval, solar_start):
        solar = inputs.solar_forecast[i]
        load = inputs.load_forecast[i]
        price = inputs.prices[i]
        
        if solar < load:
            cost += (load - solar) * price
    
    return cost
```

### FÁZE 4: Generování Plánu

```python
def generate_plan(
    decisions: List[Decision], 
    inputs: PlannerInputs
) -> PlannerResult:
    """
    Sestaví finální plán režimů.
    """
    modes = [0] * len(inputs.intervals)  # Default HOME_I
    
    # Naplánuj nabíjení podle rozhodnutí
    for decision in decisions:
        if decision.strategy == "CHARGE_CHEAPEST":
            for idx in decision.charge_intervals:
                modes[idx] = 3  # HOME_UPS
        elif decision.strategy == "EMERGENCY_CHARGE":
            for idx in decision.charge_intervals:
                modes[idx] = 3  # HOME_UPS
    
    # FVE priority: kde FVE > 0 a není UPS, použij HOME_III
    for i in range(len(modes)):
        if modes[i] == 0 and inputs.solar_forecast[i] > 0:
            modes[i] = 2  # HOME_III
    
    # Simuluj finální plán
    final_states = simulate_with_modes(modes, inputs)
    
    # Ověř bezpečnost
    for state in final_states:
        if state.soc < inputs.hw_min_kwh * 0.95:  # 5% tolerance
            raise ValueError(
                f"BEZPEČNOSTNÍ CHYBA: SOC klesl na {state.soc:.2f} kWh "
                f"(HW min: {inputs.hw_min_kwh:.2f} kWh)"
            )
    
    total_cost = sum(s.cost for s in final_states)
    
    return PlannerResult(
        modes=modes,
        states=final_states,
        total_cost=total_cost,
        decisions=decisions
    )
```

---

## Work Objectives

### Core Objective
Vytvořit plně dynamický ekonomický plánovač který:
1. Načítá všechny parametry za běhu (senzory + config)
2. Validuje planning_min >= HW_min
3. Simuluje detailně každý 15min interval
4. Rozhoduje ekonomicky mezi 3 variantami
5. Nikdy nespadne pod HW minimum

### Concrete Deliverables
1. `economic_planner.py` - hlavní algoritmus
2. `economic_planner_types.py` - dynamické typy
3. `test_economic_planner.py` - testy s různými konfiguracemi
4. Integrace s existujícími senzory

### Must Have
- [ ] Dynamické načítání ze senzorů (batt_bat_min, batt_bat_c)
- [ ] Konfigurovatelné parametry (charge_rate, planning_min)
- [ ] Validace planning_min >= HW_min
- [ ] Prediktivní simulace HOME_I
- [ ] Detekce kritických momentů
- [ ] Ekonomické rozhodování (3 varianty)
- [ ] Respektování nabíjecí rychlosti
- [ ] Ověření bezpečnosti (SOC >= HW_min)

### Must NOT Have
- [ ] Žádné hardcoded hodnoty
- [ ] Žádné předpoklady o kapacitě
- [ ] Žádné předpoklady o rychlosti nabíjení
- [ ] Žádné předpoklady o HW minimu

---

## TODOs (Detailní)

### Wave 1: Datové Struktury a Načítání

- [ ] **Task 1: Vytvořit PlannerInputs dataclass**
  - Všechny parametry z dokumentace
  - __post_init__ validace
  - Bez hardcoded hodnot

- [ ] **Task 2: Implementovat load_planner_inputs()**
  - Načítání ze senzorů coordinator
  - Načítání z config entry
  - Výpočet odvozených hodnot
  - Error handling

- [ ] **Task 3: Task 4: Unit testy načítání**
  - Mock data pro různé boxy
  - Test validace
  - Test error handling

### Wave 2: Simulace a Detekce

- [ ] **Task 4: Implementovat simulate_home_i_detailed()**
  - Každý 15min interval
  - Fyzika HOME_I
  - Vrací SimulatedState

- [ ] **Task 5: Implementovat find_critical_moments()**
  - Detekce pod planning_min
  - Detekce pod HW_min (emergency)
  - Výpočet potřebných intervalů nabíjení

- [ ] **Task 6: Unit testy simulace**
  - TUV ohřev scénář
  - Různé SOC hranice
  - Edge cases

### Wave 3: Ekonomické Rozhodování

- [ ] **Task 7: Implementovat calculate_cost_use_battery()**
  - Simulace bez nabíjení
  - Náklady na odběr ze sítě

- [ ] **Task 8: Implementovat calculate_cost_charge_cheapest()**
  - Nalezení nejlevnějších intervalů
  - Respektování nabíjecí rychlosti
  - Včetně ztrát

- [ ] **Task 9: Implementovat calculate_cost_wait_for_solar()**
  - Detekce začátku FVE
  - Náklady čekání

- [ ] **Task 10: Implementovat make_economic_decisions()**
  - Porovnání 3 variant
  - Výběr nejlevší
  - Emergency handling

### Wave 4: Generování a Validace

- [ ] **Task 11: Implementovat generate_plan()**
  - Sestavení režimů
  - Simulace finálního plánu
  - Ověření bezpečnosti

- [ ] **Task 12: Integrace s coordinator**
  - Volání z battery_forecast
  - Caching výsledků
  - Update na změnu dat

- [ ] **Task 13: Testy s reálnými daty**
  - Váš TUV příklad
  - Různé konfigurace
  - Srovnání nákladů

### Wave 5: Config Flow

- [ ] **Task 14: Přidat config options**
  - planning_min_percent (slider)
  - charge_rate_kw (number input)
  - Validace >= HW%

- [ ] **Task 15: Migrace existujících configů**
  - Defaultní hodnoty
  - Zachování zpětné kompatibility

---

## Příklad Použití

```python
async def async_update_data(self):
    """Voláno každých 15 minut."""
    
    # 1. Načti dynamické vstupy
    inputs = load_planner_inputs(self, self.config_entry)
    
    # 2. Simuluj baseline
    baseline = simulate_home_i_detailed(inputs)
    
    # 3. Najdi kritické momenty
    moments = find_critical_moments(baseline, inputs)
    
    if not moments:
        # Žádné problémy, použij HOME_I/III
        return generate_simple_plan(inputs)
    
    # 4. Ekonomické rozhodnutí
    decisions = make_economic_decisions(moments, inputs)
    
    # 5. Generuj plán
    result = generate_plan(decisions, inputs)
    
    # 6. Aplikuj
    await self.apply_plan(result.modes)
    
    # 7. Loguj pro debug
    for d in result.decisions:
        _LOGGER.info(
            f"Rozhodnutí: {d.strategy} v {d.moment.time} "
            f"(důvod: {d.reason}, náklady: {d.cost:.2f} Kč)"
        )
```

---

## Success Criteria

### Funkční
1. Bez hardcoded hodnot - vše dynamické ✓
2. Planning_min >= HW_min validace ✓
3. Nikdy pod HW_min ✓
4. Ekonomické rozhodování funguje ✓

### Testovací
1. Testy s různými boxy (různé batt_bat_min) ✓
2. Testy TUV ohřevu ✓
3. Testy edge cases ✓

### Výkonnostní
- Čas výpočtu: < 500ms pro 96 intervalů ✓

Souhlasíte s tímto dynamickým přístupem? Chcete něco upravit nebo přidat?
