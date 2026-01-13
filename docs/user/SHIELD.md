# ServiceShield - ochrana API volání

ServiceShield je integrovaný „ochranný layer“, který řídí a validuje služby, které mění stav Battery Boxu. Zajišťuje frontu, retry a auditní logy.

---

## Co ServiceShield dělá

- **Serializuje změny** – volání služeb nejdou paralelně.
- **Validuje výsledek** – ověřuje, že se změna v entitách opravdu projevila.
- **Retry** – při chybě opakuje pokus.
- **Monitoring** – poskytuje stav přes senzory a dashboard.

ServiceShield je spouštěn automaticky při startu integrace.

---

## Jaké služby chrání

- `oig_cloud.set_box_mode`
- `oig_cloud.set_grid_delivery`
- `oig_cloud.set_boiler_mode`
- `oig_cloud.set_formating_mode`

---

## Senzory ServiceShield

- `sensor.oig_XXXXX_service_shield_status` – stav (idle/running)
- `sensor.oig_XXXXX_service_shield_queue` – délka fronty
- `sensor.oig_XXXXX_service_shield_activity` – textový přehled aktivity
- `sensor.oig_XXXXX_mode_reaction_time` – průměrný čas reakce změny režimu

---

## Helper služby ServiceShield

Používá je primárně dashboard:

- `oig_cloud.shield_status`
- `oig_cloud.shield_queue_info`
- `oig_cloud.shield_remove_from_queue`

---

## Telemetrie

ServiceShield posílá omezenou telemetrii (hash e‑mailu + HA instance ID) pouze pro diagnostiku a stabilitu. V UI zatím není přepínač, ale lze použít `no_telemetry` v options (pokročilé nastavení).

---

## Kde se to používá v UI

- Dashboard zobrazuje stav fronty a aktivitu.
- Auto mode planner (pokud je zapnut) používá ServiceShield pro bezpečné přepínání režimů.
