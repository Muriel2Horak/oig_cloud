# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0-beta] - 2025-10-19

### 🎉 Major Release - Complete Rewrite

This is a **major release** with significant architectural changes, new features, and breaking changes. Please read carefully before upgrading.

### ✨ Added

#### 🔄 **Multi-Device Support**
- **Multiple Battery Boxes**: Full support for multiple ČEZ Battery Boxes on single OIG Cloud account
- **Device Selector in Services**: Optional `device_id` parameter in all services (`set_box_mode`, `set_grid_delivery`, `set_boiler_mode`, `set_formating_mode`)
- **Automatic Device Cleanup**: Orphaned devices are automatically removed when Battery Box is deleted from OIG Cloud account
- **Device Identification**: Intelligent handling of device identifiers including `_shield` and `_analytics` suffixes
- **Backward Compatible**: Services work with or without device_id - defaults to first device if not specified

#### 📦 **Vendored Dependencies**
- **Self-Contained Integration**: OIG Cloud Client now included as vendored module in `custom_components/oig_cloud/lib/oig_cloud_client/`
- **Zero External Dependencies**: No external Python packages required
- **Faster Installation**: No dependency resolution needed
- **Offline Installation**: Works without internet access after download
- **Version Control**: API client versioned with integration

#### 🧙‍♂️ **Wizard Configuration Flow**
- **Multi-Step Wizard**: Complete redesign of initial setup experience with 5-10 screens
- **Setup Type Selection**: 
  - 🧙‍♂️ **Wizard** (recommended) - Guided setup with contextual help
  - ⚡ **Quick Setup** - 30 seconds with sensible defaults
  - 📥 **YAML Import** - For existing configurations (future)
- **Progressive Disclosure**: 
  - Module selection screen (Statistics, Solar Forecast, Battery Prediction, etc.)
  - Conditional steps - only shows configuration for enabled modules
  - Detailed configuration screens with inline help
- **Configuration Summary**: Review all settings before completing
- **State Management**: 
  - Wizard remembers selections
  - Browser back button support
  - Session recovery
- **Visual Progress**: Progress bar and step counter (e.g., "Krok 3 z 5 ▓▓▓░░")
- **Enhanced Validation**: Per-step validation with immediate error feedback
- **Full Localization**: Complete Czech translations

#### 🛡️ **ServiceShield™ Enhancements**
- **Configurable Timeout**: Set protection timeout from 5 to 60 minutes in Options
- **Live Monitoring**: Real-time detection of mode changes in coordinator
- **Improved Detection**: Better identification of external vs. internal changes
- **Enhanced Logging**: Detailed Shield activity logs for debugging

#### 🚀 **API Communication Optimizations**
- **ETag / If-None-Match Caching**: 
  - HTTP ETag implementation for bandwidth optimization
  - Per-endpoint caching for `json.php` and `json2.php`
  - Handles `304 Not Modified` responses
  - Ready for server-side ETag support
- **Jitter in Polling**: 
  - Randomized update intervals (±5 seconds) to spread API load
  - Base interval: 30 seconds → actual: 25-35 seconds
  - Prevents synchronized requests from multiple instances
  - Reduces peak load on OIG Cloud servers
  - ✅ **Verified in production**

#### 📝 **Documentation Overhaul**
- **User Documentation** (`docs/user/`):
  - Configuration guide
  - Dashboard setup
  - Entity reference
  - Services documentation
  - ServiceShield™ guide
  - Automation examples
  - FAQ
  - Troubleshooting
- **Developer Documentation** (`docs/dev/`):
  - Architecture analysis
  - Multi-device implementation
  - API communication report
  - Vendoring guide
  - Module dependencies
  - Development setup

#### 🧪 **Testing & Quality**
- **Unit Tests**: Comprehensive test suite with pytest
- **CI/CD**: GitHub Actions workflows for automated testing
- **Test Coverage**: pytest-cov integration
- **Linting**: flake8, black, isort, mypy

### 🔄 Changed

#### **Breaking Changes**

⚠️ **Important**: These changes may require reconfiguration!

- **Configuration Flow**: Complete redesign - existing setups should continue working, but new installations use wizard
- **Vendored API Client**: API client moved from external package to `lib/oig_cloud_client/` - imports changed internally
- **Device Architecture**: Device handling improved to support multiple devices - existing single-device setups unaffected

