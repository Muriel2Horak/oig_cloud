# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### ✨ Added

- **Battery planner wizard options** – new selector for Hybrid / Hybrid+Autonomy preview profiles plus cheap-window and DP tuning fields with full EN/CZ translations.
- **Autonomy QA coverage** – regression tests for the cheap-window UPS helper and DP optimizer ensure the new planner knobs remain stable.

### 🔧 Changed

- **Timeline dialog** – plan toggle lets you switch between live Hybrid control and the new Autonomy preview dataset directly in the modal and from the autonomy cost tile.
- **Analytics tile action** – the “Autonomní plán” card now opens the timeline dialog pre-filtered to the Autonomy plan instead of the unfinished detail dialog.

## [2.0.6-pre.1] - 2025-12-16

### ✨ Added

- **Local datasource mode** – option to mirror values from local HA entities into cloud OIG sensors (event-driven) with UI/dashboard support.
- **Local SonarQube tooling** – `docker-compose.sonarqube.yml`, `scripts/sonar_local.sh`, and coverage config to run scans locally.

### 🔧 Changed

- **Dashboard value updates** – split-flap / flip-style animations + alignment fixes for tiles and configurable side tiles.
- **Hybrid optimizer refactor** – extracted helper functions to reduce cognitive complexity (no behavior change intended).

### 🐛 Fixed

- **Options flow (HA 2025.12)** – hardening around handler-based entry id / protected attrs and initialization issues.
- **Frontend HYBRID key mapping** – consistent key mapping across dashboard JS modules.

## [2.0.5] - 2025-10-29

### ✨ Added

- **Extended Timeline API - Historie vs Plán** - Complete historical tracking system
  - New `timeline_extended` field with 3-day view (yesterday/today/tomorrow)
  - Historical data with actual vs planned comparison for each 15-min interval
  - `daily_plan_state` tracking with plan fixation at midnight
  - Actual performance tracking every 15 minutes
  - Daily summary calculation at end of day
  - New dashboard tab "📊 HISTORIE vs PLÁN" for visualization
  - Accuracy metrics: delta kWh, delta cost, percentage accuracy
  - Mode recommendations now show full today+tomorrow (not just from NOW)
  - Backward compatible - existing API fields unchanged
  - Complete implementation documentation in `docs/TIMELINE_API_ENHANCEMENT_PLAN.md`

### 🔧 Changed

- **Battery Forecast Timeline**
  - Mode recommendations filter changed from `today_start` to `NOW` for future-only data
  - Timeline extended to show full historical + planned data
  - Separate attributes for plan fixation vs real-time recommendations
  - Enhanced visualization with historical vs planned bars
  - Color-coded deltas (green = better than plan, red = worse than plan)

### 🐛 Fixed

- **DP Optimization Mode Application**
  - Fixed critical bug where DP optimal modes were calculated but not applied to battery calculations
  - Moved `interval_mode_num` determination BEFORE battery calculation
  - Added grid import in HOME I mode when battery at minimum capacity
  - Fixed timeline starting from yesterday midnight instead of NOW

### 📚 Documentation

- New: `TIMELINE_API_ENHANCEMENT_PLAN.md` - Complete implementation plan and API documentation
- Updated: API response structure with `timeline_extended` and `daily_plan_state` examples
- Updated: Frontend dashboard code with extended timeline functions
- Implementation: 7 phases (100% complete)

---

## [2.0.4] - 2025-10-24

### ✨ Added

- **ČHMÚ Weather Warnings Integration** - Complete meteorological warning system
  - CAP XML API client for real-time weather alerts from Czech Hydrometeorological Institute
  - Two sensors: local (GPS-filtered) and global (entire Czech Republic)
  - Severity levels 0-4 (None, Minor/Yellow, Moderate/Orange, Severe/Red, Extreme/Purple)
  - Dashboard header badge with color-coded severity indicator
  - Expandable modal with detailed warning information
  - Event type, onset, expires, affected areas, descriptions, instructions
  - Point-in-polygon and point-in-circle geographic filtering
  - GPS priority: Solar Forecast → HA settings → Praha default
  - Hourly updates with persistent storage
  - WebSocket-driven real-time updates
  - Mobile-responsive design
  - Config flow integration with translations (CS/EN)
  - Comprehensive documentation in `docs/CHMU_WARNINGS.md`

