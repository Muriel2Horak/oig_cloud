# Předpověď ceny spotu v plánovači

OTE zveřejňuje ceny na zítřek kolem 13:00, ráno tedy plánovač vidí jen do půlnoci. Doplněk Energy Price Forecast EU (licence MIT, zóna CZ, 15 minut, 48 h zdarma) doplní ceny, které OTE ještě nezveřejnilo. Integrace je přepočítá stejným ceníkem jako zveřejněné ceny (`pricing/price_formula.py`): obchodní přirážka, distribuce VT/NT a DPH, u výkupu srážka.

## Instalace (Martin)

1. HACS → Integrace → menu ⋮ → Vlastní repozitáře → `https://github.com/BackupBaTTerY/energypriceforecast-home-assistant`, typ Integrace. Pak stáhnout a restartovat HA. Pozor na past HA 2026.11 s Marketplace (paměť `ha-2026-11-marketplace-trap`).
2. Nastavení → Zařízení a služby → Přidat integraci → „Energy Price Forecast EU“. Zóna **CZ**, měna **CZK**. API klíč není potřeba, zdarma je 48 h. Interval aktualizace nechat na 30 min.
3. V dashboardu OIG: Nastavení → Baterie a plánovač → „Předpověď ceny spotu (senzor)“ = senzor „Price forecast series“ z doplňku. „Použití předpovědi ceny“ nechat na **Stínově**.

## Stínový režim

Plánovač dál plánuje jen podle zveřejněných cen. V každém běhu si uloží, co předpověď říká o slotech, které OTE ještě nezveřejnilo. Když je OTE zveřejní, změří chybu podle toho, jak dlouho dopředu byla předpověď udělaná: 0–12 h, 12–24 h, 24–36 h a 36–48 h.

Výsledek je v atributu `price_forecast` senzoru `sensor.oig_2206237016_battery_forecast`:

- `forecast_slots`: kolik slotů za zveřejněnými cenami předpověď pokrývá;
- `accuracy`: pro každé pásmo `n` (počet slotů), `mae` (průměrná chyba v Kč/kWh konečné ceny) a `bias` (kladný znamená, že předpověď nadhodnocuje);
- `issue`: `entity_unavailable`, když senzor doplňku chybí.

Po 2–3 týdnech se rozhodne, jestli předpověď zapnout. Měřítko je chyba v pásmu 12–24 h proti rozptylu cen během dne. Když je chyba výrazně menší než rozdíl levných a drahých hodin, plánování na odhad se vyplatí.

## Zapnuto

Plánovač dostane sloty z předpovědi označené `estimated` a horizont až 48 h. První hodiny jsou dál podle zveřejněných cen a rozhodnutí se přepočítá, jakmile OTE ceny zveřejní. Graf v záložce Ceny kreslí odhadnuté ceny čárkovaně.
