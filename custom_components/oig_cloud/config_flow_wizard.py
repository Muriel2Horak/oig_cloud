"""
🧙‍♂️ MODERN WIZARD-BASED CONFIG FLOW
====================================

Nová architektura s lepším UX:
1. Welcome screen s quick setup wizard
2. Smart cards s kategoriemi
3. Progress bar pro wizard
4. Live preview kalkulací
5. Visual feedback a validace
6. Responsive help s příklady
"""

import voluptuous as vol
import logging
from typing import Dict, Any, Optional, List, Tuple
from homeassistant import config_entries
from homeassistant.config_entries import FlowResult
from homeassistant.core import callback
from homeassistant.helpers import entity_registry as er

from .const import DOMAIN, CONF_USERNAME, CONF_PASSWORD

_LOGGER = logging.getLogger(__name__)


class WizardStep:
    """Reprezentuje jeden krok wizardu."""

    def __init__(
        self,
        step_id: str,
        title: str,
        icon: str,
        description: str,
        required: bool = False,
    ) -> None:
        self.step_id = step_id
        self.title = title
        self.icon = icon
        self.description = description
        self.required = required


class ModernConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Modern wizard-based config flow."""

    VERSION = 2  # Nová verze!

    def __init__(self) -> None:
        """Initialize the config flow."""
        super().__init__()
        self.wizard_data: Dict[str, Any] = {}
        self.wizard_step: int = 0
        self.quick_setup: bool = False

    async def async_step_user(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """🎨 Welcome screen - nový vstupní bod."""

        if user_input is not None:
            if user_input.get("setup_type") == "quick":
                self.quick_setup = True
                return await self.async_step_credentials()
            elif user_input.get("setup_type") == "advanced":
                self.quick_setup = False
                return await self.async_step_credentials()
            else:
                # Import ze stávající konfigurace
                return await self.async_step_import_config()

        # 🎨 WELCOME SCREEN s výběrem typu nastavení
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required("setup_type", default="quick"): vol.In(
                        {
                            "quick": "⚡ Rychlé nastavení (5 min) - Doporučeno pro začátečníky",
                            "advanced": "🔧 Pokročilé nastavení - Kompletní kontrola všech parametrů",
                            "import": "📥 Importovat ze stávající konfigurace",
                        }
                    )
                }
            ),
            description_placeholders={
                "title": "🎉 Vítejte v OIG Cloud Integration!",
                "info": (
                    "═══════════════════════════════════════\n"
                    "🔋 Battery Box monitoring & optimalizace\n"
                    "═══════════════════════════════════════\n\n"
                    "Co umí integrace:\n"
                    "✅ Real-time monitoring baterie a FVE\n"
                    "✅ Spotové ceny elektřiny (OTE)\n"
                    "✅ Chytré nabíjení baterie\n"
                    "✅ Solární předpověď\n"
                    "✅ Statistiky a analýzy\n\n"
                    "💡 Vyberte typ nastavení:"
                ),
            },
        )

    async def async_step_credentials(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """🔐 Krok 1/5: Přihlašovací údaje."""

        errors: Dict[str, str] = {}

        if user_input is not None:
            # Validace přihlašovacích údajů
            try:
                from .api.oig_cloud_api import OigCloudApi

                api = OigCloudApi(
                    user_input[CONF_USERNAME],
                    user_input[CONF_PASSWORD],
                    False,
                    self.hass,
                )

                if not await api.authenticate():
                    errors["base"] = "invalid_auth"
                else:
                    # Úspěch - uložit a pokračovat
                    self.wizard_data.update(user_input)
                    self.wizard_step = 1

                    if self.quick_setup:
                        # Quick setup - přeskočit na volbu modulů
                        return await self.async_step_quick_modules()
                    else:
                        # Advanced setup - jít na moduly
                        return await self.async_step_select_modules()

            except Exception as ex:
                _LOGGER.error(f"Auth failed: {ex}")
                errors["base"] = "cannot_connect"

        # 🎨 Progress bar: Krok 1/5
        progress = self._get_progress_bar(1, 5 if self.quick_setup else 7)

        return self.async_show_form(
            step_id="credentials",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_USERNAME): str,
                    vol.Required(CONF_PASSWORD): str,
                }
            ),
            errors=errors,
            description_placeholders={
                "title": f"🔐 Krok 1: Přihlášení do OIG Cloud\n{progress}",
                "info": (
                    "Zadejte přihlašovací údaje do OIG Cloud:\n\n"
                    "📧 E-mail: Váš e-mail z registrace\n"
                    "🔒 Heslo: Stejné jako v mobilní aplikaci\n\n"
                    "💡 TIP: Použijte stejné údaje jako v aplikaci\n"
                    "OIG Power nebo ČEZ Battery Box"
                ),
            },
        )

    async def async_step_quick_modules(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """⚡ Quick setup - výběr základních modulů."""

        if user_input is not None:
            self.wizard_data.update(user_input)
            self.wizard_step = 2

            # Podle výběru modulů jít na relevantní kroky
            if user_input.get("enable_solar_forecast"):
                return await self.async_step_quick_solar()
            elif user_input.get("enable_battery_prediction"):
                return await self.async_step_quick_battery()
            elif user_input.get("enable_spot_prices"):
                return await self.async_step_quick_pricing()
            else:
                # Hotovo - vytvořit konfiguraci
                return await self.async_step_finish()

        progress = self._get_progress_bar(2, 5)

        return self.async_show_form(
            step_id="quick_modules",
            data_schema=vol.Schema(
                {
                    vol.Optional("enable_statistics", default=True): bool,
                    vol.Optional("enable_solar_forecast", default=False): bool,
                    vol.Optional("enable_battery_prediction", default=False): bool,
                    vol.Optional("enable_spot_prices", default=True): bool,
                    vol.Optional("enable_extended_sensors", default=True): bool,
                }
            ),
            description_placeholders={
                "title": f"⚙️ Krok 2: Výběr funkcí\n{progress}",
                "info": (
                    "═══════════════════════════════════════\n"
                    "Vyberte funkce, které chcete používat:\n"
                    "═══════════════════════════════════════\n\n"
                    "📊 Statistiky (doporučeno)\n"
                    "   └─ Analýzy spotřeby a predikce\n\n"
                    "☀️ Solární předpověď\n"
                    "   └─ Předpověď výroby z FVE\n"
                    "   └─ Vyžaduje GPS souřadnice\n\n"
                    "🔋 Chytré nabíjení baterie\n"
                    "   └─ Optimalizace podle spotových cen\n"
                    "   └─ Vyžaduje spotové ceny\n\n"
                    "💰 Spotové ceny elektřiny\n"
                    "   └─ Real-time ceny z OTE\n"
                    "   └─ Kalkulace finálních cen\n\n"
                    "⚡ Rozšířené senzory\n"
                    "   └─ Detailní monitoring systému\n\n"
                    "💡 Můžete vše zapnout i později!"
                ),
            },
        )

    async def async_step_quick_solar(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """☀️ Quick setup - solární předpověď."""

        if user_input is not None:
            self.wizard_data.update(user_input)
            self.wizard_step = 3

            # Pokračovat na další modul nebo finish
            if self.wizard_data.get("enable_battery_prediction"):
                return await self.async_step_quick_battery()
            elif self.wizard_data.get("enable_spot_prices"):
                return await self.async_step_quick_pricing()
            else:
                return await self.async_step_finish()

        # Auto-detect GPS z HA
        lat = self.hass.config.latitude or 50.1219800
        lon = self.hass.config.longitude or 13.9373742

        # Auto-detect FVE výkon
        default_kwp = await self._detect_fve_power()

        progress = self._get_progress_bar(3, 5)

        return self.async_show_form(
            step_id="quick_solar",
            data_schema=vol.Schema(
                {
                    vol.Optional("solar_latitude", default=lat): vol.Coerce(float),
                    vol.Optional("solar_longitude", default=lon): vol.Coerce(float),
                    vol.Optional("solar_kwp", default=default_kwp): vol.Coerce(float),
                    vol.Optional("solar_declination", default=10): vol.In(
                        [0, 10, 20, 30, 40, 45]
                    ),
                    vol.Optional("solar_azimuth", default=180): vol.In(
                        {
                            90: "📍 Východ (90°)",
                            135: "📍 Jihovýchod (135°)",
                            180: "📍 Jih (180°) - doporučeno",
                            225: "📍 Jihozápad (225°)",
                            270: "📍 Západ (270°)",
                        }
                    ),
                }
            ),
            description_placeholders={
                "title": f"☀️ Krok 3: Solární předpověď\n{progress}",
                "info": (
                    f"═══════════════════════════════════════\n"
                    f"📍 GPS: {lat:.4f}, {lon:.4f}\n"
                    f"⚡ Detekovaný výkon: {default_kwp} kWp\n"
                    f"═══════════════════════════════════════\n\n"
                    f"🎯 Orientace panelů:\n"
                    f"  • Jih (180°) = maximum výroby\n"
                    f"  • Jihovýchod/Jihozápad = dobré\n"
                    f"  • Východ/Západ = nižší výkon\n\n"
                    f"📐 Sklon:\n"
                    f"  • 0° = vodorovně\n"
                    f"  • 30-45° = optimální pro ČR\n"
                    f"  • 90° = svisle\n\n"
                    f"💡 GPS souřadnice jsou automaticky\n"
                    f"   detekovány z Home Assistant"
                ),
            },
        )

    async def async_step_quick_battery(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """🔋 Quick setup - chytré nabíjení."""

        if user_input is not None:
            self.wizard_data.update(user_input)
            self.wizard_step = 4

            if self.wizard_data.get("enable_spot_prices"):
                return await self.async_step_quick_pricing()
            else:
                return await self.async_step_finish()

        # Live preview výpočtu
        min_cap = 20.0
        target_cap = 80.0

        progress = self._get_progress_bar(4, 5)

        return self.async_show_form(
            step_id="quick_battery",
            data_schema=vol.Schema(
                {
                    vol.Optional("battery_min_percent", default=20.0): vol.In(
                        [10.0, 15.0, 20.0, 25.0, 30.0]
                    ),
                    vol.Optional("battery_target_percent", default=80.0): vol.In(
                        [70.0, 75.0, 80.0, 85.0, 90.0]
                    ),
                    vol.Optional("battery_charge_rate", default=2.8): vol.In(
                        [1.5, 2.0, 2.5, 2.8, 3.0, 3.5]
                    ),
                    vol.Optional("battery_max_price", default=10.0): vol.In(
                        [6.0, 8.0, 10.0, 12.0, 15.0]
                    ),
                }
            ),
            description_placeholders={
                "title": f"🔋 Krok 4: Chytré nabíjení\n{progress}",
                "info": (
                    f"═══════════════════════════════════════\n"
                    f"💡 Jak to funguje:\n"
                    f"═══════════════════════════════════════\n\n"
                    f"1️⃣ Baterie klesne pod {min_cap:.0f}%\n"
                    f"   └─ Systém hledá levné hodiny\n\n"
                    f"2️⃣ Vybere nejlevnější off-peak\n"
                    f"   └─ Nikdy nad max. cenu\n\n"
                    f"3️⃣ Nabije zpět na {target_cap:.0f}%\n"
                    f"   └─ Připraveno na další den\n\n"
                    f"📊 Příklad:\n"
                    f"  22:00 - spotová cena 2.50 CZK/kWh ✅\n"
                    f"  02:00 - spotová cena 1.80 CZK/kWh ✅\n"
                    f"  14:00 - spotová cena 8.50 CZK/kWh ❌\n\n"
                    f"💰 Úspora: ~30-50% na nabíjení!\n\n"
                    f"⚠️ Vyžaduje: Spotové ceny z OTE"
                ),
            },
        )

    async def async_step_quick_pricing(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """💰 Quick setup - spotové ceny (simplifikované)."""

        if user_input is not None:
            self.wizard_data.update(user_input)
            self.wizard_step = 5
            return await self.async_step_finish()

        # Live price calculator
        spot = 3.00
        fee = 15.0
        dist = 1.42
        vat = 21.0

        commercial = spot * (1 + fee / 100)
        final = (commercial + dist) * (1 + vat / 100)

        progress = self._get_progress_bar(5, 5)

        return self.async_show_form(
            step_id="quick_pricing",
            data_schema=vol.Schema(
                {
                    vol.Required("pricing_provider"): vol.In(
                        {
                            "nano": "Nano Energies (15% přirážka)",
                            "other_percentage": "Jiný dodavatel - % přirážka",
                            "other_fixed": "Jiný dodavatel - fixní poplatek",
                            "custom": "🔧 Vlastní nastavení (pokročilé)",
                        }
                    ),
                    vol.Optional("distribution_area", default="PRE"): vol.In(
                        {
                            "PRE": "PREdistribuce (Praha)",
                            "CEZ": "ČEZ Distribuce",
                            "EGD": "EG.D (E.ON)",
                        }
                    ),
                }
            ),
            description_placeholders={
                "title": f"💰 Krok 5: Spotové ceny\n{progress}",
                "info": (
                    f"═══════════════════════════════════════\n"
                    f"💡 Live kalkulačka:\n"
                    f"═══════════════════════════════════════\n\n"
                    f"Spotová cena:  {spot:.2f} CZK/kWh\n"
                    f"Obchod +{fee:.0f}%: {commercial - spot:.2f} CZK/kWh\n"
                    f"Distribuce:    {dist:.2f} CZK/kWh\n"
                    f"DPH {vat:.0f}%:        {final - (commercial + dist):.2f} CZK/kWh\n"
                    f"─────────────────────────────────────\n"
                    f"CELKEM:        {final:.2f} CZK/kWh\n\n"
                    f"📊 Porovnání:\n"
                    f"  Nejlevnější noc:  ~3.50 CZK/kWh\n"
                    f"  Nejdražší špička: ~9.00 CZK/kWh\n"
                    f"  Úspora:           ~60%!\n\n"
                    f"💡 Vyberte svého dodavatele nebo\n"
                    f"   použijte vlastní nastavení"
                ),
            },
        )

    async def async_step_finish(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """✅ Finish - vytvoření konfigurace."""

        # Sestavit finální konfiguraci z wizard_data
        final_options = self._build_final_options()

        return self.async_create_entry(
            title="OIG Cloud",
            data={
                CONF_USERNAME: self.wizard_data[CONF_USERNAME],
                CONF_PASSWORD: self.wizard_data[CONF_PASSWORD],
            },
            options=final_options,
        )

    async def async_step_select_modules(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """🔧 Advanced mode - detailní výběr modulů."""

        if user_input is not None:
            self.wizard_data.update(user_input)
            self.wizard_step = 2

            # V advanced módu jdeme na detailní konfiguraci každého modulu
            if user_input.get("enable_solar_forecast"):
                return await self.async_step_advanced_solar()
            elif user_input.get("enable_battery_prediction"):
                return await self.async_step_advanced_battery()
            elif user_input.get("enable_spot_prices"):
                return await self.async_step_advanced_pricing()
            else:
                # Jenom základní moduly - finish
                return await self.async_step_finish()

        progress = self._get_progress_bar(2, 7)

        return self.async_show_form(
            step_id="select_modules",
            data_schema=vol.Schema(
                {
                    vol.Optional("enable_statistics", default=True): bool,
                    vol.Optional("enable_solar_forecast", default=False): bool,
                    vol.Optional("enable_battery_prediction", default=False): bool,
                    vol.Optional("enable_spot_prices", default=True): bool,
                    vol.Optional("enable_extended_sensors", default=True): bool,
                    vol.Optional("enable_extended_battery_sensors", default=True): bool,
                    vol.Optional("enable_extended_fve_sensors", default=True): bool,
                    vol.Optional("enable_extended_grid_sensors", default=True): bool,
                }
            ),
            description_placeholders={
                "title": f"🔧 Krok 2: Pokročilý výběr modulů\n{progress}",
                "info": (
                    "═══════════════════════════════════════\n"
                    "Detailní kontrola všech dostupných funkcí:\n"
                    "═══════════════════════════════════════\n\n"
                    "📊 CORE MODULY:\n"
                    "  • Statistiky - analýzy spotřeby\n"
                    "  • Solární předpověď - forecast.solar API\n"
                    "  • Chytré nabíjení - optimalizace baterie\n"
                    "  • Spotové ceny - OTE real-time ceny\n\n"
                    "⚡ ROZŠÍŘENÉ SENZORY:\n"
                    "  • Baterie - napětí článků, teplota\n"
                    "  • FVE - výkon stringů, proudy\n"
                    "  • Síť - napětí L1/L2/L3, frekvence\n\n"
                    "💡 V dalších krocích nastavíte detaily\n"
                    "   pro každý zapnutý modul"
                ),
            },
        )

    async def async_step_advanced_solar(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """☀️ Advanced mode - detailní nastavení solární předpovědi."""

        if user_input is not None:
            self.wizard_data.update(user_input)
            self.wizard_step = 3

            # Pokračovat na další modul
            if self.wizard_data.get("enable_battery_prediction"):
                return await self.async_step_advanced_battery()
            elif self.wizard_data.get("enable_spot_prices"):
                return await self.async_step_advanced_pricing()
            else:
                return await self.async_step_finish()

        # Auto-detect
        lat = self.hass.config.latitude or 50.1219800
        lon = self.hass.config.longitude or 13.9373742
        default_kwp = await self._detect_fve_power()

        progress = self._get_progress_bar(3, 7)

        return self.async_show_form(
            step_id="advanced_solar",
            data_schema=vol.Schema(
                {
                    vol.Required("solar_latitude", default=lat): vol.Coerce(float),
                    vol.Required("solar_longitude", default=lon): vol.Coerce(float),
                    vol.Optional("solar_api_key", default=""): str,
                    vol.Required("solar_mode", default="daily_optimized"): vol.In(
                        {
                            "manual": "🔧 Pouze na vyžádání",
                            "daily": "Jednou denně (6:00)",
                            "daily_optimized": "3x denně (6:00, 12:00, 16:00) - DOPORUČENO",
                        }
                    ),
                    # String 1
                    vol.Optional("string1_enabled", default=True): bool,
                    vol.Optional("string1_kwp", default=default_kwp): vol.Coerce(float),
                    vol.Optional("string1_declination", default=30): vol.All(
                        vol.Coerce(int), vol.Range(min=0, max=90)
                    ),
                    vol.Optional("string1_azimuth", default=180): vol.All(
                        vol.Coerce(int), vol.Range(min=0, max=360)
                    ),
                    # String 2 (optional)
                    vol.Optional("string2_enabled", default=False): bool,
                    vol.Optional("string2_kwp", default=default_kwp): vol.Coerce(float),
                    vol.Optional("string2_declination", default=30): vol.All(
                        vol.Coerce(int), vol.Range(min=0, max=90)
                    ),
                    vol.Optional("string2_azimuth", default=180): vol.All(
                        vol.Coerce(int), vol.Range(min=0, max=360)
                    ),
                }
            ),
            description_placeholders={
                "title": f"☀️ Krok 3: Solární předpověď (pokročilé)\n{progress}",
                "info": (
                    f"═══════════════════════════════════════\n"
                    f"📍 Detekováno: GPS {lat:.4f}, {lon:.4f}\n"
                    f"⚡ Detekováno: {default_kwp} kWp celkem\n"
                    f"═══════════════════════════════════════\n\n"
                    f"🔑 API KLÍČ (volitelné):\n"
                    f"  • Bez klíče: omezení forecast.solar\n"
                    f"  • S klíčem: častější aktualizace možné\n"
                    f"  • Získat: https://forecast.solar\n\n"
                    f"📐 STRING KONFIGURACE:\n"
                    f"  • Sklon: 0° = vodorovně, 90° = svisle\n"
                    f"  • Azimut: 0° = sever, 180° = jih\n"
                    f"  • String 2: zapněte pro split systém\n\n"
                    f"💡 Většina uživatelů má 1 string (jih, 30-45°)"
                ),
            },
        )

    async def async_step_advanced_battery(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """🔋 Advanced mode - detailní nastavení chytrého nabíjení."""

        if user_input is not None:
            self.wizard_data.update(user_input)
            self.wizard_step = 4

            if self.wizard_data.get("enable_spot_prices"):
                return await self.async_step_advanced_pricing()
            else:
                return await self.async_step_finish()

        progress = self._get_progress_bar(4, 7)

        schema_fields: Dict[str, Any] = {
            vol.Optional("battery_min_percent", default=20.0): vol.All(
                vol.Coerce(float), vol.Range(min=5.0, max=50.0)
            ),
            vol.Optional("battery_target_percent", default=80.0): vol.All(
                vol.Coerce(float), vol.Range(min=50.0, max=100.0)
            ),
            vol.Optional("battery_charge_rate", default=2.8): vol.All(
                vol.Coerce(float), vol.Range(min=0.5, max=10.0)
            ),
            vol.Optional("battery_max_price", default=10.0): vol.All(
                vol.Coerce(float), vol.Range(min=1.0, max=50.0)
            ),
            vol.Optional("battery_percentile", default=75.0): vol.All(
                vol.Coerce(float), vol.Range(min=50.0, max=95.0)
            ),
        }

        return self.async_show_form(
            step_id="advanced_battery",
            data_schema=vol.Schema(schema_fields),
            description_placeholders={
                "title": f"🔋 Krok 4: Chytré nabíjení (pokročilé)\n{progress}",
                "info": (
                    "═══════════════════════════════════════\n"
                    "POKROČILÁ OPTIMALIZACE NABÍJENÍ:\n"
                    "═══════════════════════════════════════\n\n"
                    "📉 Minimální kapacita (%):\n"
                    "  Pod touto úrovní začne nabíjet\n"
                    "  Doporučeno: 15-25%\n\n"
                    "🎯 Cílová kapacita (%):\n"
                    "  Cílová úroveň pro nabití\n"
                    "  Doporučeno: 70-90%\n\n"
                    "⚡ Nabíjecí výkon (kW):\n"
                    "  Max. výkon vašeho systému ze sítě\n"
                    "  Zjistěte z dokumentace invertru\n\n"
                    "💰 Max. cena (CZK/kWh):\n"
                    "  Nikdy nenabíjet dráž\n"
                    "  Doporučeno: 8-12 CZK/kWh\n\n"
                    "📊 Percentil špičky (%):\n"
                    "  Ceny nad tímto = špička\n"
                    "  Doporučeno: 75-85%"
                ),
            },
        )

    async def async_step_advanced_pricing(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """💰 Advanced mode - detailní nastavení spotových cen."""

        if user_input is not None:
            self.wizard_data.update(user_input)
            self.wizard_step = 5

            # Podle výběru modelu jít na detaily
            pricing_model = user_input.get("pricing_model", "percentage")
            if pricing_model == "custom":
                return await self.async_step_advanced_pricing_custom()
            else:
                return await self.async_step_finish()

        progress = self._get_progress_bar(5, 7)

        return self.async_show_form(
            step_id="advanced_pricing",
            data_schema=vol.Schema(
                {
                    vol.Required("pricing_model", default="percentage"): vol.In(
                        {
                            "percentage": "% Procentní přirážka (doporučeno)",
                            "fixed": "💵 Fixní poplatek v CZK/MWh",
                            "fixed_prices": "🔒 Fixní ceny VT/NT (ignoruje spot)",
                            "custom": "🔧 Vlastní kombinace",
                        }
                    ),
                    vol.Optional("distribution_area", default="PRE"): vol.In(
                        {
                            "PRE": "PREdistribuce (Praha)",
                            "CEZ": "ČEZ Distribuce",
                            "EGD": "EG.D (E.ON)",
                        }
                    ),
                    vol.Optional("dual_tariff", default=True): bool,
                }
            ),
            description_placeholders={
                "title": f"💰 Krok 5: Spotové ceny (pokročilé)\n{progress}",
                "info": (
                    "═══════════════════════════════════════\n"
                    "MODELY VÝPOČTU CEN:\n"
                    "═══════════════════════════════════════\n\n"
                    "% PROCENTNÍ (nejčastější):\n"
                    "  Vzorec: spot × (1 + přirážka%)\n"
                    "  Příklad: Nano Energies 15%\n"
                    "  ✅ Automaticky sleduje spot ceny\n\n"
                    "💵 FIXNÍ POPLATEK:\n"
                    "  Vzorec: spot + poplatek CZK/MWh\n"
                    "  Jednodušší, méně flexibilní\n\n"
                    "🔒 FIXNÍ CENY:\n"
                    "  Ignoruje spotové ceny\n"
                    "  Pro klasické fixní smlouvy\n\n"
                    "🔧 VLASTNÍ:\n"
                    "  Kombinace více modelů\n"
                    "  Pro komplexní smlouvy\n\n"
                    "🔌 DISTRIBUCE:\n"
                    "  Vyberte svého distributora\n"
                    "  Automaticky načte poplatky\n\n"
                    "⏰ DVOUTARIF:\n"
                    "  VT/NT pásma (vyžaduje d25, d35...)\n"
                    "  Nebo jednotná sazba 24/7"
                ),
            },
        )

    async def async_step_advanced_pricing_custom(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """💰 Advanced - vlastní kombinace pricing modelů."""

        if user_input is not None:
            self.wizard_data.update(user_input)
            self.wizard_step = 6
            return await self.async_step_finish()

        progress = self._get_progress_bar(6, 7)

        return self.async_show_form(
            step_id="advanced_pricing_custom",
            data_schema=vol.Schema(
                {
                    # Import pricing
                    vol.Optional("spot_positive_fee_percent", default=15.0): vol.All(
                        vol.Coerce(float), vol.Range(min=0.1, max=100.0)
                    ),
                    vol.Optional("spot_negative_fee_percent", default=9.0): vol.All(
                        vol.Coerce(float), vol.Range(min=0.1, max=100.0)
                    ),
                    # Export pricing
                    vol.Optional("export_fee_percent", default=15.0): vol.All(
                        vol.Coerce(float), vol.Range(min=0.0, max=100.0)
                    ),
                    # Distribution
                    vol.Optional("distribution_fee_vt", default=1.42): vol.All(
                        vol.Coerce(float), vol.Range(min=0.0)
                    ),
                    vol.Optional("distribution_fee_nt", default=0.91): vol.All(
                        vol.Coerce(float), vol.Range(min=0.0)
                    ),
                    vol.Optional("vat_rate", default=21.0): vol.All(
                        vol.Coerce(float), vol.Range(min=0.0, max=50.0)
                    ),
                }
            ),
            description_placeholders={
                "title": f"💰 Krok 6: Vlastní pricing model\n{progress}",
                "info": (
                    "═══════════════════════════════════════\n"
                    "VLASTNÍ NASTAVENÍ CEN:\n"
                    "═══════════════════════════════════════\n\n"
                    "📥 NÁKUP (import ze sítě):\n"
                    "  • Přirážka při kladné ceně (%)\n"
                    "  • Přirážka při záporné ceně (%)\n\n"
                    "📤 PRODEJ (export do sítě):\n"
                    "  • Srážka za prodej (%)\n\n"
                    "🔌 DISTRIBUCE (bez DPH):\n"
                    "  • VT tarif (CZK/kWh)\n"
                    "  • NT tarif (CZK/kWh)\n\n"
                    "💰 DPH:\n"
                    "  • Aktuální sazba (%)\n\n"
                    "💡 TIP:\n"
                    "  Všechny ceny zadávejte BEZ DPH\n"
                    "  DPH se připočítá automaticky"
                ),
            },
        )

    async def async_step_import_config(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """📥 Import ze stávající konfigurace."""

        if user_input is not None:
            config_file = user_input.get("config_file", "")

            if config_file:
                # TODO: Načíst a parsovat konfiguraci
                # Pro teď jen placeholder
                return self.async_abort(
                    reason="import_not_implemented",
                    description_placeholders={
                        "info": "Import konfigurace bude dostupný v příští verzi."
                    },
                )
            else:
                # Žádný soubor - skip
                return await self.async_step_finish()

        return self.async_show_form(
            step_id="import_config",
            data_schema=vol.Schema(
                {
                    vol.Optional("config_file", default=""): str,
                }
            ),
            description_placeholders={
                "title": "📥 Import konfigurace",
                "info": (
                    "═══════════════════════════════════════\n"
                    "IMPORT STÁVAJÍCÍ KONFIGURACE:\n"
                    "═══════════════════════════════════════\n\n"
                    "📁 Podporované formáty:\n"
                    "  • YAML (.yaml, .yml)\n"
                    "  • JSON (.json)\n\n"
                    "💡 Kde najít konfiguraci?\n"
                    "  1. Nastavení → Zařízení & služby\n"
                    "  2. OIG Cloud → Možnosti\n"
                    "  3. Export konfigurace\n\n"
                    "⚠️ POZOR:\n"
                    "  Import přepíše všechna nastavení!\n"
                    "  Doporučujeme zálohovat.\n\n"
                    "📝 Zadejte cestu k souboru:\n"
                    "  Příklad: /config/oig_cloud.yaml\n\n"
                    "🔧 Nebo nechte prázdné pro ruční setup"
                ),
            },
        )

    def _build_final_options(self) -> Dict[str, Any]:
        """Sestaví finální options z wizard_data."""
        options: Dict[str, Any] = {
            "standard_scan_interval": 30,
            "extended_scan_interval": 300,
        }

        # Statistics
        if self.wizard_data.get("enable_statistics", True):
            options["enable_statistics"] = True

        # Solar forecast - QUICK MODE
        if self.wizard_data.get("enable_solar_forecast") and self.quick_setup:
            options.update(
                {
                    "enable_solar_forecast": True,
                    "solar_forecast_latitude": self.wizard_data.get("solar_latitude"),
                    "solar_forecast_longitude": self.wizard_data.get("solar_longitude"),
                    "solar_forecast_string1_enabled": True,
                    "solar_forecast_string1_kwp": self.wizard_data.get(
                        "solar_kwp", 5.4
                    ),
                    "solar_forecast_string1_declination": self.wizard_data.get(
                        "solar_declination", 10
                    ),
                    "solar_forecast_string1_azimuth": self.wizard_data.get(
                        "solar_azimuth", 180
                    ),
                    "solar_forecast_mode": "daily_optimized",
                }
            )

        # Solar forecast - ADVANCED MODE
        if self.wizard_data.get("enable_solar_forecast") and not self.quick_setup:
            options.update(
                {
                    "enable_solar_forecast": True,
                    "solar_forecast_latitude": self.wizard_data.get("solar_latitude"),
                    "solar_forecast_longitude": self.wizard_data.get("solar_longitude"),
                    "solar_forecast_api_key": self.wizard_data.get("solar_api_key", ""),
                    "solar_forecast_mode": self.wizard_data.get(
                        "solar_mode", "daily_optimized"
                    ),
                    "solar_forecast_string1_enabled": self.wizard_data.get(
                        "string1_enabled", True
                    ),
                    "solar_forecast_string1_kwp": self.wizard_data.get(
                        "string1_kwp", 5.4
                    ),
                    "solar_forecast_string1_declination": self.wizard_data.get(
                        "string1_declination", 30
                    ),
                    "solar_forecast_string1_azimuth": self.wizard_data.get(
                        "string1_azimuth", 180
                    ),
                    "solar_forecast_string2_enabled": self.wizard_data.get(
                        "string2_enabled", False
                    ),
                    "solar_forecast_string2_kwp": self.wizard_data.get(
                        "string2_kwp", 5.4
                    ),
                    "solar_forecast_string2_declination": self.wizard_data.get(
                        "string2_declination", 30
                    ),
                    "solar_forecast_string2_azimuth": self.wizard_data.get(
                        "string2_azimuth", 180
                    ),
                }
            )

        # Battery prediction - QUICK MODE
        if self.wizard_data.get("enable_battery_prediction") and self.quick_setup:
            options.update(
                {
                    "enable_battery_prediction": True,
                    "min_capacity_percent": self.wizard_data.get(
                        "battery_min_percent", 20.0
                    ),
                    "target_capacity_percent": self.wizard_data.get(
                        "battery_target_percent", 80.0
                    ),
                    "home_charge_rate": self.wizard_data.get(
                        "battery_charge_rate", 2.8
                    ),
                    "max_price_conf": self.wizard_data.get("battery_max_price", 10.0),
                    "percentile_conf": 75.0,
                }
            )

        # Battery prediction - ADVANCED MODE
        if self.wizard_data.get("enable_battery_prediction") and not self.quick_setup:
            options.update(
                {
                    "enable_battery_prediction": True,
                    "min_capacity_percent": self.wizard_data.get(
                        "battery_min_percent", 20.0
                    ),
                    "target_capacity_percent": self.wizard_data.get(
                        "battery_target_percent", 80.0
                    ),
                    "home_charge_rate": self.wizard_data.get(
                        "battery_charge_rate", 2.8
                    ),
                    "max_price_conf": self.wizard_data.get("battery_max_price", 10.0),
                    "percentile_conf": self.wizard_data.get("battery_percentile", 75.0),
                }
            )

        # Spot prices - QUICK MODE
        if self.wizard_data.get("enable_spot_prices") and self.quick_setup:
            provider = self.wizard_data.get("pricing_provider", "nano")
            options["enable_spot_prices"] = True

            if provider == "nano":
                options.update(
                    {
                        "spot_pricing_model": "percentage",
                        "spot_positive_fee_percent": 15.0,
                        "spot_negative_fee_percent": 9.0,
                        "distribution_area": self.wizard_data.get(
                            "distribution_area", "PRE"
                        ),
                        "dual_tariff_enabled": True,
                        "distribution_fee_vt_kwh": 1.42,
                        "distribution_fee_nt_kwh": 0.91,
                        "vat_rate": 21.0,
                    }
                )
            elif provider == "other_percentage":
                options.update(
                    {
                        "spot_pricing_model": "percentage",
                        "spot_positive_fee_percent": 15.0,
                        "spot_negative_fee_percent": 9.0,
                    }
                )
            elif provider == "other_fixed":
                options.update(
                    {
                        "spot_pricing_model": "fixed",
                        "spot_fixed_fee_mwh": 500.0,
                    }
                )

        # Spot prices - ADVANCED MODE
        if self.wizard_data.get("enable_spot_prices") and not self.quick_setup:
            pricing_model = self.wizard_data.get("pricing_model", "percentage")
            options["enable_spot_prices"] = True

            if pricing_model == "percentage":
                options.update(
                    {
                        "spot_pricing_model": "percentage",
                        "spot_positive_fee_percent": self.wizard_data.get(
                            "spot_positive_fee_percent", 15.0
                        ),
                        "spot_negative_fee_percent": self.wizard_data.get(
                            "spot_negative_fee_percent", 9.0
                        ),
                    }
                )
            elif pricing_model == "fixed":
                options.update(
                    {
                        "spot_pricing_model": "fixed",
                        "spot_fixed_fee_mwh": 500.0,
                    }
                )
            elif pricing_model == "fixed_prices":
                options.update(
                    {
                        "spot_pricing_model": "fixed_prices",
                        "fixed_commercial_price_vt": 4.50,
                        "fixed_commercial_price_nt": 3.20,
                    }
                )
            elif pricing_model == "custom":
                options.update(
                    {
                        "spot_pricing_model": "percentage",
                        "spot_positive_fee_percent": self.wizard_data.get(
                            "spot_positive_fee_percent", 15.0
                        ),
                        "spot_negative_fee_percent": self.wizard_data.get(
                            "spot_negative_fee_percent", 9.0
                        ),
                        "export_pricing_model": "percentage",
                        "export_fee_percent": self.wizard_data.get(
                            "export_fee_percent", 15.0
                        ),
                        "distribution_fee_vt_kwh": self.wizard_data.get(
                            "distribution_fee_vt", 1.42
                        ),
                        "distribution_fee_nt_kwh": self.wizard_data.get(
                            "distribution_fee_nt", 0.91
                        ),
                        "vat_rate": self.wizard_data.get("vat_rate", 21.0),
                    }
                )

            # Distribuce a tarify pro všechny modely
            options.update(
                {
                    "distribution_area": self.wizard_data.get(
                        "distribution_area", "PRE"
                    ),
                    "dual_tariff_enabled": self.wizard_data.get("dual_tariff", True),
                }
            )

        # Extended sensors
        if self.wizard_data.get("enable_extended_sensors", True):
            options.update(
                {
                    "enable_extended_sensors": True,
                    "enable_extended_battery_sensors": self.wizard_data.get(
                        "enable_extended_battery_sensors", True
                    ),
                    "enable_extended_fve_sensors": self.wizard_data.get(
                        "enable_extended_fve_sensors", True
                    ),
                    "enable_extended_grid_sensors": self.wizard_data.get(
                        "enable_extended_grid_sensors", True
                    ),
                }
            )

        return options

    def _get_progress_bar(self, current: int, total: int) -> str:
        """Vytvoří textový progress bar."""
        filled = "█" * current
        empty = "░" * (total - current)
        percent = int((current / total) * 100)
        return f"[{filled}{empty}] {percent}% ({current}/{total})"

    async def _detect_fve_power(self) -> float:
        """Auto-detect FVE výkonu ze senzoru."""
        try:
            registry = er.async_get(self.hass)
            for entity in registry.entities.values():
                if entity.entity_id.endswith("installed_fve_power_wp"):
                    state = self.hass.states.get(entity.entity_id)
                    if state and state.state not in ("unknown", "unavailable"):
                        return round(float(state.state) / 1000, 1)
        except Exception:
            pass
        return 5.4  # Default
