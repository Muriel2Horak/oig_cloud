# Plánování nabíjení auta a predikce ohřevu bojleru

Stav k 14. 11. 2026, větev `claude/ev-boiler-planning` (vychází z `release/v2.5.0`).

## Co už v repu je

| Oblast | Stav |
|---|---|
| Auto | Nic. V integraci není žádný kód pro elektroauto ani wallbox. |
| Bojler | Velký modul `boiler/` (asi 14 000 řádků). Profil odběru vody po 15 min (`demand_profiler`, p50/p80 kWh na slot), plánovač zdroje (`planner_core.plan_comfort_core`), aktuátor a odhad skutečného příkonu (`heating_estimator`). |
| Bojler → plánovač baterie | `forecast_update._apply_boiler_grid_load_overlay` přičítá naplánovaný ohřev ze sítě a z baterie k zátěži baterie, ohřev z FVE vynechává. Plán bojleru se bere z minulého běhu. |
| Plánovač baterie | `economic_planner` (DP optimalizátor Home 1 / Home UPS), jeden nabíjecí výkon, žádný limit jističe. |
| Spot ceny, FVE | Ceny po 15 min v `spot_prices`, předpověď FVE v `solar_kwh_list`. Obojí je k dispozici v `forecast_update` před během plánovače. |

## Co ukázala data z HA

**Auto** je Škoda Kodiaq iV (plug-in hybrid) s Wallboxem v garáži.
- Nabíjí třemi fázemi 11 kW (16 A), nad 90 % výkon klesá. Kapacita podle wallboxu asi 24,3 kWh na 100 %.
- Wallbox je na **nezálohovaném okruhu**. 8. 11. v 11 h bylo 11,0 kW ve wallboxu a 11,0 kW na `acinb`, zálohovaná zátěž (`aco_p`) jen 1,1 kW. Domácí baterie do auta nevybíjí, auto jde ze sítě nebo z přetoků.
- Profil z hodinových statistik SoC od 3/2025: všední dny odjezd v 6–7 h, spotřeba průměrně 40 % (asi 10 kWh), p80 80–90 %. Sobota odjezd v 8 h (p80 55 %), neděle v 11 h (p80 27 %). Nabíjí se v noci 1–6 h a v poledne 10–16 h.
- Recorder drží stavy jen 10 dní, hodinové statistiky SoC jsou od 3/2025. Profil se proto staví ze statistik.

**Bojler** je taky na nezálohovaném okruhu (9/2026: povel 6,6 kW, na `acinb` 3,5–4 kW). Od října se ohřívá plynem (alternativa), elektřinou 0 kWh.
- Plánovač bojleru počítá teplotu jen z ohřevu. Odběr vody ani tepelné ztráty v předpovědi teploty nejsou (`_predict_slots` volá `predicted_temperature_after_slot(..., 0.0, ...)`). Nevíme tedy dopředu, kdy a kolik bude bojler potřebovat. To chybí.
- Po restartu HA není plán bojleru („No plan available yet“), dokud se nedopočítá profil. Plánovač baterie pak o bojleru neví nic.

**Jistič** 3 × 25 A (z nastavení wallboxu „Maximální proud ICP“). Auto 16 A, nabíjení baterie přes proxy až 11 A na fázi, bojler 13 A na jedné fázi. Součet jistič přetíží, limit se proto plánovat musí.

## Návrh modelu

1. **Profil auta** (`ev/profile.py`): z hodinových statistik SoC se pro každý den v týdnu spočítá hodina odjezdu (medián první hodiny poklesu) a potřeba (p80 denního úbytku v kWh). Statistiky se čtou při startu a jednou denně na pozadí.
2. **Potřeba auta**: nejbližší odjezd podle profilu. Cíl = SoC nutné pro p80 spotřeby, nejvýš limit nabíjení auta. Co do odjezdu nejde nabít, plán ukáže jako nedostatek.
3. **Plán nabíjení** (`ev/planner.py`): z 15min slotů do odjezdu se vybírají nejlevnější. Přetok z FVE se oceňuje výkupní cenou (ušlý výnos), síť spotovou cenou. Výkon ve slotu omezí wallbox a volná kapacita jističe. Po pokrytí potřeby se auto dobíjí přetoky, které by jinak šly do sítě.
4. **Predikce ohřevu bojleru** (`boiler/heating_forecast.py`): simulace energie v nádrži po 15 min. Úbytek tvoří odběr vody z profilu (p80) a tepelné ztráty. Výstupem je nezávisle na zdroji, kolik kWh musí bojler dostat a do kdy, aby neklesl pod minimální teplotu. Když plán bojleru existuje, použije se jeho rozložení. Když ne, potřeba se rozloží stejným plánovačem jako u auta.
5. **Koordinace** (`battery_forecast/planning/flex_loads.py`) běží v každém cyklu před plánovačem baterie:
   - přetoky FVE se rozdělí podle priority (výchozí: auto, bojler, baterie, export);
   - kapacita jističe se rozdělí ve stejném pořadí;
   - plánovač baterie pak dostane FVE zmenšenou o to, co si vzaly spotřebiče s vyšší prioritou, a zákaz Home UPS ve slotech, kde by nabíjení baterie přetížilo jistič.

