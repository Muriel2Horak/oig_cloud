/**
 * OIG Cloud V2 — Field label / hint catalog.
 *
 * The backend `/config_registry` endpoint emits `field.<key>.label` and
 * `field.<key>.hint` keys verbatim (see `config_registry.py:32-36` and
 * `registry_as_api_dict:102-103`). No translation file defines any
 * `field.*` key — and rendering the raw key would print
 * `field.charge_rate_kw.label` on screen.
 *
 * Catalog seeded by transcribing the existing Czech copy from
 * `src/ui/features/settings/index.ts:62-145` (MODULE_FIELDS, BATTERY_FIELDS,
 * SOLAR_FIELDS, BOILER_FIELDS_ALL) — no new copywriting, no lost hints.
 * `fieldLabel()` / `fieldHint()` never return a raw i18n key; missing
 * entries fall back to a humanised form of the key.
 */

const CS_LABELS: Record<string, string> = {
  // --- MODULE_FIELDS (settings/index.ts:63-69) ---
  'field.enable_battery_prediction.label': 'Predikce baterie a plánovač',
  'field.enable_solar_forecast.label': 'Solární předpověď',
  'field.enable_pricing.label': 'Ceny energie',
  'field.enable_boiler.label': 'Bojler',
  'field.enable_statistics.label': 'Statistiky',
  'field.enable_extended_sensors.label': 'Rozšířené senzory',
  'field.enable_chmu_warnings.label': 'Výstrahy ČHMÚ',

  // --- BATTERY_FIELDS (settings/index.ts:73-80) ---
  'field.auto_mode_switch_enabled.label': 'Automatické přepínání režimů',
  'field.charge_rate_kw.label': 'Nabíjecí výkon ze sítě (kW)',
  'field.expensive_percentile.label': 'Práh drahých hodin (%)',
  'field.battery_comfort_soc_percent.label': 'Komfortní rezerva baterie (%)',
  'field.balancing_enabled.label': 'Balancování článků',
  'field.balancing_interval_days.label': 'Interval balancování (dny)',
  'field.balancing_hold_hours.label': 'Držení 100 % (hodiny)',
  'field.cheap_window_percentile.label': 'Levné okno pro balancování (%)',

  // --- SOLAR_FIELDS (settings/index.ts:84-96) ---
  'field.solar_forecast_provider.label': 'Poskytovatel',
  'field.solcast_site_id.label': 'Solcast site ID',
  'field.solcast_api_key.label': 'Solcast API klíč',
  'field.solar_forecast_latitude.label': 'Zeměpisná šířka',
  'field.solar_forecast_longitude.label': 'Zeměpisná délka',
  'field.solar_forecast_string1_enabled.label': 'String 1 aktivní',
  'field.solar_forecast_string1_kwp.label': 'String 1 výkon (kWp)',
  'field.solar_forecast_string1_declination.label': 'String 1 sklon (°)',
  'field.solar_forecast_string1_azimuth.label': 'String 1 azimut (°)',
  'field.solar_forecast_string2_enabled.label': 'String 2 aktivní',
  'field.solar_forecast_string2_kwp.label': 'String 2 výkon (kWp)',
  'field.solar_forecast_string2_declination.label': 'String 2 sklon (°)',
  'field.solar_forecast_string2_azimuth.label': 'String 2 azimut (°)',

  // --- BOILER_FIELDS_ALL (settings/index.ts:114-144) ---
  'field.boiler_volume_l.label': 'Objem nádrže (l)',
  'field.boiler_temp_sensor_top.label': 'Čidlo teploty — vrchní',
  'field.boiler_temp_sensor_bottom.label': 'Čidlo teploty — spodní',
  'field.boiler_enable_second_thermometer.label': 'Druhý teploměr aktivní',
  'field.boiler_current_power_entity.label': 'Senzor příkonu bojleru',
  'field.boiler_target_temp_c.label': 'Cílová teplota (°C)',
  'field.boiler_deadline_time.label': 'Deadline (HH:MM)',
  'field.boiler_thermal_arbitrage_enabled.label': '💰 Tepelná arbitráž',
  'field.boiler_max_temp_c.label': 'Strop arbitráže (°C)',
  'field.boiler_alt_power_kw.label': 'Výkon alt. zdroje (kW)',
  'field.boiler_has_alternative_heating.label': 'Alternativní zdroj tepla',
  'field.boiler_alt_source_type.label': 'Typ alternativního zdroje',
  'field.boiler_alt_cost_kwh.label': 'Cena tepla (Kč/kWh)',
  'field.boiler_alt_energy_sensor.label': 'Senzor energie alt. zdroje',
  'field.boiler_alt_energy_daily.label': 'Denní přírůstek energie',
  'field.box_has_home56.label': 'Box má Home 5/6',
  'field.boiler_home5_maneuver_enabled.label': '🔋→🔥 Ohřev z baterie',
  'field.boiler_battery_cycle_cost_czk_kwh.label': 'Cena cyklu baterie (Kč/kWh)',
  'field.boiler_circulation_enabled.label': 'Cirkulace teplé vody',
  'field.boiler_circulation_lead_minutes.label': 'Předstih cirkulace (min)',
  'field.boiler_circulation_run_minutes.label': 'Délka běhu cirkulace (min)',
  'field.boiler_circulation_max_runs_per_day.label': 'Max. počet běhů/den',
  'field.boiler_circulation_min_gap_minutes.label': 'Min. pauza mezi běhy (min)',
  'field.boiler_legionella_interval_days.label': 'Interval ochrany (dny)',
  'field.boiler_legionella_target_temp_c.label': 'Teplota dezinfekce (°C)',

  // NEW (U2 — no live copy exists, these two were never rendered):
  'field.solar_forecast_api_key.label': 'forecast.solar API klíč',
  'field.solar_forecast_mode.label': 'Frekvence aktualizace',
};