### 🔧 Changed

- **Grid Charging Sensor Refactor** - Binary sensor with enhanced attributes
  - Changed from numeric sensor (kWh) to binary sensor (on/off)
  - Energy and cost moved to attributes: `total_energy_kwh`, `total_cost_czk`
  - Fixed calculation to count only actual battery charging
  - Ignores intervals where grid only covers consumption (battery full)
  - New attributes: `charging_intervals` with detailed per-interval data
  - `is_charging_battery` flag for each interval
  - `battery_capacity_kwh` tracking
  - `charging_battery_count` for actual charging intervals

### 🐛 Fixed

- **Dashboard Improvements**
  - Fixed default zoom on pricing chart to show current time
  - Fixed chart initialization after hard refresh
  - Fixed timezone handling in charts
  - Fixed flow animations particle count calculation
  - Fixed tab visibility validation when switching to Flow tab
  - Asynchronous application of default zoom after Chart.js initialization

### 🗑️ Removed

- Automatic battery charging based on weather conditions
- Temporary documentation files and old backups

## [Unreleased]

## [2.0.3-preview] - 2025-10-20

### 🚀 **MAJOR RELEASE** - Complete Rewrite & Enhancement

Obrovský release s **238 commity** od července 2024, obsahující **55,160 řádků nového kódu** napříč **146 soubory**. Toto je preview verze pro testery před finálním stable release v2.0.4.

### ✨ **1. ENERGY FLOW DASHBOARD (Zcela nový)**

- **Grafická vizualizace** energetických toků v reálném čase
- **Animované toky** podle směru a výkonu energie (dynamický počet kuliček)
- **Responzivní design** - mobil, tablet, desktop
- **Inteligentní node systém**: Grid, Solar, Battery, Home, Boiler
- **Dual-color status** (zelená/červená) podle aktuálního stavu
- **Cenové informace** a tarify přímo v dashboardu
- **Solární forecast** integrace s předpovědí výroby
- **Top bar control panel** s horizontálním layoutem
- **Detailní informace** u všech uzlů (výkon, napětí, proud)
- **Partial re-rendering** pro optimální výkon (60 FPS)
- **Sbalitelná fronta** Service Shield ve vizualizaci
- **Automatická detekce** boileru a baterie

### 🛡️ **2. SERVICESHIELD™ REFACTOR (Kompletní přepracování)**

- **Event-based monitoring** - okamžitá reakce místo pollingu
- **Live duration tracking** s dynamickými aktualizacemi v reálném čase
- **Strukturovaný targets output** - frontend bez parsování JSON
- **Inteligentní serializace** operací (správné pořadí mode → limit)
- **Grid delivery split** - automatické rozdělení na samostatné služby
- **Shield sensor mapping** - kompletní mapování všech služeb na senzory
- **Multi-device support** - automatické čištění orphaned zařízení
- **Thread safety** - lock mechanismus pro prevenci race conditions
- **Logbook integrace** - všechny události v HA logbooku s friendly names
- **Delete button** - možnost mazat položky z fronty (+ bezpečnostní kontroly)
- **Retry logika** - robustní initial load s 20s fallback
- **State listener** - automatický unsub při prázdné frontě
- **Coordinator auto-refresh** - okamžitá aktualizace po API volání

### 🧙 **3. WIZARD CONFIG FLOW (Nový průvodce)**