## Rozhodnutí pro Martina (výchozí hodnota v závorce)

1. **Priorita přetoků.** Box sám dává přetok nejdřív do baterie a teprve zbytek do nezálohovaného okruhu (auto, bojler). Pořadí auto, bojler, baterie, export tedy plán počítá, ale box ho sám neudělá, dokud mu plán nesníží nabíjení baterie. To je až další krok. (Pořadí podle zadání, nastavitelné.)
2. **Jistič** 3 × 25 A a rezerva 2 A na fázi na špičky, které 15min průměr nevidí. (3 × 25 A, 2 A)
3. **Kolik nabít.** p80 denní spotřeby pokryje zhruba 4 dny z 5. Zbytek dojede benzín. Druhá možnost je nabíjet vždy do limitu. (p80)
4. **Řízení.** Integrace auto zatím nespíná. Dává plán a `binary_sensor` „nabíjet teď“, wallbox přepíná Martinova automatizace. (jen plán)
5. **Bojler na nezálohovaném okruhu.** Baterie ho nekryje, ohřev ze sítě se proto už nemá přičítat k zátěži baterie, ale k odběru ze sítě (jistič). Tím se změní plán baterie v létě, kdy bojler topí elektřinou. (opravit)

## Co je hotové (větev `claude/ev-boiler-planning`)

| Část | Soubor |
|---|---|
| Plánovač posuvné zátěže (nejlevnější sloty před termínem, levné přetoky navíc) | `shared/flex_scheduler.py` |
| Profil auta ze statistik SoC, odhad kapacity z wallboxu | `ev/profile.py` |
| Plán nabíjení auta | `ev/planner.py` |
| Runtime auta (entity, profil na pozadí jednou denně) a senzor plánu | `ev/runtime.py`, `ev/sensors.py` |
| Predikce ohřevu bojleru (plán, jinak termostat s odběrem a ztrátami) | `boiler/heating_forecast.py`, `boiler/heating_forecast_live.py` |
| Koordinace jističe a přetoků | `battery_forecast/planning/flex_loads.py`, `flex_glue.py` |
| Zákaz Home UPS ve slotech, kde by baterie přetížila jistič | `economic_planner.py` (`ups_allowed`), `forecast_update.py` |

Ověřeno na datech z HA ze 14. 11. 19:15: profil čekal odjezd v neděli v 10:00 s potřebou 25 % (6,4 kWh). Plán nabíjel v nedělních slotech 03:45 a 05:45–06:15 za 4,68–4,8 Kč/kWh, celkem 30 Kč. Nabíjení baterie jistič unesl, žádný slot UPS se nezakázal.

## Jak to zapnout

V dashboardu v Nastavení → Moduly zapnout „Elektroauto“. V kartě „Baterie a plánovač“ pak vyplnit:
- senzor nabití: `sensor.skoda_kodiaq_stav_baterie_v`;
- připojení: `binary_sensor.skoda_kodiaq_nabijecka_pripojena`;
- limit: `number.skoda_kodiaq_limit_nabijeni`;
- výkon nabíječky: `sensor.wallbox_garaz_nabijeci_vykon`, z něj se dopočítá kapacita (vyšlo 25,4 kWh);
- jistič: 25 A.

Senzor `sensor.oig_2206237016_ev_charging_plan` má stav `charge`, když se má nabíjet hned. Jinak ukazuje stav plánu. Na stav `charge` může automatizace zapnout `switch.skoda_kodiaq_nabijeni` nebo wallbox.

## Co se změní po nasazení i bez zapnutí auta

- Přibude jedna entita `sensor.oig_2206237016_boiler_heating_forecast`, celkem tedy 166 místo 165. Po zapnutí auta přibude ještě `sensor.oig_2206237016_ev_charging_plan`.
- Ohřev bojleru ze sítě se už nepřičítá k zátěži baterie, protože bojler je na nezálohovaném okruhu. Ohřev z baterie (Home 5) zůstává. Vrátit se to dá volbou „Bojler na zálohovaném výstupu“.
- Když předpověď ohřevu bojleru s jističem a domem nenechá místo pro nabíjení baterie, plánovač v tom slotu Home UPS nedá. V zimě, kdy bojler topí plynem, se tím nic nemění.

## Co zbývá

- Box sám nedá přetok autu dřív než baterii. Pořadí „auto před baterií“ na přetocích bude potřebovat řízení nabíjení baterie z FVE přes proxy.
- Integrace auto nespíná sama, spínání zatím obstará automatizace podle senzoru.
- Vlastní předpověď teploty v plánovači bojleru (`_predict_slots`) pořád nepočítá s odběrem a ztrátami. Predikce ohřevu je zatím samostatná, plánovač bojleru ji nepoužívá.
- Pokles nabíjecího výkonu auta nad 90 % plán nepočítá. Posledních pár procent proto může trvat déle.
