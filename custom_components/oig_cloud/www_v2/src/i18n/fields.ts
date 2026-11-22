/**
 * OIG Cloud V2 — Field label / hint catalog.
 *
 * The backend `/config_registry` endpoint emits `field.<key>.label` and
 * `field.<key>.hint` keys verbatim (see `config_registry.py:32-36` and
 * `registry_as_api_dict:102-103`). No translation file defines any
 * `field.*` key — and rendering the raw key would print
 * `field.charge_rate_kw.label` on screen.
 *
 * Catalog seeded by transcribing the existing Czech copy from the legacy
 * settings tab field labels and hints — no new copywriting, no lost hints.
 * `fieldLabel()` / `fieldHint()` never return a raw i18n key; missing
 * entries fall back to a humanised form of the key.
 */

const CS_LABELS: Record<string, string> = {
  // --- module settings ---
  'field.enable_battery_prediction.label': 'Predikce baterie a plánovač',
  'field.enable_solar_forecast.label': 'Solární předpověď',
  'field.enable_pricing.label': 'Ceny energie',
  'field.enable_boiler.label': 'Bojler',
  'field.enable_statistics.label': 'Statistiky',
  'field.enable_extended_sensors.label': 'Rozšířené senzory',
  'field.enable_chmu_warnings.label': 'Výstrahy ČHMÚ',

  // --- battery settings ---
  'field.auto_mode_switch_enabled.label': 'Automatické přepínání režimů',
  'field.charge_rate_kw.label': 'Nabíjecí výkon ze sítě (kW)',
  'field.balancing_enabled.label': 'Balancování článků',
  'field.balancing_interval_days.label': 'Interval balancování (dny)',
  'field.balancing_hold_hours.label': 'Držení 100 % (hodiny)',
  'field.cheap_window_percentile.label': 'Levné okno pro balancování (%)',

  // --- solar settings ---
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

  // --- boiler settings ---
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
  'field.hw_min_fraction.label': 'Záložní minimum baterie (podíl kapacity)',
  'field.mode_guard_minutes.label': 'Ochranná doba přepnutí režimu (min)',
  'field.box_floor_safety_margin_pct.label': 'Rezerva nad minimem boxu (%)',
  'field.holding_soc_threshold_percent.label': 'Práh držení při balancování (%)',
  'field.ups_opportunistic_price_czk_kwh.label': 'Cena pro příležitostné nabíjení (Kč/kWh)',
  'field.ups_opportunistic_charge_rate_kw.label': 'Výkon příležitostného nabíjení (kW)',
  'field.ai_consent_cross_provider_fallback.label': 'Souhlas se záložním AI poskytovatelem',
  'field.ai_extra_entities.label': 'Další senzory pro AI',
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
  'simulator.boiler.target_temp_c.label': 'Cílová teplota',
  'simulator.box.capacity_kwh.label': 'Kapacita baterie',
  'simulator.box.hw_min_soc_percent.label': 'Minimální SoC (HW)',
  'simulator.box.top_temp_c.label': 'Teplota nahoře',
  'simulator.box.bottom_temp_c.label': 'Teplota dole',
  'simulator.box.cold_inlet_c.label': 'Studená voda na vstupu',

  // --- car and main breaker (planner) ---
  'field.enable_ev.label': 'Elektroauto',
  'field.ev_soc_entity.label': 'Nabití baterie auta (senzor %)',
  'field.ev_plugged_entity.label': 'Auto připojeno (senzor)',
  'field.ev_charge_limit_entity.label': 'Limit nabíjení auta (entita %)',
  'field.ev_charge_limit_pct.label': 'Limit nabíjení auta (%)',
  'field.ev_charger_power_entity.label': 'Výkon nabíječky (senzor)',
  'field.ev_capacity_kwh.label': 'Energie auta na 100 % (kWh)',
  'field.ev_max_power_kw.label': 'Nabíjecí výkon auta (kW)',
  'field.ev_min_power_kw.label': 'Nejnižší výkon nabíječky (kW)',
  'field.ev_phases.label': 'Fáze nabíječky',
  'field.ev_target_mode.label': 'Kam nabíjet auto před odjezdem',
  'field.ev_holidays.label': 'Státní svátky jako neděle',
  'field.ev_trip_departure.label': 'Odjezd na dlouhou cestu (HH:MM)',
  'field.ev_control_mode.label': 'Čím se spíná nabíjení',
  'field.ev_switch_entity.label': 'Spínač nabíjení (entita)',
  'field.ev_switch_inverted.label': 'Spínač znamená „pozastavit“',
  'field.ev_current_control.label': 'Řídit nabíjecí proud',
  'field.ev_current_entity.label': 'Nabíjecí proud (entita A)',
  'field.boiler_heater_switch_entity.label': 'Spínač ohřevu bojleru',
  'field.boiler_alt_heater_switch_entity.label': 'Spínač druhého zdroje tepla',
  'field.boiler_circulation_pump_switch_entity.label': 'Čerpadlo cirkulace',
  'field.boiler_circulation_presence_entity.label': 'Jen když je někdo doma (zóna)',
  'field.boiler_circulation_min_draw_probability_pct.label': 'Spustit před odběrem, který bývá aspoň v (%) dnů',
  'field.ev_target_limit_pct.label': 'Nabíjet auto do (%)',
  'field.ev_set_car_limit.label': 'Před nabíjením nastavit limit v autě',
  'field.ev_raise_limit_for_trip.label': 'Na dlouhou cestu zvednout limit na 100 %',
  'field.ev_on_backup_circuit.label': 'Wallbox je na záložním výstupu boxu',
  'field.ev_climate_when.label': 'Topit v autě před odjezdem',
  'field.ev_climate_entity.label': 'Klimatizace auta (entita)',
  'field.ev_climate_temp_c.label': 'Teplota v autě (°C)',
  'field.ev_climate_minutes.label': 'Začít před odjezdem (min)',
  'field.ev_climate_cold_c.label': 'Topit pod venkovní teplotou (°C)',
  'field.ev_outside_temp_entity.label': 'Venkovní teplota (senzor)',
  'field.ev_climate_plugged_only.label': 'Topit jen u nabíječky',
  'field.ev_window_heating_entity.label': 'Vyhřívání oken (entita)',
  'field.grid_breaker_a.label': 'Hlavní jistič (A na fázi)',
  'field.grid_reserve_a.label': 'Rezerva jističe (A)',
  'field.grid_phases.label': 'Fáze přípojky',
  'field.flex_priority.label': 'Priorita na jističi',
  'field.flex_pv_battery_first.label': 'Přetoky nejdřív do baterie',
  'field.boiler_on_backup_circuit.label': 'Bojler na zálohovaném výstupu',
  'field.live_load_replan.label': 'Okamžitě reagovat na skok spotřeby',
  'field.share_energy_data.label': 'Sdílet anonymní data o energii',
  'field.price_forecast_entity.label': 'Předpověď ceny spotu (senzor)',
  'field.price_forecast_mode.label': 'Použití předpovědi ceny',
};

