"""Konstanty pro bojlerový modul."""

from typing import Final

# Fyzikální konstanty
WATER_SPECIFIC_HEAT: Final[float] = 4186.0  # J/(kg·K)
WATER_DENSITY: Final[float] = 1000.0  # kg/m³
JOULES_TO_KWH: Final[float] = 1 / 3_600_000  # 1 kWh = 3.6 MJ

# Stratifikace
TEMP_GRADIENT_PER_10CM: Final[float] = 0.8  # °C/10cm výška
BOILER_HEIGHT_DEFAULT: Final[float] = 1.5  # m

# Pozice senzoru (% výšky od spodu)
SENSOR_POSITION_MAP: Final[dict[str, float]] = {
    "top": 1.0,  # 100%
    "upper_quarter": 0.75,  # 75%
    "middle": 0.5,  # 50%
    "lower_quarter": 0.25,  # 25%
}

# Profiling - adaptivní kategorie
PROFILE_CATEGORIES: Final[list[str]] = [
    "workday_spring",
    "workday_summer",
    "workday_autumn",
    "workday_winter",
    "weekend_spring",
    "weekend_summer",
    "weekend_autumn",
    "weekend_winter",
]

# Sezóny (měsíc → sezóna)
SEASON_MAP: Final[dict[int, str]] = {
    3: "spring",
    4: "spring",
    5: "spring",
    6: "summer",
    7: "summer",
    8: "summer",
    9: "autumn",
    10: "autumn",
    11: "autumn",
    12: "winter",
    1: "winter",
    2: "winter",
}

# Minimální confidence pro použití profilu
MIN_CONFIDENCE: Final[float] = 0.3

# FVE overflow detekce
BATTERY_SOC_OVERFLOW_THRESHOLD: Final[float] = 100.0  # %

# Planning
DEFAULT_HYSTERESIS_TEMP: Final[float] = 5.0  # °C
MIN_SLOT_DURATION: Final[int] = 15  # minut

# Klasifikátor aktivity bojleru (Task A — power-first truth)
# Minimální výkon CBB→bojler pro detekci elektrického ohřevu (W).
# Pod touto hodnotou se topení považuje za vypnuté i kdyby bylo čidlo „on".
BOILER_POWER_ON_THRESHOLD_W: Final[float] = 100.0

# Teplota, při níž považujeme vodu v bojleru za „použitelnou" (°C).
# Slouží pro výpočet fill_level_pct (compute_ready_fraction).
BOILER_READY_TEMP_C: Final[float] = 40.0

# Minimální trend teploty naznačující alternativní ohřev (°C/min).
# Pokud topí plyn/tepelné čerpadlo a není k dispozici přímé měření,
# pozitivní trend ≥ tohoto prahu naznačuje ohřev z alternativy.
ALT_TREND_THRESHOLD_C_PER_MIN: Final[float] = 0.08

# cbb_w above this → the box is commanding heat (single source, was duplicated
# in demand_profiler.py and heating_estimator.py).
COMMAND_ON_W: Final[float] = 100.0

# R3: Home 5 maneuver — nominal battery wear cost per kWh cycled through
# the boiler.  0.50 CZK/kWh is a conservative estimate until calibration data
# is available (typical Li-ion wear is ~0.10–0.50 CZK/kWh depending on cycle
# count warranty and current replacement price).  This cost makes battery
# cheaper than expensive day-ahead grid (>0.50 CZK/kWh) but more expensive
# than cheap night grid or PV overflow (~0 CZK/kWh).
BATTERY_CYCLE_COST_CZK_PER_KWH: Final[float] = 0.50