const CS_HINTS: Record<string, string> = {
  // --- MODULE_FIELDS hints ---
  'field.enable_battery_prediction.hint': 'Ekonomické plánování nabíjení, timeline, úspory',
  'field.enable_solar_forecast.hint': 'Předpověď výroby FVE (forecast.solar / Solcast)',
  'field.enable_pricing.hint': 'Spotové ceny OTE, výkup, distribuce',
  'field.enable_boiler.hint': 'Inteligentní ohřev vody',

  // --- BATTERY_FIELDS hints ---
  'field.auto_mode_switch_enabled.hint': 'Plánovač sám přepíná Home 1 / Home UPS podle plánu',
  'field.charge_rate_kw.hint': 'Kolik kW box bere při nabíjení ze sítě (UPS)',
  'field.expensive_percentile.hint': 'Importy nad tímto denním percentilem cen se plánovač snaží pokrýt levným přednabitím. Výchozí 70 %.',
  'field.battery_comfort_soc_percent.hint': 'Baterku drží nad touto úrovní, ale jen dobíjením v nejlevnějších oknech — aby ji box sám nenatáhl na 80 % za jakoukoli cenu. 0 = vypnuto. Výchozí 50 %.',
  'field.balancing_enabled.hint': 'Pravidelné nabití na 100 % kvůli vyrovnání článků',
  'field.cheap_window_percentile.hint': 'Balancování se plánuje do hodin pod tímto cenovým percentilem',

  // --- SOLAR_FIELDS hints ---
  'field.solcast_site_id.hint': 'Jen pro Solcast (z rooftop site URL)',
  'field.solcast_api_key.hint': 'Nech prázdné = beze změny',
  'field.solar_forecast_string1_azimuth.hint': '0 = jih, −90 = východ, 90 = západ',

  // --- BOILER_FIELDS_ALL hints ---
  'field.boiler_volume_l.hint': 'Jmenovitý objem zásobníku v litrech',
  'field.boiler_temp_sensor_top.hint': 'ID entity senzoru teploty (např. sensor.bojler_top)',
  'field.boiler_temp_sensor_bottom.hint': 'Jen pokud máš druhý teploměr (ID entity senzoru)',
  'field.boiler_enable_second_thermometer.hint': 'Zapni, pokud máš spodní čidlo teploty',
  'field.boiler_current_power_entity.hint': 'ID entity senzoru výkonu (W); upřesňuje plánovač',
  'field.boiler_target_temp_c.hint': 'Požadovaná teplota vody před deadline',
  'field.boiler_deadline_time.hint': 'Čas, do kdy musí být voda nahřátá (formát HH:MM, např. 07:00)',
  'field.boiler_thermal_arbitrage_enabled.hint': 'Přetápět levným proudem (spot pod cenou alt. zdroje) a podržet; rezerva na přetok FVE',
  'field.boiler_max_temp_c.hint': 'Kam až smí arbitráž dotopit nad cílovou teplotu',
  'field.boiler_alt_power_kw.hint': 'Tepelný výkon alt. zdroje do nádrže; 0 = neznámý',
  'field.boiler_has_alternative_heating.hint': 'Bojler má jiný zdroj ohřevu (plyn, TČ, krb…)',
  'field.boiler_alt_cost_kwh.hint': 'Cena tepla z alternativního zdroje v Kč/kWh',
  'field.boiler_alt_energy_sensor.hint': 'ID entity senzoru energie (kWh)',
  'field.boiler_alt_energy_daily.hint': 'Zapni, pokud senzor měří denní (ne celkový) přírůstek',
  'field.box_has_home56.hint': 'Aktivuje Home 5/6 (OIG CBB) — umožňuje 🔋→🔥 ohřev z baterie',
  'field.boiler_home5_maneuver_enabled.hint': 'Plánovač může použít baterii k ohřevu (vyžaduje Home 5/6)',
  'field.boiler_battery_cycle_cost_czk_kwh.hint': 'Degradace baterie za kWh; plánovač porovná s cenou sítě',
  'field.boiler_circulation_enabled.hint': 'Zapnutí cirkulačního čerpadla TUV',
  'field.boiler_circulation_lead_minutes.hint': 'Jak dlouho před odběrem pustit čerpadlo',
  'field.boiler_legionella_interval_days.hint': '0 = vypnuto; doporučeno 7–14 dní',
  'field.boiler_legionella_target_temp_c.hint': 'Min. 60 °C pro spolehlivé usmrcení legionelly',

  // NEW (U2 — no live copy exists):
  'field.solar_forecast_mode.hint': 'Hodinově a po 4 h vyžaduje API klíč forecast.solar',
};

/** Falls back to a humanised key — never returns a raw i18n key. */
export function fieldLabel(key: string, i18nKey: string): string {
  return CS_LABELS[i18nKey] ?? key.replace(/_/g, ' ');
}

/** Returns undefined when no hint entry exists (UI treats undefined as "no hint"). */
export function fieldHint(_key: string, i18nKey: string): string | undefined {
  return CS_HINTS[i18nKey];
}