- **Kompletní wizard** - intuitivní krok-za-krokem setup
- **Unifikace Options Flow** - stejné UX jako Config Flow
- **3-step pricing wizard** - scenario-based konfigurace (Fixní/Spot/Tarify)
- **Validace bypass** pro back button (uživatelsky přívětivé)
- **Dynamické formuláře** s hints a tooltip nápovědou
- **GAP analysis** - automatické doplnění všech chybějících parametrů
- **Povinná live data** - validace v config flow (prevence neúplných dat)
- **Automatický reload** integrace po změně nastavení
- **Kompletní české překlady** - 100% lokalizace
- **Migration handler** - bezproblémový upgrade z v1 → v2

### 📡 **4. API KOMUNIKACE (Efektivnější)**

- **Zero external dependencies** - vendorovaný `oig_cloud_client` (žádné external repos!)
- **Browser-perfect headers** - 12 kompletních HTTP headerů (Chrome User-Agent, Sec-Ch-Ua, atd.)
- **ETag caching** - redukce duplicitních requestů (až 70% úspora)
- **Polling jitter** - eliminace API spikes (\_calculate_jitter() method)
- **Session management** - robustní cookie handling s PHPSESSID
- **TLS/HTTP2 podpora** - moderní protokoly
- **Automatic coordinator refresh** po každém API volání
- **Multi-device API** - správa více zařízení současně
- **Retry mechanismus** - automatické opakování při selhání

### 🎨 **5. THEME SYSTEM (Light/Dark Mode)**

- **Complete theme support** s CSS custom properties
- **Automatické přepínání** light/dark podle HA nastavení
- **CSS variables** pro snadnou customizaci (barvy, spacing, shadows)
- **Theme-aware controls** - všechny komponenty respektují téma
- **Consistent styling** napříč celým dashboardem

### 📚 **6. DOKUMENTACE (8 uživatelských + 22 vývojářských)**

**User Guides:**

- `CONFIGURATION.md` (488 lines) - Kompletní konfigurace systému
- `DASHBOARD.md` (601 lines) - Dashboard setup, customizace, troubleshooting
- `ENTITIES.md` (495 lines) - Všechny entity, význam, použití
- `SERVICES.md` (651 lines) - Všechny služby s příklady YAML
- `SHIELD.md` (763 lines) - ServiceShield™ průvodce a best practices
- `AUTOMATIONS.md` (799 lines) - Příklady automatizací (spotová cena, baterie, boiler)
- `FAQ.md` (677 lines) - Často kladené otázky a odpovědi
- `TROUBLESHOOTING.md` (1041 lines) - Řešení problémů A-Z

**Developer Docs (22+ souborů):**

- Vendoring guide & implementation summary
- Wizard implementation & GAP analysis
- Shield sensor mapping & refactor
- TLS/HTTP2 analysis & optimization
- Dependency validation & module dependencies
- Test infrastructure & Docker setup
- IDE setup (Pylance/Pyright)
- ... a mnoho dalších

### 🧪 **7. TEST INFRASTRUCTURE**

- **Docker-based testing** - konzistentní prostředí (HA 2025.1.4 container)
- **pytest-homeassistant-custom-component** - oficiální test framework
- **GitHub Actions CI** s Python 3.12 a automated tests
- **282 řádků testů** pro ETag caching alone
- **PYTHONPATH konfigurace** pro správné importy vendored modules
- **pytest.ini** s asyncio settings a proper timeouts
- **61 testů celkem** - kompletní pokrytí coordinator, API, models

### � **8. HOME ASSISTANT 2025.4 COMPATIBILITY**

- **async_create_task** místo deprecated `async_add_job()`
- **Minimum HA 2024.1.0** (upgrade z 2022.0.0)
- **Removed 'country' field** z manifest.json (deprecated)
- **Python 3.12 optimalizace** pro CI/CD
- **Type hints** - kompletní typing napříč codebase

### 🎯 **9. UX IMPROVEMENTS**

