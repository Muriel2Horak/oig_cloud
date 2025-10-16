# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Jitter in Polling**: ✅ VERIFIED IN PRODUCTION - Randomized update intervals to spread API load
  - Base interval: 30 seconds
  - Random jitter: ±5 seconds
  - Final interval ranges between 25-35 seconds
  - Prevents synchronized requests from multiple instances
  - Reduces peak load on OIG Cloud servers
  - **Status**: Fully functional, logs visible in production
  - **Verification**: See `docs/ETAG_JITTER_VERIFICATION_SUMMARY.md`

- **ETag / If-None-Match Caching**: HTTP ETag implementation (server not supported)
  - API client sends `If-None-Match` header with cached ETag values
  - Handles `304 Not Modified` responses with local cache fallback
  - Per-endpoint caching for `json.php` (basic stats) and `json2.php` (extended stats)
  - **Server Limitation**: OIG Cloud server does NOT return ETag headers (100% responses have `ETag: None`)
  - **Status**: Implementation correct, fallback mode active, no bandwidth savings due to server limitation
  - **Future**: Ready for when/if server adds ETag support

### Changed

- API client now tracks ETag values and cached responses per endpoint (ready for future server support)
- Coordinator update cycle includes randomized jitter for load distribution (verified working)
- Improved logging: ETag cache monitoring (debug level), jitter calculations (info level)

### Fixed

- Jitter implementation moved to correct coordinator file (`oig_cloud_coordinator.py` instead of unused `coordinator.py`)
- Added INFO level logging for jitter to ensure visibility without debug mode

### Technical

- Added `_cache` dictionary to `OigCloudApi` for ETag storage
- Added `_update_cache()` helper method for cache management
- Modified `_try_get_stats()` and `get_extended_stats()` to support ETag headers
- Added `_calculate_jitter()` method to coordinator for random interval offsets
- Extended `_async_update_data()` to apply jitter before data fetch

## [1.0.6] - Previous Release

### Added

- Extended sensors for battery charging/discharging tracking
- Separate measurement of battery charging from PV vs. grid
- Configurable update intervals for standard and extended statistics
- More accurate energy measurements using custom integration
- Improved boiler power calculation

### Changed

- Statistics reset at end of day/month/year
- Code structure improvements for reliability
- Enhanced logging for debugging

---

[Unreleased]: https://github.com/psimsa/oig_cloud/compare/v1.0.6...HEAD
[1.0.6]: https://github.com/psimsa/oig_cloud/releases/tag/v1.0.6
