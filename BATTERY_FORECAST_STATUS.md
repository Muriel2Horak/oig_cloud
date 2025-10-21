# Battery Forecast Refactoring - Summary

## ✅ Hotovo

### 1. Nový zjednodušený battery_forecast senzor

- ✅ 450 řádků (-70% z původních 1482)
- ✅ Jednoduchý vzorec: `capacity = current + solar + grid - consumption`
- ✅ Transparentní `grid_change_kwh` místo `net_change_kwh`
- ✅ Timeline pro každý 15min interval

### 2. Odstranění starých senzorů

- ✅ Odstraněno ~30 battery_optimization senzorů ze SENSOR_TYPES_STATISTICS
- ✅ Ponechán pouze `battery_forecast` s kategorií `battery_prediction`
- ✅ Cleanup funkce v sensor.py pro odstranění starých entit

### 3. Oprava načítání timeline dat

- ✅ Změněno z `timeline_data` na `prices` atribut
- ✅ Konverze formátu: `{date, time, price, tariff}` → `{time: "ISO", price: float}`
- ✅ Podpora formátu ze spot_price_current_15min senzoru

### 4. Oprava coordinatoru

- ✅ Změněno volání z `_calculate_battery_forecast()` na `async_update()`
- ✅ Správné načítání `_timeline_data` z senzoru
- ✅ Opraveno v coordinator.py i oig_cloud_coordinator.py

### 5. Oprava inverter_sn detekce

- ✅ Přidána priorita: config_entry param → coordinator.config_entry → coordinator.data
- ✅ Debug logging pro sledování odkud se získává

## ⚠️ Aktuální problémy

### 1. Spot price sensor není dostupný

```
WARNING: Sensor sensor.oig_2206237016_spot_price_current_15min not available
```

**Řešení**: Zkontrolovat jestli je pricing povolený v options flow

### 2. Dashboard chybí battery_forecast

```
WARNING: Dashboard entity missing: sensor.oig_2206237016_battery_forecast
```

**Důvod**: Sensor se nevytvořil protože chybí spot_price data

## 📝 Další kroky

1. ⏭️ **Povolit spot prices** v config flow / options
2. ⏭️ **Restartovat HA** aby se vytvořil spot_price sensor
3. ⏭️ **Ověřit timeline data** v spot_price atributech
4. ⏭️ **Testovat battery_forecast** výpočet

## 📊 Struktura dat

### Input: spot_price_current_15min attributes

```yaml
prices:
  - date: "2025-10-20"
    time: "13:30"
    price: 4.0
    tariff: "NT"
```

### Output: battery_forecast timeline_data

```python
[
  {
    "timestamp": "2025-10-20T13:30:00",
    "spot_price_czk": 4.0,
    "battery_capacity_kwh": 5.67,
    "solar_production_kwh": 1.2,
    "consumption_kwh": 0.8,
    "grid_change_kwh": 0.0
  }
]
```

## 🎯 Stav refactoringu

- **Kód**: ✅ 100% hotový
- **Nasazení**: ✅ Nasazeno do HA
- **Testování**: ⏳ Čeká na povolení spot prices
- **Dokumentace**: ✅ Kompletní

## 📚 Dokumentace

- `docs/BATTERY_FORECAST_SIMPLIFIED.md` - Kompletní technická dokumentace
- `BATTERY_FORECAST_REFACTOR.md` - Shrnutí změn
- `oig_cloud_battery_forecast.py.backup` - Záloha původního kódu