#### **Improvements**

- **API Client**: Removed duplicate caching logic that conflicted with coordinator timing
- **Coordinator**: Improved update cycle with jitter and better error handling
- **Service Calls**: Enhanced validation with better error messages
- **Logging**: Structured logging with appropriate levels (INFO for jitter, DEBUG for ETag cache)
- **Error Handling**: More robust error handling throughout integration

### 🐛 Fixed

- **Jitter Implementation**: Moved to correct coordinator file (`oig_cloud_coordinator.py`)
- **Cache Race Conditions**: Removed internal API cache that caused unpredictable behavior
- **Service Validation**: Fixed schema validation errors with `device_id` parameter
- **Device Identifier Parsing**: Fixed handling of `_shield` and `_analytics` suffixes
- **Test Imports**: Updated test imports for vendored module structure
- **Orphaned Devices**: Automatic cleanup when devices removed from OIG Cloud

### 🗑️ Removed

- **External Dependencies**: Removed dependency on `oig-cloud-client` PyPI package
- **Interim Documentation**: Cleaned up deployment and debug documentation from repository
- **Deployment Scripts**: Removed local deployment scripts from git tracking

### 📋 Technical Details

#### **Module Structure**
```
custom_components/oig_cloud/
├── lib/
│   └── oig_cloud_client/      # Vendored API client
│       ├── api/
│       │   └── oig_cloud_api.py
│       └── models/
│           └── (data models)
├── __init__.py
├── config_flow.py             # Wizard implementation
├── coordinator.py
├── sensor.py                  # Device cleanup
├── services.py                # Multi-device support
└── ...
```

#### **Device Architecture**
- **1 ConfigEntry** per OIG Cloud account
- **Multiple Device entries**:
  - Main device: `(DOMAIN, box_id)`
  - Shield device: `(DOMAIN, f"{box_id}_shield")`
  - Analytics device: `(DOMAIN, f"{box_id}_analytics")`
- **Entity Assignment**: Entities properly assigned to relevant devices

#### **Service Schema**
```yaml
device_id:
  description: The ČEZ Battery Box device to control
  required: false
  selector:
    device:
      filter:
        - integration: oig_cloud
```

### 🔐 Security

- **No Breaking Changes**: API credentials handling unchanged
- **Vendored Code**: Reduced supply chain risk with vendored dependencies
- **Input Validation**: Enhanced validation in service calls

### 📊 Migration Guide

#### **From 1.x to 2.0.0-beta**

1. **Backup Configuration**: Export your current configuration
2. **Update Integration**: Install via HACS or manually
3. **Restart Home Assistant**: Full restart recommended
4. **Verify Entities**: Check that all entities are available
5. **Update Automations** (if using multiple devices):
   - Add `device_id` parameter to service calls
   - See [Services Documentation](./docs/user/SERVICES.md)

#### **New Installation**

1. Install via HACS
2. Add integration via UI
3. Choose **Wizard** or **Quick Setup**
4. Follow on-screen instructions

### 🙏 Contributors

Thanks to all contributors and testers who helped make this release possible!

### 📖 Documentation

- **[README](./README.md)** - Main documentation
- **[User Guide](./docs/user/)** - Complete user documentation
- **[Developer Guide](./docs/dev/)** - Development documentation
- **[FAQ](./docs/user/FAQ.md)** - Frequently Asked Questions

---

## [1.0.6] - 2024-12-15

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

### Fixed

- Various bug fixes and stability improvements

---

## [1.0.5] - 2024-11-01

### Added

- ServiceShield™ protection against unwanted mode changes
- Basic multi-language support

### Fixed

- Stability improvements
- API communication fixes

---

## [1.0.0] - 2024-09-01

### Added

- Initial release
- Basic ČEZ Battery Box integration
- Energy Dashboard support
- Service calls for mode control
- Statistics tracking

---

[Unreleased]: https://github.com/psimsa/oig_cloud/compare/v2.0.0-beta...HEAD
[2.0.0-beta]: https://github.com/psimsa/oig_cloud/compare/v1.0.6...v2.0.0-beta
[1.0.6]: https://github.com/psimsa/oig_cloud/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/psimsa/oig_cloud/compare/v1.0.0...v1.0.5
[1.0.0]: https://github.com/psimsa/oig_cloud/releases/tag/v1.0.0
