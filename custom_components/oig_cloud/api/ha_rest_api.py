"""
OIG Cloud - Home Assistant REST API Endpoints.

This module provides REST API endpoints for accessing large sensor data
that would otherwise bloat sensor attributes and cause memory issues.

Architecture:
- Sensors store ONLY summary data in attributes (< 2 KB)
- Full data stored in internal variables or via event profiling
- API endpoints expose full data on-demand via HTTP GET
- Dashboard/frontend fetches via /api/oig_cloud/<endpoint>

Endpoints:
- /api/oig_cloud/battery_forecast/<box_id>/timeline - Full timeline data (280 KB)
- /api/oig_cloud/battery_forecast/<box_id>/baseline - Baseline timeline (280 KB)
- /api/oig_cloud/spot_prices/<box_id>/intervals - 15min price intervals (155 KB)
- /api/oig_cloud/analytics/<box_id>/hourly - Hourly analytics (6.5 KB)
- /api/oig_cloud/consumption_profiles/<box_id> - 72h consumption prediction (~2 KB)
- /api/oig_cloud/balancing_decisions/<box_id> - 7d balancing pattern prediction (~15 KB)

Total API payload: ~739 KB
Total sensor attributes: ~17 KB (97% reduction!)

Author: OIG Cloud Integration
Date: 2025-10-28
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from aiohttp import web
from homeassistant.helpers.http import HomeAssistantView
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_component import EntityComponent

_LOGGER = logging.getLogger(__name__)

# API routes base
API_BASE = "/api/oig_cloud"


class OIGCloudBatteryTimelineView(HomeAssistantView):
    """API endpoint for battery forecast timeline data."""

    url = f"{API_BASE}/battery_forecast/{{box_id}}/timeline"
    name = "api:oig_cloud:battery_timeline"
    requires_auth = False  # TODO: Re-enable after auth method is implemented

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        """
        Get full battery forecast timeline data.

        Args:
            box_id: OIG box ID (e.g., "2206237016")

        Query params:
            ?type=active - Active timeline (with applied charging plan)
            ?type=baseline - Baseline timeline (no charging plan)
            ?type=both - Both timelines (default)

        Returns:
            JSON with timeline data:
            {
                "active": [...],  # 192 timeline points
                "baseline": [...],  # 192 timeline points
                "metadata": {
                    "box_id": "2206237016",
                    "last_update": "2025-10-28T12:00:00+01:00",
                    "points_count": 192,
                    "size_kb": 280
                }
            }
        """
        hass: HomeAssistant = request.app["hass"]
        timeline_type = request.query.get("type", "both")

        try:
            # Find sensor entity
            sensor_id = f"sensor.oig_{box_id}_battery_forecast"
            component: EntityComponent = hass.data.get("sensor")  # type: ignore

            if not component:
                return web.json_response(
                    {"error": "Sensor component not found"}, status=500
                )

            # Find entity by entity_id
            entity_obj = None
            for entity in component.entities:
                if entity.entity_id == sensor_id:
                    entity_obj = entity
                    break

            if not entity_obj:
                return web.json_response(
                    {"error": f"Sensor {sensor_id} not found"}, status=404
                )

            # Get timeline data from sensor's internal variables
            active_timeline = getattr(entity_obj, "_timeline_data", [])
            baseline_timeline = getattr(entity_obj, "_baseline_timeline", [])
            last_update = getattr(entity_obj, "_last_update", None)

            # Phase 2.8: Add mode_recommendations
            mode_recommendations = getattr(entity_obj, "_mode_recommendations", [])

            # Build response based on requested type
            response_data: Dict[str, Any] = {}

            if timeline_type in ("active", "both"):
                response_data["active"] = active_timeline

            if timeline_type in ("baseline", "both"):
                response_data["baseline"] = baseline_timeline

            # Always include mode_recommendations (DNES + ZÍTRA only)
            response_data["mode_recommendations"] = mode_recommendations

            # Add metadata
            import sys

            response_data["metadata"] = {
                "box_id": box_id,
                "last_update": str(last_update) if last_update else None,
                "points_count": len(active_timeline),
                "size_kb": round(sys.getsizeof(str(response_data)) / 1024, 1),
            }

            _LOGGER.debug(
                f"API: Serving battery timeline for {box_id}, "
                f"type={timeline_type}, points={len(active_timeline)}"
            )

            return web.json_response(response_data)

        except Exception as e:
            _LOGGER.error(f"Error serving battery timeline API: {e}")
            return web.json_response({"error": str(e)}, status=500)


class OIGCloudSpotPricesView(HomeAssistantView):
    """API endpoint for spot price intervals (Phase 1.5)."""

    url = f"{API_BASE}/spot_prices/{{box_id}}/intervals"
    name = "api:oig_cloud:spot_prices"
    requires_auth = False  # TODO: Re-enable after auth method is implemented

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        """
        Get 15-minute spot price intervals.

        Args:
            box_id: OIG box ID (e.g., "2206237016")

        Query params:
            ?type=export - Export prices (without VAT/distribution)
            ?type=spot - Spot prices (with VAT/distribution)
            ?currency=czk - CZK prices only (default)
            ?currency=eur - EUR prices only
            ?currency=both - Both currencies

        Returns:
            JSON with price intervals:
            {
                "intervals": [
                    {"time": "2025-10-28T00:00:00", "price": 1.234},
                    ...
                ],
                "metadata": {
                    "box_id": "2206237016",
                    "type": "export",
                    "intervals_count": 192,
                    "last_update": "2025-10-28T12:00:00+01:00",
                    "currency": "czk",
                    "size_kb": 12
                }
            }
        """
        hass: HomeAssistant = request.app["hass"]
        price_type = request.query.get("type", "export")  # export or spot
        currency = request.query.get("currency", "czk")

        try:
            # Determine sensor ID based on type
            if price_type == "export":
                sensor_id = f"sensor.oig_{box_id}_export_price_current_15min"
            elif price_type == "spot":
                sensor_id = f"sensor.oig_{box_id}_spot_price_current_15min"
            else:
                return web.json_response(
                    {"error": f"Invalid type: {price_type}. Use 'export' or 'spot'."},
                    status=400,
                )

            component: EntityComponent = hass.data.get("sensor")  # type: ignore

            if not component:
                return web.json_response(
                    {"error": "Sensor component not found"}, status=500
                )

            # Find entity
            entity_obj = None
            for entity in component.entities:
                if entity.entity_id == sensor_id:
                    entity_obj = entity
                    break

            if not entity_obj:
                return web.json_response(
                    {"error": f"Sensor {sensor_id} not found"}, status=404
                )

            # Get spot data from sensor's internal variables
            spot_data = getattr(entity_obj, "_spot_data_15min", {})
            last_update = getattr(entity_obj, "_last_update", None)

            # Extract intervals
            prices_15m = spot_data.get("prices15m_czk_kwh", {})
            intervals = [
                {"time": time_key, "price": price}
                for time_key, price in sorted(prices_15m.items())
            ]

            # Build response
            response_data = {
                "intervals": intervals,
                "metadata": {
                    "box_id": box_id,
                    "type": price_type,
                    "intervals_count": len(intervals),
                    "last_update": last_update.isoformat() if last_update else None,
                    "currency": currency,
                },
            }

            # Add size info
            import sys

            response_data["metadata"]["size_kb"] = round(
                sys.getsizeof(str(response_data)) / 1024, 1
            )

            _LOGGER.debug(
                f"API: Serving {price_type} prices for {box_id}, "
                f"currency={currency}, intervals={len(intervals)}"
            )

            return web.json_response(response_data)

        except Exception as e:
            _LOGGER.error(f"Error serving spot prices API: {e}")
            return web.json_response({"error": str(e)}, status=500)


class OIGCloudAnalyticsView(HomeAssistantView):
    """API endpoint for hourly analytics data."""

    url = f"{API_BASE}/analytics/{{box_id}}/hourly"
    name = "api:oig_cloud:analytics"
    requires_auth = False  # TODO: Re-enable after auth method is implemented

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        """
        Get hourly analytics data.

        Args:
            box_id: OIG box ID (e.g., "2206237016")

        Returns:
            JSON with hourly analytics:
            {
                "hourly_prices": [...],  # 48 hours of data
                "metadata": {
                    "box_id": "2206237016",
                    "hours_count": 48,
                    "last_update": "2025-10-28T12:00:00+01:00",
                    "size_kb": 6.5
                }
            }
        """
        hass: HomeAssistant = request.app["hass"]

        try:
            # Find analytics sensor
            sensor_id = f"sensor.oig_{box_id}_hourly_analytics"
            component: EntityComponent = hass.data.get("sensor")  # type: ignore

            if not component:
                return web.json_response(
                    {"error": "Sensor component not found"}, status=500
                )

            # Find entity
            entity_obj = None
            for entity in component.entities:
                if entity.entity_id == sensor_id:
                    entity_obj = entity
                    break

            if not entity_obj:
                return web.json_response(
                    {"error": f"Sensor {sensor_id} not found"}, status=404
                )

            # Get hourly data
            hourly_prices = getattr(entity_obj, "_hourly_prices", [])
            last_update = getattr(entity_obj, "_last_update", None)

            # Build response
            import sys

            response_data = {
                "hourly_prices": hourly_prices,
                "metadata": {
                    "box_id": box_id,
                    "hours_count": len(hourly_prices),
                    "last_update": str(last_update) if last_update else None,
                    "size_kb": round(sys.getsizeof(str(hourly_prices)) / 1024, 1),
                },
            }

            _LOGGER.debug(
                f"API: Serving analytics for {box_id}, " f"hours={len(hourly_prices)}"
            )

            return web.json_response(response_data)

        except Exception as e:
            _LOGGER.error(f"Error serving analytics API: {e}")
            return web.json_response({"error": str(e)}, status=500)


class OIGCloudConsumptionProfilesView(HomeAssistantView):
    """API endpoint for 72h consumption profiles data."""

    url = f"{API_BASE}/consumption_profiles/{{box_id}}"
    name = "api:oig_cloud:consumption_profiles"
    requires_auth = False  # TODO: Re-enable after auth method is implemented

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        """
        Get current 72h consumption profile and prediction.

        Args:
            box_id: OIG box ID (e.g., "2206237016")

        Returns:
            JSON with profile data:
            {
                "current_prediction": {
                    "matched_profile_created": "2025-10-20T00:30:00+01:00",
                    "similarity_score": 0.856,
                    "predicted_consumption_24h": [...],  # 24 hourly values
                    "predicted_total_kwh": 28.45,
                    "predicted_avg_kwh": 1.185
                },
                "metadata": {
                    "box_id": "2206237016",
                    "last_profile_created": "2025-10-28T00:30:00+01:00",
                    "profiling_status": "ok",
                    "data_hash": "a3f2b1c4"
                }
            }
        """
        hass: HomeAssistant = request.app["hass"]

        try:
            # Find sensor entity
            sensor_id = f"sensor.oig_{box_id}_adaptive_load_profiles"
            component: EntityComponent = hass.data.get("sensor")  # type: ignore

            if not component:
                return web.json_response(
                    {"error": "Sensor component not found"}, status=500
                )

            # Find entity by entity_id
            entity_obj = None
            for entity in component.entities:
                if entity.entity_id == sensor_id:
                    entity_obj = entity
                    break

            if not entity_obj:
                return web.json_response(
                    {"error": f"Sensor {sensor_id} not found"}, status=404
                )

            # Get prediction from sensor
            current_prediction = entity_obj.get_current_prediction()

            response_data = {
                "current_prediction": current_prediction,
                "metadata": {
                    "box_id": box_id,
                    "last_profile_created": getattr(
                        entity_obj, "_last_profile_created", None
                    ),
                    "profiling_status": getattr(
                        entity_obj, "_profiling_status", "unknown"
                    ),
                    "data_hash": getattr(entity_obj, "_data_hash", None),
                },
            }

            _LOGGER.debug(f"API: Serving consumption profiles for {box_id}")

            return web.json_response(response_data)

        except Exception as e:
            _LOGGER.error(f"Error serving consumption profiles API: {e}")
            return web.json_response({"error": str(e)}, status=500)


class OIGCloudBalancingDecisionsView(HomeAssistantView):
    """API endpoint for balancing decision pattern data."""

    url = f"{API_BASE}/balancing_decisions/{{box_id}}"
    name = "api:oig_cloud:balancing_decisions"
    requires_auth = False  # TODO: Re-enable after auth method is implemented

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        """
        GET /api/oig_cloud/balancing_decisions/{box_id}

        Returns balancing decision pattern prediction based on 7d profiling.

        Response structure:
        {
            "current_prediction": {
                "matched_profile_created": "2025-10-27T00:30:00",
                "similarity_score": 0.87,
                "predicted_120h_data": [...],  # 120 hours of predicted data
                "predicted_balancing_hours": 18,
                "predicted_balancing_percentage": 15.0,
                "predicted_avg_spot_price": 2.35,
                "matched_profile_balancing_hours": 22
            },
            "metadata": {
                "box_id": "CBB00000123",
                "last_profile_created": "2025-10-28T00:30:00",
                "profiling_status": "ok",
                "data_source": "7d_balancing_profiling"
            }
        }
        """
        try:
            # Find battery_balancing sensor entity
            entity_id = f"sensor.oig_{box_id}_battery_balancing"
            entity_component: EntityComponent = self.hass.data.get("entity_components", {}).get("sensor")  # type: ignore

            if not entity_component:
                return web.json_response(
                    {"error": "Sensor component not found"}, status=404
                )

            # Get entity object
            entity_obj = None
            for entity in entity_component.entities:
                if entity.entity_id == entity_id:
                    entity_obj = entity
                    break

            if not entity_obj:
                return web.json_response(
                    {"error": f"Battery balancing sensor {entity_id} not found"},
                    status=404,
                )

            # Get current prediction from sensor
            current_prediction = None
            if hasattr(entity_obj, "_find_best_matching_balancing_pattern"):
                try:
                    current_prediction = await entity_obj._find_best_matching_balancing_pattern()  # type: ignore
                except Exception as e:
                    _LOGGER.warning(f"Failed to get balancing pattern: {e}")

            # Prepare response
            metadata = {
                "box_id": box_id,
                "last_profile_created": (
                    entity_obj._last_balancing_profile_created.isoformat()  # type: ignore
                    if hasattr(entity_obj, "_last_balancing_profile_created")
                    and entity_obj._last_balancing_profile_created  # type: ignore
                    else None
                ),
                "profiling_status": (
                    entity_obj._balancing_profiling_status  # type: ignore
                    if hasattr(entity_obj, "_balancing_profiling_status")
                    else "unknown"
                ),
                "data_source": "7d_balancing_profiling",
            }

            response_data = {
                "current_prediction": current_prediction,
                "metadata": metadata,
            }

            _LOGGER.debug(f"API: Serving balancing decisions for {box_id}")

            return web.json_response(response_data)

        except Exception as e:
            _LOGGER.error(f"Error serving balancing decisions API: {e}")
            return web.json_response({"error": str(e)}, status=500)


def setup_api_endpoints(hass: HomeAssistant) -> None:
    """
    Register all OIG Cloud REST API endpoints.

    Args:
        hass: Home Assistant instance
    """
    _LOGGER.info("🚀 Registering OIG Cloud REST API endpoints")

    # Register views
    hass.http.register_view(OIGCloudBatteryTimelineView())
    hass.http.register_view(OIGCloudSpotPricesView())
    hass.http.register_view(OIGCloudAnalyticsView())
    hass.http.register_view(OIGCloudConsumptionProfilesView())
    hass.http.register_view(OIGCloudBalancingDecisionsView())

    _LOGGER.info(
        "✅ OIG Cloud REST API endpoints registered:\n"
        f"  - {API_BASE}/battery_forecast/<box_id>/timeline\n"
        f"  - {API_BASE}/spot_prices/<box_id>/intervals\n"
        f"  - {API_BASE}/analytics/<box_id>/hourly\n"
        f"  - {API_BASE}/consumption_profiles/<box_id>\n"
        f"  - {API_BASE}/balancing_decisions/<box_id>"
    )
