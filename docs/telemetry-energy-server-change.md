# Změna serveru pro anonymní data o energii (ke schválení)

Týká se `docker-vm` (stack `/srv/control-stack/oig-telemetry`) a O2 modemu. Nic z toho zatím není provedené.

## 0. Nález: ACL mosquitta se nepoužívá

`mosquitto.conf` má `allow_anonymous true` a chybí v něm `acl_file`. Soubor `acl.txt` (anonymní smí jen zapisovat `oig/telemetry/#`) tedy broker nečte. Kdokoli, kdo se připojí na `telemetry.muriel-cz.cz:1883`, může odebírat veškerou telemetrii. `acl.txt` navíc nezná téma integrace `oig/cloud-telemetry/#`, takže pouhé zapnutí ACL by telemetrii integrace zablokovalo. Proto ACL níže rozšiřuji.

## 1. `mosquitto/acl.txt`

```diff
 # Anonymous devices (field boxes) can only publish to telemetry topic
 topic write oig/telemetry/#
+topic write oig/cloud-telemetry/#
+topic write oig/energy/#

 # Authenticated user (telegraf) can read telemetry topic and manage internal topics
 user telegraf
 topic read oig/telemetry/#
+topic read oig/cloud-telemetry/#
+topic read oig/energy/#
 topic readwrite $SYS/#
```

## 2. `mosquitto/mosquitto.conf`

```diff
 listener 1883
 allow_anonymous true
+
+listener 8883
+allow_anonymous true
+certfile /mosquitto/certs/fullchain.pem
+keyfile /mosquitto/certs/privkey.pem
+
+acl_file /mosquitto/config/acl.txt
+password_file /mosquitto/config/passwd
```

(`password_file` doplnit, jen pokud v konfiguraci ještě není, telegraf se přihlašuje jako `telegraf`.)

## 3. `docker-compose.yml` (služba `mosquitto`)

```diff
     ports:
       - "1883:1883"
+      - "8883:8883"
       - "9001:9001"
     volumes:
       - ./mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
       - ./mosquitto/passwd:/mosquitto/config/passwd
+      - ./mosquitto/acl.txt:/mosquitto/config/acl.txt:ro
+      - /srv/control-stack/oig-edge/certs/fullchain.pem:/mosquitto/certs/fullchain.pem:ro
+      - /srv/control-stack/oig-edge/certs/privkey.pem:/mosquitto/certs/privkey.pem:ro
```

Po obnově certifikátu (acme.sh) je potřeba mosquitto restartovat. Do `renewal-hooks` patří `docker restart ctrl-mosquitto`.

## 4. Telegraf (`telegraf/telegraf.conf`)

```toml
[[inputs.mqtt_consumer]]
  name_override = "energy_slots"
  servers = ["tcp://mosquitto:1883"]
  topics = ["oig/energy/#"]
  username = "${MQTT_USERNAME}"
  password = "${MQTT_PASSWORD}"
  data_format = "json_v2"
  [[inputs.mqtt_consumer.json_v2]]
    measurement_name = "energy_slots"
    [[inputs.mqtt_consumer.json_v2.tag]]
      path = "install_id"
    [[inputs.mqtt_consumer.json_v2.object]]
      path = "slots"
      timestamp_key = "t"
      timestamp_format = "unix"
      disable_prepend_keys = true

[[inputs.mqtt_consumer]]
  name_override = "energy_box"
  servers = ["tcp://mosquitto:1883"]
  topics = ["oig/energy/#"]
  username = "${MQTT_USERNAME}"
  password = "${MQTT_PASSWORD}"
  data_format = "json_v2"
  [[inputs.mqtt_consumer.json_v2]]
    measurement_name = "energy_box"
    timestamp_path = "sent_at"
    timestamp_format = "unix"
    [[inputs.mqtt_consumer.json_v2.tag]]
      path = "install_id"
    [[inputs.mqtt_consumer.json_v2.field]]
      path = "box.capacity_kwh"
    [[inputs.mqtt_consumer.json_v2.field]]
      path = "box.bat_min_pct"
    [[inputs.mqtt_consumer.json_v2.field]]
      path = "box.charge_kw"
    [[inputs.mqtt_consumer.json_v2.field]]
      path = "integration_version"
      type = "string"

[[outputs.influxdb_v2]]
  # urls, token and organization as in the existing outputs
  bucket = "energy"
  namepass = ["energy_slots", "energy_box"]
```

Do stávajícího výstupu `bucket = "telemetry"` doplnit `namedrop = ["energy_slots", "energy_box"]`, aby se data neukládala dvakrát.

## 5. InfluxDB

Nový bucket `energy` s retencí 365 dní:

```bash
docker exec ctrl-influxdb influx bucket create --name energy --retention 365d --org <org>
```

## 6. O2 modem

Forward TCP 8883 na 10.0.0.161:8883, stejně jako dnes 1883.

## Pořadí a návrat

1. Bucket, telegraf a ACL s rozšířením. Ověřit, že telemetrie integrace i proxy dál chodí (`telemetry_top` a `cloud_telemetry_events` přibývají).
2. Listener 8883 a port forward.
3. Návrat: záloha `mosquitto.conf`, `acl.txt`, `docker-compose.yml` a `telegraf.conf` s příponou `.bak-energy-<datum>`, pak `docker compose up -d`.