const CS_HINTS: Record<string, string> = {
  // --- car and main breaker hints ---
  'field.enable_ev.hint': 'Plán nabíjení auta podle cen, přetoků a předpovědi jízd',
  'field.ev_soc_entity.hint': 'Senzor nabití baterie auta v %; z jeho historie se učí, kdy auto odjíždí a kolik spotřebuje',
  'field.ev_plugged_entity.hint': 'Nevyplněno = auto se bere jako připojené',
  'field.ev_charge_limit_entity.hint': 'Entita s limitem nabíjení auta; jinak platí limit níže',
  'field.ev_charge_limit_pct.hint': 'Nad tuto hodnotu plán auto nenabíjí',
  'field.ev_charger_power_entity.hint': 'Výkon wallboxu; z něj se dopočítá kapacita a pozná nabíjení',
  'field.ev_capacity_kwh.hint': 'Kolik kWh z nabíječky dá 100 % baterie auta; 0 = dopočítat z historie',
  'field.ev_max_power_kw.hint': 'Nejvyšší výkon, kterým auto nabíjí (3 × 16 A = 11 kW)',
  'field.ev_min_power_kw.hint': 'Pod tímto výkonem nabíječka neběží (6 A na fázi)',
  'field.ev_holidays.hint': 'O státních svátcích plán čeká odjezd jako v neděli. Jednotlivý den jde změnit v kalendáři na záložce Auto',
  'field.ev_trip_departure.hint': 'Den označený „dlouhá cesta“ bez vlastního času',
  'field.ev_control_mode.hint': 'Jen plán: spíná vaše automatizace podle senzoru plánu. Nabíječka: spínač nabíječky (jakákoli integrace). Auto: spínač v autě přes cloud výrobce, pomalejší',
  'field.ev_switch_entity.hint': 'Jakýkoli switch nebo input_boolean, který nabíjení pouští a zastavuje',
  'field.ev_switch_inverted.hint': 'Zapnout, když zapnutý spínač nabíjení zastavuje (pozastavit/pauza)',
  'field.ev_current_control.hint': 'Proud podle plánu: ztlumí auto, když jistič nestačí, a dorovná přetoky',
  'field.ev_current_entity.hint': 'Číslo v ampérech, které nastaví proud nabíječky',
  'field.boiler_heater_switch_entity.hint': 'Switch, který zapíná elektrickou topnou tyč bojleru',
  'field.boiler_alt_heater_switch_entity.hint': 'Switch druhého zdroje tepla (plyn, kotel), když ho integrace spíná',
  'field.boiler_circulation_pump_switch_entity.hint': 'Switch čerpadla cirkulace teplé vody',
  'field.boiler_circulation_presence_entity.hint': 'Např. zone.home: když v zóně nikdo není, čerpadlo nejede. Prázdné = bez ohledu na přítomnost',
  'field.boiler_circulation_min_draw_probability_pct.hint': 'Podle historie odběrů po půlhodinách, zvlášť pro pracovní dny a víkendy. Cirkulace se spustí před každou půlhodinou, ve které v podobné dny tekla teplá voda aspoň v tolika procentech dnů, malé odběry včetně. 10 = aspoň jeden den z deseti',
  'field.ev_target_limit_pct.hint': 'Vlastní cíl nabíjení; 0 = podle limitu nastaveného v autě',
  'field.ev_set_car_limit.hint': 'Integrace před každým nabíjením přepíše limit v autě na váš cíl. Pro auta, která si limit po nabití vrací',
  'field.ev_raise_limit_for_trip.hint': 'Limit v autě se na noc před cestou zvedne na 100 % a po odjezdu vrátí',
  'field.ev_on_backup_circuit.hint': 'Auto pak nabíjí jen v režimu Home UPS: box se přepne před začátkem nabíjení, a když auto začne nabíjet samo, do minuty. Jinak by střídač táhl auto z baterie a přetížil se',
  'field.ev_climate_when.hint': 'Pod teplotou: jen když je venku zima. Jen vybrané dny: podle kalendáře na záložce Auto',
  'field.ev_climate_entity.hint': 'Klimatizace auta, kterou integrace před odjezdem zapne',
  'field.ev_outside_temp_entity.hint': 'Senzor teploty nebo entita weather; čidlo auta v garáži ukazuje víc',
  'field.ev_climate_plugged_only.hint': 'Aby topení nejelo z baterie auta',
  'field.ev_window_heating_entity.hint': 'Volitelný spínač vyhřívání oken, zapne se spolu s topením',
  'field.ev_target_mode.hint': 'Do limitu: co se nevyjezdí, zůstane na další den, a benzín je dražší. Podle potřeby: jen na obvyklou denní spotřebu',
  'field.grid_breaker_a.hint': 'Jistič přípojky; plán ho nepřetíží autem, bojlerem ani nabíjením baterie. 0 = bez limitu',
  'field.grid_reserve_a.hint': 'Rezerva na špičky domu, které 15min průměr nevidí',
  'field.flex_priority.hint': 'Kdo dostane jistič první, když se všichni nevejdou',
  'field.flex_pv_battery_first.hint': 'Tak to dělá box: přetok jde do baterie dřív než do auta a bojleru. Vypnout až při řízení nabíjení baterie z FVE',
  'field.price_forecast_entity.hint': 'Senzor „Price forecast series“ z doplňku Energy Price Forecast EU (zóna CZ). Doplní ceny, které OTE ještě nezveřejnilo',
  'field.price_forecast_mode.hint': 'Stínově: jen měří přesnost předpovědi. Zapnuto: plánovač plánuje i podle odhadnutých cen (až 48 h)',
  'field.share_energy_data.hint': 'Jednou za hodinu odešle 15min součty spotřeby, FVE, SoC, režimu a cen. Bez čísla boxu, jmen a polohy, šifrovaně. Pomáhá ladit plánovač na víc domech',
  'field.live_load_replan.hint': 'Plán vezme aktuální odběr domu a při změně o 1,5 kW hned přepočítá. Na datech z 7.–15. 11. nic neušetřil, proto je vypnuté',
  'field.boiler_on_backup_circuit.hint': 'Zapnout, jen když bojler napájí záložní výstup boxu (baterie ho pak kryje)',

  // --- module settings hints ---
  'field.enable_battery_prediction.hint': 'Ekonomické plánování nabíjení, timeline, úspory',
  'field.enable_solar_forecast.hint': 'Předpověď výroby FVE (forecast.solar / Solcast)',
  'field.enable_pricing.hint': 'Spotové ceny OTE, výkup, distribuce',
  'field.enable_boiler.hint': 'Inteligentní ohřev vody',

  // --- battery settings hints ---
  'field.auto_mode_switch_enabled.hint': 'Plánovač sám přepíná Home 1 / Home UPS podle plánu',
  'field.charge_rate_kw.hint': 'Kolik kW box bere při nabíjení ze sítě (UPS)',
  'field.balancing_enabled.hint': 'Pravidelné nabití na 100 % kvůli vyrovnání článků',
  'field.cheap_window_percentile.hint': 'Balancování se plánuje do hodin pod tímto cenovým percentilem',

  // --- solar settings hints ---
  'field.solar_forecast_provider.hint': 'Forecast.Solar používá místní geometrii; Solcast přebírá geometrii z Rooftop Site.',
  'field.solcast_site_id.hint': 'Geometrii nastavte v Solcast Rooftop Site. Zde zadejte jeho Site ID.',
  'field.solcast_api_key.hint': 'Nech prázdné = beze změny',
  'field.solar_forecast_string1_kwp.hint': 'Pro Solcast slouží jen k rozdělení výstupu a jako záložní metadata; Solcastu se neposílá.',
  'field.solar_forecast_string2_kwp.hint': 'Pro Solcast slouží jen k rozdělení výstupu a jako záložní metadata; Solcastu se neposílá.',
  'field.solar_forecast_string1_azimuth.hint': 'Sever 0°/360°, východ 90°, jih 180°, západ 270°. Rozsah: 0–360°.',
  'field.solar_forecast_string2_azimuth.hint': 'Sever 0°/360°, východ 90°, jih 180°, západ 270°. Rozsah: 0–360°.',

  // --- boiler settings hints ---
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
  'field.box_has_home56.hint': 'Zapne přepínače Home 5 a Home 6 v řídicím panelu. Nezávisí na modulu bojleru',
  'field.hw_min_fraction.hint': 'Použije se, jen když box minimum nehlásí. 0,20 znamená 20 % kapacity.',
  'field.mode_guard_minutes.hint': 'Jak dlouho musí režim platit, než ho plánovač znovu změní.',
  'field.box_floor_safety_margin_pct.hint': 'O kolik procent nad minimem boxu má plánovač držet baterii.',
  'field.holding_soc_threshold_percent.hint': 'Od tohoto stavu baterie se při balancování počítá držení na plné kapacitě.',
  'field.ups_opportunistic_price_czk_kwh.hint': 'Do této ceny může plánovač nabíjet ze sítě i mimo plánované okno.',
  'field.ups_opportunistic_charge_rate_kw.hint': 'S jakým výkonem plánovač při příležitostném nabíjení počítá.',
  'field.ai_consent_cross_provider_fallback.hint': 'Bez tohoto souhlasu se záložní poskytovatel nikdy nepoužije, i když je uložen.',
  'field.ai_extra_entities.hint': 'Nejvýše 10 entit (počasí, teploty, velké spotřebiče), které AI uvidí. Posílá se jen název, stav a jednotka.',
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
  'simulator.boiler.target_temp_c.hint': 'Na kolik stupňů se bojler snaží ohřát v levných/solárních oknech.',
};

/** Falls back to a humanised key — never returns a raw i18n key. */
export function fieldLabel(key: string, i18nKey: string): string {
  return CS_LABELS[i18nKey] ?? key.replace(/_/g, ' ');
}

/** Returns undefined when no hint entry exists (UI treats undefined as "no hint"). */
export function fieldHint(_key: string, i18nKey: string): string | undefined {
  return CS_HINTS[i18nKey];
}
