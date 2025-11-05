# Refactoring: Zjednodušení Daily Plan Storage

## Současný stav (CHAOS)
- `planned_timeline` - jen zbytek dnešního dne (12-96 intervalů)
- `planned_forecast` - celý forecast včetně zítřka (100+ intervalů)
- `actual_intervals` - komplexní nested struktura s planned/actual/delta

**Problém:** Redundance, zmatek, těžká analýza

## Cílový stav (JEDNODUCHÉ)

### Struktura JSON souboru `{YYYY-MM-DD}.json`

```json
{
  "date": "2025-11-05",
  "created_at": "2025-11-05T00:00:15+01:00",
  "plan": [
    {
      "time": "2025-11-05T00:00:00",
      "solar_kwh": 0.0,
      "consumption_kwh": 0.085,
      "battery_soc": 95.2,
      "battery_capacity_kwh": 9.52,
      "grid_import_kwh": 0.0,
      "grid_export_kwh": 0.0,
      "mode": 0,
      "mode_name": "HOME I",
      "spot_price": 3.45,
      "net_cost": 0.0
    },
    // ... 95 dalších intervalů (celý den po 15 min)
  ],
  "actual": [
    {
      "time": "2025-11-05T00:00:00",
      "solar_kwh": 0.0,
      "consumption_kwh": 0.082,
      "battery_soc": 95.1,
      "battery_capacity_kwh": 9.51,
      "grid_import_kwh": 0.0,
      "grid_export_kwh": 0.0,
      "mode": 0,
      "mode_name": "HOME I"
    },
    // ... přibývají každých 15 minut
  ]
}
```

## Implementace

### 1. Fixace plánu (00:00)
```python
async def _maybe_fix_daily_plan(self):
    # Získat optimal_timeline (100+ intervalů)
    optimal_timeline = self._optimization_result.get("timeline", [])

    # Vyfiltrovat JEN dnešní den (96 intervalů)
    today_str = now.strftime("%Y-%m-%d")
    today_plan = [
        {
            "time": interval["timestamp"],
            "solar_kwh": interval.get("solar_kwh", 0),
            "consumption_kwh": interval.get("load_kwh", 0),
            "battery_soc": interval.get("battery_soc", 0),
            "battery_capacity_kwh": interval.get("battery_capacity_kwh", 0),
            "grid_import_kwh": interval.get("grid_import", 0),
            "grid_export_kwh": interval.get("grid_export", 0),
            "mode": interval.get("mode", 0),
            "mode_name": interval.get("mode_name", "N/A"),
            "spot_price": interval.get("spot_price", 0),
            "net_cost": interval.get("net_cost", 0),
        }
        for interval in optimal_timeline
        if interval.get("timestamp", "").startswith(today_str)
    ]

    # Uložit do simple struktury
    plan_data = {
        "date": today_str,
        "created_at": now.isoformat(),
        "plan": today_plan,  # 96 intervalů
        "actual": []  # bude se plnit postupně
    }

    await self._save_daily_plan_to_storage(today_str, plan_data)
```

### 2. Update actual dat (každých 15 min)
```python
async def _update_actual_from_history(self):
    today_str = now.strftime("%Y-%m-%d")

    # Načíst existing plan
    plan_data = await self._load_daily_plan_from_storage(today_str)
    if not plan_data:
        return

    # Načíst historical data od začátku dne do teď
    actual_intervals = []
    current = now.replace(hour=0, minute=0, second=0, microsecond=0)

    while current <= now:
        interval_data = await self._fetch_interval_from_history(current)
        if interval_data:
            actual_intervals.append({
                "time": current.isoformat(),
                "solar_kwh": interval_data.get("solar_kwh", 0),
                "consumption_kwh": interval_data.get("consumption_kwh", 0),
                "battery_soc": interval_data.get("battery_soc", 0),
                "battery_capacity_kwh": interval_data.get("battery_capacity_kwh", 0),
                "grid_import_kwh": interval_data.get("grid_import", 0),
                "grid_export_kwh": interval_data.get("grid_export", 0),
                "mode": interval_data.get("mode", 0),
                "mode_name": interval_data.get("mode_name", "N/A"),
            })

        current += timedelta(minutes=15)

    # Update actual v plánu
    plan_data["actual"] = actual_intervals
    await self._save_daily_plan_to_storage(today_str, plan_data)
```

### 3. Analýza (kdykoliv)
```python
import json

# Načíst data
with open('/config/.storage/oig_cloud_daily_plans/2025-11-05.json') as f:
    data = json.load(f)

plan = {p["time"]: p for p in data["plan"]}
actual = {a["time"]: a for a in data["actual"]}

# Porovnat
for time in sorted(plan.keys()):
    if time in actual:
        p = plan[time]
        a = actual[time]
        solar_error = p["solar_kwh"] - a["solar_kwh"]
        print(f"{time}: Plan={p['solar_kwh']:.3f}, Actual={a['solar_kwh']:.3f}, Error={solar_error:+.3f}")
```

## Migrace

1. **Backup** současných souborů
2. **Refaktorovat** `_maybe_fix_daily_plan()` - uložit simple strukturu
3. **Refaktorovat** `_update_actual_from_history()` - update simple struktury
4. **Odstranit** `planned_timeline`, `planned_forecast`, `actual_intervals` logic
5. **Testovat** na novém dni

## Výhody

✅ **Jednoduchá struktura** - plan vs actual, jasné
✅ **Snadná analýza** - stačí porovnat same time keys
✅ **Žádná redundance** - 96 plan + max 96 actual
✅ **Čitelné** - každý interval má všechny potřebné hodnoty
✅ **Přímočaré** - přesně podle původního zadání

## Co zachovat

- Volání `_maybe_fix_daily_plan()` při polnoci
- Volání `_update_actual_from_history()` každých 15 min
- Storage path `/config/.storage/oig_cloud_daily_plans/`
- JSON formát