- **Pending UI** - univerzální zobrazení pro všechny service calls
- **Okamžitá aktualizace** shield fronty (bez zdržení)
- **Button state detection** - správné zvýraznění aktivní služby
- **Layout optimization** - žádné překrývání elementů, flex-wrap: nowrap
- **Responsive controls** - mobil-first design approach
- **Battery charging button** - tlačítko pro manuální nabíjení
- **Battery forecast** - 15minutové intervaly predikce
- **Boiler detection** - automatická detekce a konfigurace
- **Collapsible queue** - možnost sbalit frontu v dashboardu
- **Live badges** - žlutý badge pro běžící služby s duration

### 🐛 **10. 50+ BUGFIXŮ**

- **Grid delivery** mode/limit mapping (přesné mapování EN ↔ CS)
- **Boiler mode blinking** - odstranění blikání při změně
- **Shield state listener** - thread safety s lock mechanismem
- **Coordinator context** - fix AttributeError při async_added_to_hass
- **Layout shift prevention** - flex-wrap: nowrap pro stabilitu
- **Translation completeness** - všechny chybějící překlady doplněny
- **Entity mapping** - fix pro všechny služby (box_mode, boiler, grid)
- **Timeout handling** - speciální 2min timeout pro formating_mode
- **Remove from queue** - správná logika pro position calculation
- **Initial shield UI load** - fix pro načtení při otevření stránky
- **Pylance warnings** - kompletní diagnostic suppressions
- **Test suite** - fix import paths, PYTHONPATH, missing methods
- **Jitter calculation** - restored `_calculate_jitter()` method
- **Coordinator methods** - restored `_fetch_basic_data()` & `_fetch_extended_data()`
- ... a mnoho dalších

### 📊 **STATISTIKA ZMĚN:**

- **238 commitů** od července 2024
- **55,160 řádků přidáno**, 2,886 odstraněno
- **146 souborů změněno**
- **55 nových funkcí** (feat:)
- **50+ bugfixů** (fix:)
- **20+ refactorů** (refactor:)
- **8 uživatelských příruček** (4,515 řádků dokumentace)
- **22+ vývojářských dokumentů** (7,000+ řádků technical docs)

### 🔄 Changed

- **Manifest version** bumped to 2.0.3-preview
- **Minimum HA version** updated to 2024.1.0
- **Requirements** cleaned (zero external dependencies)
- **Test infrastructure** migrated to Docker
- **IDE configuration** standardized (Pylance/Pyright)

### 🐛 Fixed (Selected Critical Fixes)

- HA 2025.4 compatibility (async_create_task)
- Coordinator missing methods restoration
- Shield thread safety and race conditions
- Grid delivery mode/limit split and mapping
- Boiler mode blinking elimination
- Layout shift and responsiveness
- Translation completeness
- Test suite import paths
- Pylance diagnostic suppressions
- Initial UI load reliability

### 📝 Documentation

- Complete user documentation suite (8 guides)
- Comprehensive developer documentation (22+ docs)
- IDE setup guide for contributors
- Testing guide with Docker instructions
- API documentation and examples

### ⚠️ **BREAKING CHANGES:**

- Minimum HA version: **2024.1.0** (previously 2022.0.0)
- Config entry version migrated to **v2** (automatic migration included)
- External dependency removed: `oig-cloud-client` now vendored

### 🎉 **PRO TESTERY:**

Toto je **preview release** pro testování. Prosíme o feedback zejména k:

- ✅ Energy Flow Dashboard - animace, responzivita, výkon
- ✅ ServiceShield - správné fungování fronty, timeouty
- ✅ Wizard Config Flow - srozumitelnost, chyby
- ✅ Grid delivery - správné mapování mode/limit
- ✅ Boiler mode - žádné blikání, stabilita

**Známé limitace:**

- Home 5 a Home 6 režimy jsou zobrazeny, ale disabled (čekáme na dokumentaci OIG)
- Formating mode má fixed 2min timeout (nelze detekovat completion)

**Po testování a opravách vydáme v2.0.4 jako stable release.**

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
