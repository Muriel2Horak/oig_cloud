"""Definice statistických senzorů pro OIG Cloud."""

from typing import List, Dict, Any
from homeassistant.components.sensor import SensorDeviceClass, SensorStateClass
from homeassistant.helpers.entity import EntityCategory
from homeassistant.const import UnitOfPower, UnitOfEnergy, UnitOfTime, PERCENTAGE

# Seznam statistických senzorů s jejich konfigurací
SENSOR_TYPES_STATISTICS: Dict[str, Dict[str, Any]] = {
    # Základní odběr - medián za posledních 10 minut
    "battery_load_median": {
        "name": "Load Median 10 Minutes",
        "name_cs": "Medián odběru za 10 minut",
        "unit": UnitOfPower.WATT,
        "icon": "mdi:chart-line",
        "device_class": SensorDeviceClass.POWER,
        "state_class": SensorStateClass.MEASUREMENT,
        "sampling_minutes": 10,
        "sampling_size": 1000,
        "sensor_type_category": "statistics",
        "description": "Medián celkového odběru domácnosti za posledních 10 minut",
    },
    # Víkend vs všední den odběr po časových úsecích
    "load_avg_6_8_weekday": {
        "name": "Average Load 6-8h Weekday",
        "name_cs": "Průměrný odběr 6-8h (všední dny)",
        "unit": UnitOfPower.WATT,
        "icon": "mdi:chart-timeline-variant",
        "device_class": SensorDeviceClass.POWER,
        "state_class": SensorStateClass.MEASUREMENT,
        "time_range": (6, 8),
        "day_type": "weekday",
        "statistic": "median",
        "max_age_days": 30,
        "sampling_size": 1000,
        "sensor_type_category": "statistics",
    },
    "load_avg_8_12_weekday": {
        "name": "Average Load 8-12h Weekday",
        "name_cs": "Průměrný odběr 8-12h (všední dny)",
        "unit": UnitOfPower.WATT,
        "icon": "mdi:chart-timeline-variant",
        "device_class": SensorDeviceClass.POWER,
        "state_class": SensorStateClass.MEASUREMENT,
        "time_range": (8, 12),
        "day_type": "weekday",
        "statistic": "median",
        "max_age_days": 30,
        "sampling_size": 1000,
        "sensor_type_category": "statistics",
    },
    "load_avg_12_16_weekday": {
        "name": "Average Load 12-16h Weekday",
        "name_cs": "Průměrný odběr 12-16h (všední dny)",
        "unit": UnitOfPower.WATT,
        "icon": "mdi:chart-timeline-variant",
        "device_class": SensorDeviceClass.POWER,
        "state_class": SensorStateClass.MEASUREMENT,
        "time_range": (12, 16),
        "day_type": "weekday",
        "statistic": "median",
        "max_age_days": 30,
        "sampling_size": 1000,
        "sensor_type_category": "statistics",
    },
    "load_avg_16_22_weekday": {
        "name": "Average Load 16-22h Weekday",
        "name_cs": "Průměrný odběr 16-22h (všední dny)",
        "unit": UnitOfPower.WATT,
        "icon": "mdi:chart-timeline-variant",
        "device_class": SensorDeviceClass.POWER,
        "state_class": SensorStateClass.MEASUREMENT,
        "time_range": (16, 22),
        "day_type": "weekday",
        "statistic": "median",
        "max_age_days": 30,
        "sampling_size": 1000,
        "sensor_type_category": "statistics",
    },
    "load_avg_22_6_weekday": {
        "name": "Average Load 22-6h Weekday",
        "name_cs": "Průměrný odběr 22-6h (všední dny)",
        "unit": UnitOfPower.WATT,
        "icon": "mdi:chart-timeline-variant",
        "device_class": SensorDeviceClass.POWER,
        "state_class": SensorStateClass.MEASUREMENT,
        "time_range": (22, 6),  # přes půlnoc
        "day_type": "weekday",
        "statistic": "median",
        "max_age_days": 30,
        "sampling_size": 1000,
        "sensor_type_category": "statistics",
    },
    # Víkendové varianty
    "load_avg_6_8_weekend": {
        "name": "Average Load 6-8h Weekend",
        "name_cs": "Průměrný odběr 6-8h (víkendy)",
        "unit": UnitOfPower.WATT,
        "icon": "mdi:chart-timeline-variant",
        "device_class": SensorDeviceClass.POWER,
        "state_class": SensorStateClass.MEASUREMENT,
        "time_range": (6, 8),
        "day_type": "weekend",
        "statistic": "median",
        "max_age_days": 30,
        "sampling_size": 1000,
        "sensor_type_category": "statistics",
    },
    "load_avg_8_12_weekend": {
        "name": "Average Load 8-12h Weekend",
        "name_cs": "Průměrný odběr 8-12h (víkendy)",
        "unit": UnitOfPower.WATT,
        "icon": "mdi:chart-timeline-variant",
        "device_class": SensorDeviceClass.POWER,
        "state_class": SensorStateClass.MEASUREMENT,
        "time_range": (8, 12),
        "day_type": "weekend",
        "statistic": "median",
        "max_age_days": 30,
        "sampling_size": 1000,
        "sensor_type_category": "statistics",
    },
    "load_avg_12_16_weekend": {
        "name": "Average Load 12-16h Weekend",
        "name_cs": "Průměrný odběr 12-16h (víkendy)",
        "unit": UnitOfPower.WATT,
        "icon": "mdi:chart-timeline-variant",
        "device_class": SensorDeviceClass.POWER,
        "state_class": SensorStateClass.MEASUREMENT,
        "time_range": (12, 16),
        "day_type": "weekend",
        "statistic": "median",
        "max_age_days": 30,
        "sampling_size": 500,
        "sensor_type_category": "statistics",
    },
    "load_avg_16_22_weekend": {
        "name": "Average Load 16-22h Weekend",
        "name_cs": "Průměrný odběr 16-22h (víkendy)",
        "unit": UnitOfPower.WATT,
        "icon": "mdi:chart-timeline-variant",
        "device_class": SensorDeviceClass.POWER,
        "state_class": SensorStateClass.MEASUREMENT,
        "time_range": (16, 22),
        "day_type": "weekend",
        "statistic": "median",
        "max_age_days": 30,
        "sampling_size": 1000,
        "sensor_type_category": "statistics",
    },
    "load_avg_22_6_weekend": {
        "name": "Average Load 22-6h Weekend",
        "name_cs": "Průměrný odběr 22-6h (víkendy)",
        "unit": UnitOfPower.WATT,
        "icon": "mdi:chart-timeline-variant",
        "device_class": SensorDeviceClass.POWER,
        "state_class": SensorStateClass.MEASUREMENT,
        "time_range": (22, 6),
        "day_type": "weekend",
        "statistic": "median",
        "max_age_days": 30,
        "sampling_size": 1000,
        "sensor_type_category": "statistics",
    },
    # Predikční senzory
    "battery_prediction_discharge_time": {
        "name": "Battery Discharge Time Prediction",
        "name_cs": "Predikce - doba vybití baterie",
        "unit": UnitOfTime.HOURS,
        "icon": "mdi:battery-clock",
        "device_class": SensorDeviceClass.DURATION,
        "sensor_type_category": "battery_prediction",
    },
    "battery_prediction_needed_capacity": {
        "name": "Battery Needed Capacity Prediction",
        "name_cs": "Predikce - potřebná kapacita baterie",
        "unit": UnitOfEnergy.KILO_WATT_HOUR,
        "icon": "mdi:battery-plus",
        "device_class": SensorDeviceClass.ENERGY,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "battery_prediction",
    },
    "battery_prediction_morning_soc": {
        "name": "Battery Morning SOC Prediction",
        "name_cs": "Predikce - stav baterie ráno",
        "unit": PERCENTAGE,
        "icon": "mdi:battery-clock-outline",
        "device_class": SensorDeviceClass.BATTERY,
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "battery_prediction",
    },
    # Hodinové reálné senzory - používají existující computed energy senzory
    "hourly_real_battery_charge_kwh": {
        "name": "Hourly Battery Charge",
        "name_cs": "Hodinové nabíjení baterie",
        "unit": UnitOfEnergy.KILO_WATT_HOUR,
        "icon": "mdi:battery-plus",
        "device_class": SensorDeviceClass.ENERGY,
        "state_class": SensorStateClass.TOTAL,
        "entity_category": EntityCategory.DIAGNOSTIC,
        "sensor_type_category": "statistics",
        "hourly_data_type": "energy_diff",
        "source_sensor": "computed_batt_charge_energy_today",
        "description": "Reálné nabíjení baterie za poslední hodinu",
    },
    "hourly_real_battery_discharge_kwh": {
        "name": "Hourly Battery Discharge",
        "name_cs": "Hodinové vybíjení baterie",
        "unit": UnitOfEnergy.KILO_WATT_HOUR,
        "icon": "mdi:battery-minus",
        "device_class": SensorDeviceClass.ENERGY,
        "state_class": SensorStateClass.TOTAL,
        "entity_category": EntityCategory.DIAGNOSTIC,
        "sensor_type_category": "statistics",
        "hourly_data_type": "energy_diff",
        "source_sensor": "computed_batt_discharge_energy_today",
        "description": "Reálné vybíjení baterie za poslední hodinu",
    },
    "hourly_real_fve_total_kwh": {
        "name": "Hourly FVE Production",
        "name_cs": "Hodinová výroba FVE",
        "unit": UnitOfEnergy.KILO_WATT_HOUR,
        "icon": "mdi:solar-power",
        "device_class": SensorDeviceClass.ENERGY,
        "state_class": SensorStateClass.TOTAL,
        "entity_category": EntityCategory.DIAGNOSTIC,
        "sensor_type_category": "statistics",
        "hourly_data_type": "power_integral",
        "source_sensor": "actual_fv_total",
        "description": "Reálná celková výroba FVE za poslední hodinu",
    },
    "hourly_real_load_kwh": {
        "name": "Hourly Load Consumption",
        "name_cs": "Hodinová spotřeba zátěže",
        "unit": UnitOfEnergy.KILO_WATT_HOUR,
        "icon": "mdi:home-lightning-bolt",
        "device_class": SensorDeviceClass.ENERGY,
        "state_class": SensorStateClass.TOTAL,
        "entity_category": EntityCategory.DIAGNOSTIC,
        "sensor_type_category": "statistics",
        "hourly_data_type": "power_integral",
        "source_sensor": "actual_aco_p",
        "description": "Reálná spotřeba za poslední hodinu",
    },
    "hourly_real_boiler_kwh": {
        "name": "Hourly Boiler Consumption",
        "name_cs": "Hodinová spotřeba bojleru",
        "unit": UnitOfEnergy.KILO_WATT_HOUR,
        "icon": "mdi:water-boiler",
        "device_class": SensorDeviceClass.ENERGY,
        "state_class": SensorStateClass.TOTAL,
        "entity_category": EntityCategory.DIAGNOSTIC,
        "sensor_type_category": "statistics",
        "hourly_data_type": "energy_diff",
        "source_sensor": "boiler_day_w",
        "description": "Reálná spotřeba bojleru za poslední hodinu",
    },
    # Hodinové FVE stringy
    "hourly_real_fve_string_1_kwh": {
        "name": "Hourly FVE String 1 Production",
        "name_cs": "Hodinová výroba FVE string 1",
        "unit": UnitOfEnergy.KILO_WATT_HOUR,
        "icon": "mdi:solar-panel",
        "device_class": SensorDeviceClass.ENERGY,
        "state_class": SensorStateClass.TOTAL,
        "entity_category": EntityCategory.DIAGNOSTIC,
        "sensor_type_category": "statistics",
        "hourly_data_type": "power_integral",
        "source_sensor": "actual_fv_p1",
        "description": "Reálná výroba FVE string 1 za poslední hodinu",
    },
    "hourly_real_fve_string_2_kwh": {
        "name": "Hourly FVE String 2 Production",
        "name_cs": "Hodinová výroba FVE string 2",
        "unit": UnitOfEnergy.KILO_WATT_HOUR,
        "icon": "mdi:solar-panel",
        "device_class": SensorDeviceClass.ENERGY,
        "state_class": SensorStateClass.TOTAL,
        "entity_category": EntityCategory.DIAGNOSTIC,
        "sensor_type_category": "statistics",
        "hourly_data_type": "power_integral",
        "source_sensor": "actual_fv_p2",
        "description": "Reálná výroba FVE string 2 za poslední hodinu",
    },
    # ====================================================================================
    # OPTIMALIZACE NABÍJENÍ BATERIE - Rozděleno podle 3 hlavních cílů
    # ====================================================================================
    # 🎯 CÍL 1: AUTOMATIZACE NABÍJENÍ - Senzory pro automatizační pravidla
    # ====================================================================================
    # 1.1 Hlavní predikční senzor - KAPACITA BATERIE V PRŮBĚHU DNE
    "battery_forecast": {
        "name": "Battery Capacity Forecast",
        "name_cs": "Predikce kapacity baterie",
        "unit": UnitOfEnergy.KILO_WATT_HOUR,
        "icon": "mdi:battery-charging-80",
        "device_class": SensorDeviceClass.ENERGY_STORAGE,
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "battery_prediction",  # Hlavní senzor - vytváří OigCloudBatteryForecastSensor
        "entity_category": EntityCategory.DIAGNOSTIC,
        "description": "Aktuální predikovaná kapacita baterie (kWh). Atributy obsahují kompletní timeline predikce.",
    },
    # 1.2 Binární senzor - MÁM NABÍJET TEĎ?
    "should_charge_battery_now": {
        "name": "Should Charge Battery Now",
        "name_cs": "Nabíjet baterii nyní",
        "unit": None,
        "icon": "mdi:battery-charging-100",
        "device_class": None,
        "state_class": None,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": None,  # Hlavní senzor pro automatizaci
        "description": "ANO/NE - Zda právě teď nabíjet baterii ze sítě (10min předstih pro změnu režimu)",
    },
    # 1.3 Doporučené nabíjecí hodiny DNES
    "charging_hours_today": {
        "name": "Charging Hours Today",
        "name_cs": "Nabíjení dnes - počet hodin",
        "unit": "hodin",
        "icon": "mdi:clock-check",
        "device_class": None,
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": None,
        "description": "Počet hodin kdy má dnes nabíjet baterie ze sítě. Atributy obsahují konkrétní časy.",
    },
    # 1.4 Doporučené nabíjecí hodiny ZÍTRA
    "charging_hours_tomorrow": {
        "name": "Charging Hours Tomorrow",
        "name_cs": "Nabíjení zítra - počet hodin",
        "unit": "hodin",
        "icon": "mdi:clock-outline",
        "device_class": None,
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": EntityCategory.DIAGNOSTIC,
        "description": "Počet hodin kdy má zítra nabíjet baterie ze sítě. Atributy obsahují konkrétní časy.",
    },
    # 1.5 Další nabíjení - KDY?
    "next_charging_time": {
        "name": "Next Charging Time",
        "name_cs": "Příští nabíjení - čas",
        "unit": None,
        "icon": "mdi:clock-start",
        "device_class": SensorDeviceClass.TIMESTAMP,
        "state_class": None,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": None,
        "description": "Timestamp kdy začíná příští doporučené nabíjení baterie",
    },
    # 1.6 Aktuální stav řízení
    "battery_charging_state": {
        "name": "Battery Charging State",
        "name_cs": "Stav nabíjení - režim",
        "unit": None,
        "icon": "mdi:state-machine",
        "device_class": None,
        "state_class": None,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": EntityCategory.DIAGNOSTIC,
        "description": "Aktuální stav: idle/pre_signal/charging/post_signal",
    },
    # ====================================================================================
    # 🎯 CÍL 2: EKONOMICKÁ ANALÝZA - Porovnání nákladů nabíjení vs. odběr ze sítě
    # ====================================================================================
    # 2.1 Náklady na nabíjení - CELKEM DNES
    "charging_cost_today": {
        "name": "Charging Cost Today",
        "name_cs": "Náklady na nabíjení dnes",
        "unit": "CZK",
        "icon": "mdi:cash",
        "device_class": SensorDeviceClass.MONETARY,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": None,
        "description": "Celkové náklady na nabíjení baterie dnes v CZK (podle spotových cen)",
    },
    # 2.2 Náklady na nabíjení - PLÁNOVANÉ ZÍTRA
    "charging_cost_tomorrow_planned": {
        "name": "Charging Cost Tomorrow (Planned)",
        "name_cs": "Náklady na nabíjení zítra (plán)",
        "unit": "CZK",
        "icon": "mdi:cash-clock",
        "device_class": SensorDeviceClass.MONETARY,
        "state_class": None,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": EntityCategory.DIAGNOSTIC,
        "description": "Plánované náklady na nabíjení baterie zítra podle optimalizace",
    },
    # 2.3 Úspora vs. běžný tarif
    "charging_savings_vs_peak": {
        "name": "Charging Savings vs Peak",
        "name_cs": "Úspora vs. peak tarif",
        "unit": "CZK",
        "icon": "mdi:piggy-bank",
        "device_class": SensorDeviceClass.MONETARY,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": None,
        "description": "Kolik ušetříte nabíjením v off-peak místo v peak hodinách",
    },
    # 2.4 Průměrná cena nabíjení
    "charging_avg_price": {
        "name": "Charging Average Price",
        "name_cs": "Průměrná cena nabíjení",
        "unit": "CZK/kWh",
        "icon": "mdi:chart-line",
        "device_class": None,
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": EntityCategory.DIAGNOSTIC,
        "description": "Průměrná cena za kterou se dnes nabíjela baterie",
    },
    # 2.5 Peak hodiny - POČET DNES
    "peak_hours_today_count": {
        "name": "Peak Hours Today Count",
        "name_cs": "Peak hodiny dnes - počet",
        "unit": "hodin",
        "icon": "mdi:chart-bell-curve-cumulative",
        "device_class": None,
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": EntityCategory.DIAGNOSTIC,
        "description": "Počet peak hodin s vysokými cenami (kdy se NENABÍJÍ)",
    },
    # 2.6 Off-Peak hodiny - POČET DNES
    "off_peak_hours_today_count": {
        "name": "Off-Peak Hours Today Count",
        "name_cs": "Off-peak hodiny dnes - počet",
        "unit": "hodin",
        "icon": "mdi:chart-bell-curve",
        "device_class": None,
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": EntityCategory.DIAGNOSTIC,
        "description": "Počet off-peak hodin s nízkými cenami (kdy se může nabíjet)",
    },
    # 2.7 Nejlevnější cena dnes
    "cheapest_price_today": {
        "name": "Cheapest Price Today",
        "name_cs": "Nejlevnější cena dnes",
        "unit": "CZK/kWh",
        "icon": "mdi:currency-czk",
        "device_class": None,
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": EntityCategory.DIAGNOSTIC,
        "description": "Nejlevnější spotová cena elektřiny dnes",
    },
    # 2.8 Nejvyšší cena dnes
    "highest_price_today": {
        "name": "Highest Price Today",
        "name_cs": "Nejvyšší cena dnes",
        "unit": "CZK/kWh",
        "icon": "mdi:currency-czk",
        "device_class": None,
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": EntityCategory.DIAGNOSTIC,
        "description": "Nejvyšší spotová cena elektřiny dnes",
    },
    # ====================================================================================
    # 🎯 CÍL 3: VIZUALIZACE - Data pro graf (jako na screenshotu)
    # ====================================================================================
    # 3.1 Timeline data - kompletní data pro graf
    "battery_timeline_chart_data": {
        "name": "Battery Timeline Chart Data",
        "name_cs": "Data pro graf baterie",
        "unit": None,
        "icon": "mdi:chart-timeline-variant",
        "device_class": None,
        "state_class": None,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": EntityCategory.DIAGNOSTIC,
        "description": "Kompletní timeline data pro ApexCharts - kapacita baterie, FVE, spotřeba, ceny",
    },
    # 3.2 Minimální predikovaná kapacita
    "battery_forecast_min": {
        "name": "Battery Forecast Minimum",
        "name_cs": "Predikce - minimální kapacita",
        "unit": UnitOfEnergy.KILO_WATT_HOUR,
        "icon": "mdi:battery-low",
        "device_class": SensorDeviceClass.ENERGY_STORAGE,
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": EntityCategory.DIAGNOSTIC,
        "description": "Nejnižší predikovaná kapacita baterie v příštích 48h (kWh + čas)",
    },
    # 3.3 Maximální predikovaná kapacita
    "battery_forecast_max": {
        "name": "Battery Forecast Maximum",
        "name_cs": "Predikce - maximální kapacita",
        "unit": UnitOfEnergy.KILO_WATT_HOUR,
        "icon": "mdi:battery-high",
        "device_class": SensorDeviceClass.ENERGY_STORAGE,
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": EntityCategory.DIAGNOSTIC,
        "description": "Nejvyšší predikovaná kapacita baterie v příštích 48h (kWh + čas)",
    },
    # 3.4 Stav baterie zítra v 6:00
    "battery_forecast_tomorrow_6am": {
        "name": "Battery Forecast Tomorrow 6AM",
        "name_cs": "Predikce - kapacita zítra v 6:00",
        "unit": UnitOfEnergy.KILO_WATT_HOUR,
        "icon": "mdi:battery-clock",
        "device_class": SensorDeviceClass.ENERGY_STORAGE,
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": EntityCategory.DIAGNOSTIC,
        "description": "Predikovaná kapacita baterie zítra ráno v 6:00 (klíčová hodnota)",
    },
    # 3.5 Energetická bilance dnes
    "energy_balance_today": {
        "name": "Energy Balance Today",
        "name_cs": "Energetická bilance dnes",
        "unit": UnitOfEnergy.KILO_WATT_HOUR,
        "icon": "mdi:scale-balance",
        "device_class": SensorDeviceClass.ENERGY,
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": EntityCategory.DIAGNOSTIC,
        "description": "Bilance: FVE výroba - spotřeba - nabíjení baterie (kladná = přebytek, záporná = deficit)",
    },
    # ====================================================================================
    # STATISTIKY A DIAGNOSTIKA
    # ====================================================================================
    # Úspěšnost predikce
    "battery_forecast_accuracy": {
        "name": "Battery Forecast Accuracy",
        "name_cs": "Přesnost predikce",
        "unit": PERCENTAGE,
        "icon": "mdi:target",
        "device_class": None,
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": EntityCategory.DIAGNOSTIC,
        "description": "Přesnost predikce kapacity baterie (porovnání předpovědi vs. realita)",
    },
    # Celková měsíční úspora
    "charging_savings_month": {
        "name": "Charging Savings This Month",
        "name_cs": "Úspora za měsíc",
        "unit": "CZK",
        "icon": "mdi:piggy-bank",
        "device_class": SensorDeviceClass.MONETARY,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "statistics",  # ✅ OPRAVENO: Helper senzor
        "entity_category": EntityCategory.DIAGNOSTIC,
        "description": "Celková úspora na nákladech za nabíjení v tomto měsíci díky optimalizaci",
    },
    # Battery Optimization Helper Sensors - pomocné senzory pro optimalizaci nabíjení
    "battery_optimization_charge_start": {
        "name": "Battery Optimization Charge Start",
        "icon": "mdi:battery-charging-50",
        "device_class": None,
        "unit_of_measurement": None,
        "state_class": None,
        "sensor_type_category": "statistics",  # OPRAVA: změna z battery_optimization
    },
    "battery_optimization_charge_end": {
        "name": "Battery Optimization Charge End",
        "icon": "mdi:battery-charging-100",
        "device_class": None,
        "unit_of_measurement": None,
        "state_class": None,
        "sensor_type_category": "statistics",  # OPRAVA: změna z battery_optimization
    },
    "battery_optimization_discharge_start": {
        "name": "Battery Optimization Discharge Start",
        "icon": "mdi:battery-minus",
        "device_class": None,
        "unit_of_measurement": None,
        "state_class": None,
        "sensor_type_category": "statistics",  # OPRAVA: změna z battery_optimization
    },
    "battery_optimization_discharge_end": {
        "name": "Battery Optimization Discharge End",
        "icon": "mdi:battery-outline",
        "device_class": None,
        "unit_of_measurement": None,
        "state_class": None,
        "sensor_type_category": "statistics",  # OPRAVA: změna z battery_optimization
    },
    "battery_optimization_strategy": {
        "name": "Battery Optimization Strategy",
        "icon": "mdi:strategy",
        "device_class": None,
        "unit_of_measurement": None,
        "state_class": None,
        "sensor_type_category": "statistics",  # OPRAVA: změna z battery_optimization
    },
    "battery_optimization_expected_savings": {
        "name": "Battery Optimization Expected Savings",
        "icon": "mdi:cash-multiple",
        "device_class": "monetary",
        "unit_of_measurement": "CZK",
        "state_class": "total",
        "sensor_type_category": "statistics",  # OPRAVA: změna z battery_optimization
    },
    "battery_optimization_confidence": {
        "name": "Battery Optimization Confidence",
        "icon": "mdi:percent",
        "device_class": None,
        "unit_of_measurement": "%",
        "state_class": "measurement",
        "sensor_type_category": "statistics",  # OPRAVA: změna z battery_optimization
    },
    "battery_optimization_last_update": {
        "name": "Battery Optimization Last Update",
        "icon": "mdi:update",
        "device_class": "timestamp",
        "unit_of_measurement": None,
        "state_class": None,
        "sensor_type_category": "statistics",  # OPRAVA: změna z battery_optimization
    },
}
