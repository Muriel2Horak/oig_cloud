#!/usr/bin/env python3
"""Analyze battery forecast data from HA API."""
import json
import subprocess
from datetime import datetime

# Fetch data from API
result = subprocess.run(
    [
        "curl",
        "-s",
        "http://10.0.0.143:8123/api/oig_cloud/battery_forecast/2206237016/timeline",
        "-H",
        "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJiODEzYzJhMTU5OGY0Y2M2OTIzNWVkOTlmMDliNzllZCIsImlhdCI6MTczMDY3ODUyMywiZXhwIjoyMDQ2MDM4NTIzfQ.g1YGIEpHVf5tQcgbW7HWKaCBBM9ZYNJ82rC_hOcR8BA",
    ],
    capture_output=True,
    text=True,
)

if result.returncode != 0:
    print(f"Error fetching data: {result.stderr}")
    exit(1)

data = json.loads(result.stdout)
timeline = data.get("active", [])

print(f"📊 Battery Forecast Analysis")
print(f"Last update: {data['metadata']['last_update']}")
print(f"Points: {data['metadata']['points_count']}\n")

# Find data with actual values (not null)
valid_data = [t for t in timeline if t.get("battery_pct") is not None]

if not valid_data:
    print("⚠️  No valid battery data found (all battery_pct are null)")
    print("\nShowing first 10 timeline entries:")
    for i, t in enumerate(timeline[:10]):
        print(
            f"  {t.get('time')}: mode={t.get('mode')}, battery_pct={t.get('battery_pct')}, clamped={t.get('is_clamped')}"
        )
else:
    print(f"✓ Found {len(valid_data)} valid data points\n")

    # Analyze clamped periods
    clamped = [t for t in valid_data if t.get("is_clamped")]
    print(f"🔒 Clamped intervals: {len(clamped)}")

    if clamped:
        print("\nClamped periods (battery at minimum):")
        for t in clamped[:10]:
            print(
                f"  {t['time']}: battery={t['battery_pct']:.1f}%, consumption={t.get('consumption_kwh', 0):.3f} kWh, solar={t.get('solar_kwh', 0):.3f} kWh"
            )

    # Find minimum battery level
    min_battery = min(valid_data, key=lambda x: x.get("battery_pct", 100))
    print(
        f"\n📉 Minimum battery: {min_battery['battery_pct']:.1f}% at {min_battery['time']}"
    )

    # Find maximum battery level
    max_battery = max(valid_data, key=lambda x: x.get("battery_pct", 0))
    print(
        f"📈 Maximum battery: {max_battery['battery_pct']:.1f}% at {max_battery['time']}"
    )

    # Check planned minimum/target from mode_recommendations
    if "mode_recommendations" in data:
        recs = data["mode_recommendations"]
        print(f"\n🎯 Planned constraints:")
        print(f"  Minimum: {recs.get('planned_minimum_pct', 'N/A')}%")
        print(f"  Target: {recs.get('planned_target_pct', 'N/A')}%")

    # Show last 20 intervals
    print(f"\n📋 Last 20 intervals:")
    for t in valid_data[-20:]:
        mode_name = ["HOME_I", "HOME_II", "HOME_III", "HOME_UPS"][t.get("mode", 0)]
        clamp_mark = "🔒" if t.get("is_clamped") else "  "
        print(
            f"  {clamp_mark} {t['time']}: {mode_name} | battery={t.get('battery_pct', 0):.1f}% | cons={t.get('consumption_kwh', 0):.3f} kWh | solar={t.get('solar_kwh', 0):.3f} kWh"
        )
