"""Legacy shim for battery forecast sensor.

The implementation lives in custom_components.oig_cloud.battery_forecast.ha_sensor.
"""

from .battery_forecast.ha_sensor import OigCloudBatteryForecastSensor

__all__ = ["OigCloudBatteryForecastSensor"]
