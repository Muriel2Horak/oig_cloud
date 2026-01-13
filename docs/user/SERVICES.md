# Služby - OIG Cloud

Tento přehled odpovídá aktuálním službám definovaným v `custom_components/oig_cloud/services.yaml` + ServiceShield pomocné služby.

## 📋 Obsah

- [set_box_mode](#set_box_mode)
- [set_grid_delivery](#set_grid_delivery)
- [set_boiler_mode](#set_boiler_mode)
- [set_formating_mode](#set_formating_mode)
- [update_solar_forecast](#update_solar_forecast)
- [check_balancing](#check_balancing)
- [Dashboard tiles](#dashboard-tiles)
- [Boiler plán](#boiler-plán)
- [ServiceShield služby](#serviceshield-služby)

---

## set_box_mode

Nastaví pracovní režim Battery Boxu.

**Parametry:**

- `device_id` (volitelné, pokud máte více boxů)
- `mode` (povinné): `home_1`, `home_2`, `home_3`, `home_ups`
- `acknowledgement` (povinné): `true`

**Poznámky:**

- Projevení změny může trvat několik minut.
- Ověření v OIG aplikaci (Notifications).

**Příklad:**

```yaml
service: oig_cloud.set_box_mode
data:
  mode: home_1
  acknowledgement: true
```

---

## set_grid_delivery

Nastavení přetoků do distribuční sítě.

**Parametry:**

- `device_id` (volitelné)
- `mode` (povinné): `off`, `on`, `limited`
- `limit` (volitelné): limit výkonu v W (používá se s `limited`)
- `acknowledgement` (povinné): `true`
- `warning` (povinné): `true` – potvrzení právních upozornění

**Nové chování:**

- Režim a limit lze nastavit v **jednom** volání.

**Příklad (limited):**

```yaml
service: oig_cloud.set_grid_delivery
data:
  mode: limited
  limit: 5000
  acknowledgement: true
  warning: true
```

---

## set_boiler_mode

Přepnutí režimu bojleru.

**Parametry:**

- `device_id` (volitelné)
- `mode` (povinné): `cbb`, `manual`
- `acknowledgement` (povinné): `true`

**Příklad:**

```yaml
service: oig_cloud.set_boiler_mode
data:
  mode: manual
  acknowledgement: true
```

---

## set_formating_mode

Okamžité nabíjení baterie ze sítě na požadovanou úroveň.

**Parametry:**

- `device_id` (volitelné)
- `mode` (povinné): `no_charge`, `charge`
- `limit` (povinné při `charge`): cílové SOC v %
- `acknowledgement` (povinné): `true`

**Příklad:**

```yaml
service: oig_cloud.set_formating_mode
data:
  mode: charge
  limit: 80
  acknowledgement: true
```

---

## update_solar_forecast

Manuální aktualizace solární předpovědi.

**Parametry:**

- `entity_id` (volitelné): konkrétní solar forecast senzor

**Příklad:**

```yaml
service: oig_cloud.update_solar_forecast
data:
  entity_id: sensor.oig_123456_solar_forecast
```

---

## check_balancing

Manuálně spustí kontrolu balancování baterie (diagnostika).

**Parametry:**

- `force` (volitelné): vynutit přepočet

**Příklad:**

```yaml
service: oig_cloud.check_balancing
data:
  force: true
```

---

## Dashboard tiles

Služby používané dashboardem pro ukládání vlastních dlaždic.

### save_dashboard_tiles

Uloží JSON konfiguraci dlaždic.

**Parametry:**

- `config` (povinné): JSON string

### get_dashboard_tiles

Načte uloženou konfiguraci. Používá se automaticky (response vrací data).

---

## Boiler plán

### plan_boiler_heating

Vytvoří plán ohřevu podle spot cen.

**Parametry:**

- `force` (volitelné): vynutit přepočet plánu
- `deadline` (volitelné): override deadline (HH:MM)

### apply_boiler_plan

Aplikuje vytvořený plán a vytvoří automatizace.

### cancel_boiler_plan

Zruší plán a odstraní automatizace.

---

## ServiceShield služby

Tyto služby používá UI a diagnostika ServiceShield:

- `oig_cloud.shield_status`
- `oig_cloud.shield_queue_info`
- `oig_cloud.shield_remove_from_queue`

Pokud nepoužíváte dashboard, typicky je nevoláte ručně.
