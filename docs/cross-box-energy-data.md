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

## Rozhodnutí pro Martina

Viz formulář v session: souhlas, rozsah dat, uchování, přenos.
