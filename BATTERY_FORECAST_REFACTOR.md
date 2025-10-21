# Battery Forecast - Zjednodušení na jeden senzor

## 🎯 Cíl refactoringu

Zjednodušit komplexní systém battery prediction (6+ senzorů, 1482 řádků) na jeden čistý senzor s transparentní logikou.

## ✨ Změny

### 1. Nový zjednodušený senzor

- **Soubor**: `oig_cloud_battery_forecast.py`
- **Velikost**: ~450 řádků (-70%)
- **Princip**: Jednoduchý vzorec pro každý 15min interval

### 2. Vzorec výpočtu

```python
nová_kapacita = předchozí + solar + grid - consumption
```

### 3. Transparentní grid charging

- **Před**: `net_change_kwh` (součet všeho)
- **Po**: `grid_change_kwh` (samostatná hodnota)
- **Důvod**: Transparentnost - vidíme přesně kolik přišlo ze sítě

### 4. Timeline struktura

```json
{
  "timestamp": "2025-10-20T14:00:00",
  "spot_price_czk": 2.45,
  "battery_capacity_kwh": 5.67,
  "solar_production_kwh": 1.2,
  "consumption_kwh": 0.8,
  "grid_change_kwh": 0.0
}
```

## 📦 Datové zdroje

### Vstupní senzory

1. `sensor.oig_{box_id}_remaining_usable_capacity` - aktuální kapacita
2. `sensor.oig_{box_id}_usable_battery_capacity` - max kapacita
3. Config flow `min_capacity_percent` - min kapacita
4. `sensor.oig_{box_id}_spot_price_current_15min` - časová osa (timeline)
5. `sensor.hourly_real_fve_total_kwh` - solární předpověď (dnes/zítra)
6. `sensor.load_avg_{interval}_{day_type}` - spotřeba (weekday/weekend)

### Helper funkce

- `_get_solar_for_timestamp()` - hodinové → 15min (`/4`)
- `_get_load_avg_for_timestamp()` - lookup podle day_type + time_range
- `_parse_time_range()` - parsování "06:00-08:00"
- `_is_time_in_range()` - kontrola časového rozmezí (včetně přes půlnoc)

## 🗑️ Odstraněné (backup v .backup souboru)

- Komplexní optimalizace nabíjení
- Peak/off-peak analýza
- Charging blocks výpočty
- Control signály pro řízení
- 6+ různých prediction senzorů
- ~1000 řádků komplexního kódu

## ✅ Výhody

1. **Jednoduchost**: 1 senzor místo 6+
2. **Transparentnost**: Jasný vzorec, viditelné vstupy/výstupy
3. **Udržovatelnost**: 70% méně kódu
4. **Rozšiřitelnost**: Připraveno pro grid charging (zatím 0.0)
5. **Kompatibilita**: Stejná timeline struktura pro dashboard

## 🔮 Budoucí rozšíření

Grid charging je **připraveno** ale zatím neimplementováno:

```python
# Budoucí logika (připraveno)
if should_charge_from_grid(timestamp, spot_price, battery_kwh):
    grid_kwh = calculate_grid_charging(charge_rate_kw)
else:
    grid_kwh = 0.0
```

## 📚 Dokumentace

- `docs/BATTERY_FORECAST_SIMPLIFIED.md` - kompletní dokumentace
  - Algoritmus výpočtu
  - Helper funkce
  - Timeline struktura
  - Testing scénáře
  - Migrace guide
  - Budoucí rozšíření

## 🧪 Testing

```python
# Test 1: Základní výpočet
current=5.0 + solar=1.0 + grid=0.0 - consumption=0.8 = 5.2 kWh ✓

# Test 2: Clamp na max
current=9.5 + solar=1.0 = min(10.5, 10.0) = 10.0 kWh ✓

# Test 3: Clamp na min
current=2.5 - consumption=1.0 = max(1.5, 2.0) = 2.0 kWh ✓
```

## 📋 TODO (další kroky)

1. ✅ Vytvořit nový zjednodušený senzor
2. ✅ Změnit `net_change_kwh` → `grid_change_kwh`
3. ✅ Dokumentace
4. ✅ Backup starého souboru
5. ⏳ Otestovat v HA (po restartu)
6. ⏳ Implementovat cleanup starých senzorů
7. ⏳ Budoucí: Grid charging logika

## 🔍 Key Changes Summary

| Aspect              | Před                      | Po                             |
| ------------------- | ------------------------- | ------------------------------ |
| **Řádky kódu**      | 1482                      | ~450 (-70%)                    |
| **Počet senzorů**   | 6+                        | 1                              |
| **Logika**          | Komplexní optimalizace    | Jednoduchý vzorec              |
| **Grid charging**   | `net_change_kwh` (součet) | `grid_change_kwh` (samostatné) |
| **Udržovatelnost**  | ❌ Těžké                  | ✅ Snadné                      |
| **Transparentnost** | ❌ Nepřehledné            | ✅ Jasné                       |

## 🎉 Výsledek

Jednoduchý, čitelný, transparentní senzor s jasnou logikou a připravený pro budoucí rozšíření o grid charging.
