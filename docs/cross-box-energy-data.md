# Data z dalších boxů pro obecný plánovač (návrh, 15. 11. 2026)

## Proč

Plánovač baterie je zatím ověřený jen na jednom domě. Přehrání na 5min datech z Martinova HA (7.–15. 11.) umí porovnat varianty plánovače, ale nic neřekne o domech s jinou baterií, FVE, spotřebou nebo tarifem. Aby šel plánovač nastavit obecně (nebo aby se nastavoval sám), potřebujeme stejná data z dalších boxů.

## Co dnes máme

- Telemetrie integrace (`cloud_telemetry_events`) posílá jen souhrny běhů plánovače: počty režimů a náklad. Vypnout nejde.
- Telemetrie OIG Proxy (`telemetry_top`) obsahuje stav spojení a čítače, žádnou energii.
- Obě jdou přes MQTT `telemetry.muriel-cz.cz:1883`, nešifrovaně a bez přihlášení. Jako identifikátor slouží číslo boxu.

## Návrh

1. **Data:** jednou za hodinu dávka čtyř 15min slotů. Každý slot obsahuje zálohovanou spotřebu (kWh), FVE (kWh), SoC (%), režim boxu, nákupní a výkupní cenu (Kč/kWh). K tomu jednou denně kapacita baterie, bat_min a nabíjecí výkon. Bez názvů entit, bez polohy, bez jmen.
2. **Identifikace:** místo čísla boxu otisk (HMAC) z čísla boxu a náhodné soli uložené jen v instalaci. Data jednoho boxu jdou spojit mezi sebou, ale ne s konkrétním boxem ani zákazníkem.
3. **Souhlas:** nový přepínač „Sdílet anonymní data o energii pro vývoj plánovače“, ve výchozím stavu vypnutý. Bez souhlasu se nic z toho neposílá.
4. **Přenos:** MQTT přes TLS (port 8883) s přihlášením. Na serveru to znamená zapnout TLS v mosquittu a doplnit telegraf o nové measurement `energy_slots`. Diff předložím ke schválení, na serveru sám nic neměním.
5. **Uchování:** 12 měsíců, ať jsou vidět všechna roční období. Pak se data mažou automaticky (retence bucketu).
6. **Vyhodnocení:** skript `scripts/replay_boxes.py` stáhne sloty z Influxu a pro každý box přehraje plánovač v uzavřené smyčce. Porovná varianty a ukáže, které parametry (opotřebení, hodnota energie na konci horizontu, nabíjecí výkon) se mezi domy liší.

## Stav (15. 11. 2026, větev `claude/ev-boiler-planning`, PR #82)

Martin řekl „udělejme to“. U voleb, které nevybral, platí doporučené výchozí hodnoty: souhlas přepínačem (výchozí vypnuto), otisk místo čísla boxu, jen TLS, retence 12 měsíců.

- Integrace: volba `share_energy_data` (Nastavení → Baterie a plánovač → „Sdílet anonymní data o energii“). Kód je v `shared/energy_telemetry.py`, `shared/energy_publisher.py` a `battery_forecast/planning/energy_telemetry_job.py`. Odesílá se v minutě :07 každé hodiny, jen přes TLS na port 8883.
- Server: návrh změny je v `docs/telemetry-energy-server-change.md`. Dokud ho Martin neschválí a neprovede, data se neodesílají (TLS spojení se nenaváže).
- Vyhodnocení: `scripts/replay_boxes.py`.

## Jak spustit přehrávač

```bash
INFLUX_URL=http://10.0.0.161:8086 INFLUX_TOKEN=<token pro čtení bucketu energy> INFLUX_ORG=<org> \
  python scripts/replay_boxes.py --days 30
```

Pro každou instalaci a každý souvislý úsek dat (nejméně 2 dny) vypíše upravený náklad v Kč ve variantách `deployed` (dnešní plánovač), `no_wear` (bez opotřebení) a `live_load` (živá spotřeba). Upravený náklad znamená peníze minus energie, která na konci zůstala v baterii.

Ověřeno na datech našeho boxu za 7.–15. 11. (7,9 dne): `deployed` 1 311,1 Kč, `no_wear` 1 303,3 Kč, `live_load` 1 310,7 Kč.
