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

  // RCA-R1 (2026-07-25) — 5 pricing fields, UX-SPEC-wizard-v2.md §step-4 table:
  'field.confirmed_distribution_distributor.label': 'Distributor',
  'field.confirmed_distribution_tariff.label': 'Sazba (tarif)',
  'field.confirmed_distribution_price_incl_vat.label': 'Cena s DPH',
  'field.confirmed_distribution_price_excl_vat.label': 'Cena bez DPH',
  'field.confirmed_distribution_unit.label': 'Jednotka',
  // RCA-R1 (2026-07-25) — 2 battery fields, UX-SPEC-wizard-v2.md §step-6 table:
  'field.balancing_opportunistic_threshold.label': 'Oportunní práh balancování (%)',
  'field.balancing_economic_threshold.label': 'Ekonomický práh balancování (%)',

  // --- pricing_supplier (F1 U4 R3 — RCA-R3 restoration, UX-SPEC-wizard-v2.md §4) ---
  'field.spot_pricing_model.label': 'Scénář nákupní ceny',
  'field.spot_positive_fee_percent.label': 'Přirážka při kladné spotové ceně, VT (%)',
  'field.spot_positive_fee_percent_nt.label': 'Přirážka při kladné spotové ceně, NT (%)',
  'field.spot_negative_fee_percent.label': 'Přirážka při záporné spotové ceně, VT (%)',
  'field.spot_negative_fee_percent_nt.label': 'Přirážka při záporné spotové ceně, NT (%)',
  'field.spot_fixed_fee_mwh.label': 'Fixní poplatek, VT (CZK/MWh)',
  'field.spot_fixed_fee_mwh_nt.label': 'Fixní poplatek, NT (CZK/MWh)',
  'field.fixed_commercial_price_vt.label': 'Fixní nákupní cena VT (CZK/kWh)',
  'field.fixed_commercial_price_nt.label': 'Fixní nákupní cena NT (CZK/kWh)',
  'field.export_pricing_model.label': 'Scénář prodejní ceny',
  'field.export_fee_percent.label': 'Srážka z exportu, VT (%)',
  'field.export_fee_percent_nt.label': 'Srážka z exportu, NT (%)',
  'field.export_fixed_fee_czk.label': 'Fixní srážka exportu, VT (CZK/kWh)',
  'field.export_fixed_fee_czk_nt.label': 'Fixní srážka exportu, NT (CZK/kWh)',
  'field.export_fixed_price.label': 'Fixní výkupní cena (CZK/kWh)',
  'field.distribution_fee_vt_kwh.label': 'Poplatek za distribuci VT (CZK/kWh)',
  'field.distribution_fee_nt_kwh.label': 'Poplatek za distribuci NT (CZK/kWh)',
  'field.vat_rate.label': 'DPH (%)',
  'field.tariff_vt_start_weekday.label': 'VT začátek, pracovní den (hodina)',
  'field.tariff_nt_start_weekday.label': 'NT začátek, pracovní den (hodina1,hodina2)',
  'field.tariff_weekend_same_as_weekday.label': 'Víkend stejně jako pracovní dny',
  'field.tariff_vt_start_weekend.label': 'VT začátek, víkend (hodina)',
  'field.tariff_nt_start_weekend.label': 'NT začátek, víkend (hodina1,hodina2)',
  'field.dual_tariff_enabled.label': 'Dvoutarifní sazba (odvozeno automaticky)',

  // NT/VT schedule grid (owner live-walk UX rev, item 4) — synthetic diff-row
  // keys `summaryDiffRows()` emits in place of the raw 4 start-hour keys,
  // step-9's "Pole" column.
  'field.tariff_schedule_weekday.label': 'Rozvrh NT/VT — pracovní dny',
  'field.tariff_schedule_weekend.label': 'Rozvrh NT/VT — víkend',

  // --- connection / 'basic' section (Task 20, UX-SPEC §Step 8) — copy
  // adapted from cs.json's wizard_intervals (translations/cs.json:200-208),
  // this FE step reads CS_LABELS, not that HA-native translation layer.
  'field.data_source_mode.label': 'Zdroj telemetrie',
  'field.standard_scan_interval.label': 'Základní data (sekund)',
  'field.extended_scan_interval.label': 'Rozšířená data (sekund)',
  'field.local_proxy_stale_minutes.label': 'Fallback na cloud po (minut)',
  'field.local_event_debounce_ms.label': 'Local event debounce (ms)',
  'field.enable_dashboard.label': '📊 Webový dashboard s grafy',

  // --- 'ai' section (Task 23 gap fill — copy transcribed from strings.json's
  // options-flow AI step, translations/cs.json:782-784) ---
  'field.ai_provider.label': 'Poskytovatel AI',
  'field.ai_base_url.label': 'Base URL API',
  'field.ai_model.label': 'Model',

  // --- Simulator overlay (F1) ---
  'simulator.card.settings.label': 'Nastavení, které simulace používá',
  'simulator.card.readonly.label': 'Z boxu (jen pro čtení)',
  'simulator.common.unavailable.label': 'nedostupné',
  'simulator.common.retry.label': 'Zkusit znovu',
  'simulator.kpi.day_cost.label': 'Náklad dne',
  'simulator.kpi.base_cost.label': 'Bez plánovače',
  'simulator.kpi.savings.label': 'Úspora',
  'simulator.kpi.ups_hours.label': 'Hodin v UPS',
  'simulator.kpi.energy_today.label': 'Energie dne',
  'simulator.kpi.solar_share.label': 'Ze slunce',
  'simulator.chart.mode.label': 'Plán režimů',
  'simulator.chart.soc.label': 'Stav baterie',
  'simulator.chart.price.label': 'Spotová cena',
  'simulator.chart.heating_windows.label': 'Okna ohřevu',
  'simulator.chart.water_temp.label': 'Teplota vody',
  'simulator.chart.draw.label': 'Odběr teplé vody',
  'simulator.battery.charge_rate_kw.label': 'Nabíjecí výkon ze sítě',
  'simulator.battery.reserve.label': 'Komfortní rezerva',
  'simulator.battery.expensive_percentile.label': 'Práh drahých hodin',
  'simulator.boiler.target_temp_c.label': 'Cílová teplota',
  'simulator.boiler.min_temp_c.label': 'Minimální teplota',
  'simulator.box.capacity_kwh.label': 'Kapacita baterie',
  'simulator.box.hw_min_soc_percent.label': 'Minimální SoC (HW)',
  'simulator.box.top_temp_c.label': 'Teplota nahoře',
  'simulator.box.bottom_temp_c.label': 'Teplota dole',
  'simulator.box.cold_inlet_c.label': 'Studená voda na vstupu',
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

  // RCA-R1 (2026-07-25) — pricing + battery hints, UX-SPEC-wizard-v2.md §step-4/§step-6:
  'field.confirmed_distribution_distributor.hint': 'Vyberte svého distributora elektřiny (ČEZ, EG.D, PRE)',
  'field.confirmed_distribution_tariff.hint': 'Vaše distribuční sazba dle smlouvy s distributorem',
  'field.confirmed_distribution_price_incl_vat.hint': 'Doplněno automaticky z ceníku distributora',
  'field.confirmed_distribution_price_excl_vat.hint': 'Doplněno automaticky z ceníku distributora',
  'field.confirmed_distribution_unit.hint': 'Doplněno automaticky z ceníku distributora',
  'field.balancing_opportunistic_threshold.hint': 'Balancování proběhne dřív, pokud je v tomto okně dost levné energie',
  'field.balancing_economic_threshold.hint': 'Nad tímto cenovým prahem se balancování odkládá, aby se nenabíjelo draze',

  // --- pricing_supplier (F1 U4 R3 — RCA-R3 restoration, UX-SPEC-wizard-v2.md §4) ---
  'field.spot_pricing_model.hint': '💰 SPOT + procento — variabilní cena podle burzy · 💵 SPOT + fixní poplatek — stabilnější · 🔒 FIX cena — předvídatelná',
  'field.spot_positive_fee_percent.hint': 'Při kladné spotové ceně: cena × (1 + procento/100). Např. 15 % = spot × 1,15',
  'field.spot_positive_fee_percent_nt.hint': 'Stejný vzorec jako VT, NT větev',
  'field.spot_negative_fee_percent.hint': 'Při záporné spotové ceně: cena × (1 − procento/100). Např. 9 % = spot × 0,91',
  'field.spot_negative_fee_percent_nt.hint': 'Stejný vzorec jako VT, NT větev',
  'field.spot_fixed_fee_mwh.hint': 'Konstantní poplatek přičtený ke spotové ceně',
  'field.spot_fixed_fee_mwh_nt.hint': 'Konstantní poplatek přičtený ke spotové ceně, NT větev',
  'field.fixed_commercial_price_vt.hint': '⚠️ Zadávejte bez DPH a distribuce',
  'field.fixed_commercial_price_nt.hint': '⚠️ Zadávejte bez DPH a distribuce',
  'field.export_pricing_model.hint': '💰 SPOT − procento — výhodné při vysokých cenách · 💵 SPOT − fixní srážka — stabilnější výkup · 🔒 FIX cena — stabilní po celý rok',
  'field.export_fee_percent.hint': 'Např. 15 % = dostanete 85 % ze spotové ceny (spot × 0,85)',
  'field.export_fee_percent_nt.hint': 'Stejný vzorec jako VT, NT větev',
  'field.export_fixed_fee_czk.hint': 'Fixní srážka od spotové ceny. Např. 0,20 CZK/kWh = spot − 0,20',
  'field.export_fixed_fee_czk_nt.hint': 'Fixní srážka od spotové ceny, NT větev',
  'field.export_fixed_price.hint': 'Výkupní cena bez ohledu na spot',
  'field.distribution_fee_vt_kwh.hint': 'Např. 1,42 CZK/kWh',
  'field.distribution_fee_nt_kwh.hint': 'Např. 0,91 CZK/kWh',
  'field.vat_rate.hint': 'Standardně 21 %',
  'field.tariff_vt_start_weekday.hint': "Např. '6' = 06:00",
  'field.tariff_nt_start_weekday.hint': "Např. '22,2' = 22:00 večer a 02:00 ráno",
  'field.tariff_weekend_same_as_weekday.hint': 'Vypněte, pokud se víkendové tarify liší',
  'field.tariff_vt_start_weekend.hint': 'Nechte prázdné pro NT celý den',
  'field.tariff_nt_start_weekend.hint': "Např. '0' = NT celý den",
  'field.dual_tariff_enabled.hint': 'Odvozeno z tarifu vybraného v kroku Ceny — distribuce; drženo pro zpětnou kompatibilitu.',

  // --- connection / 'basic' section (Task 20, UX-SPEC §Step 8) — copy
  // adapted from cs.json's wizard_intervals (translations/cs.json:211-218).
  'field.data_source_mode.hint': 'Cloud only = všechny senzory čtou z cloudu; Local only = čtení z lokálních entit (při výpadku proxy > limit minut se dočasně vrátí na cloud)',
  'field.standard_scan_interval.hint': 'Jak často načítat spotřebu, výrobu, stav baterie a další základní údaje (minimálně 30 sekund, doporučeno 30-60 sekund)',
  'field.extended_scan_interval.hint': 'Jak často načítat napětí článků, teploty, proudy a další detailní údaje (minimálně 300 sekund, doporučeno 300-600 sekund)',
  'field.local_proxy_stale_minutes.hint': 'Po kolika minutách bez lokálních dat se přepnout do cloudu. Jakmile proxy znovu odpoví, vrátí se zpět na local.',
  'field.local_event_debounce_ms.hint': 'Debounce pro event-driven refresh z lokálních entit (nižší = rychlejší reakce, vyšší = méně aktualizací)',
  'field.enable_dashboard.hint': 'Webové rozhraní s grafy přístupné v HA',

  // --- 'ai' section (Task 23 gap fill — copy transcribed from strings.json's
  // options-flow AI step, translations/cs.json:788-790) ---
  'field.ai_provider.hint': 'Volitelné; žádný poskytovatel není předvybrán ani zvýhodněn.',
  'field.ai_base_url.hint': 'Volitelná vlastní OpenAI-compatible URL.',
  'field.ai_model.hint': 'Volitelný identifikátor modelu.',

  // Simulator overlay (F1)
  'simulator.battery.charge_rate_kw.hint': 'Kolik box bere při nabíjení v režimu UPS. Vyšší = stihne nabít v kratším levném okně.',
  'simulator.battery.reserve.hint': 'Pod tuto úroveň baterku nepustí — dobíjí ale jen v levných oknech. 0 = vypnuto.',
  'simulator.battery.expensive_percentile.hint': 'Hodiny nad tímto percentilem cen se plánovač snaží pokrýt levným přednabitím. Vyšší = útočnější spoření.',
  'simulator.boiler.target_temp_c.hint': 'Na kolik stupňů se bojler snaží ohřát v levných/solárních oknech.',
  'simulator.boiler.min_temp_c.hint': 'Pod tohle nesmí spadnout — ohřeje se hned, i za draho. Komfortní pojistka.',
};

/** Falls back to a humanised key — never returns a raw i18n key. */
export function fieldLabel(key: string, i18nKey: string): string {
  return CS_LABELS[i18nKey] ?? key.replace(/_/g, ' ');
}

/** Returns undefined when no hint entry exists (UI treats undefined as "no hint"). */
export function fieldHint(_key: string, i18nKey: string): string | undefined {
  return CS_HINTS[i18nKey];
}
