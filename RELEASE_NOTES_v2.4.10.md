# OIG Cloud pro Home Assistant — poznámky k vydání 2.4.10

Verze 2.4.10 opravuje integraci pro Home Assistant 2026.11. Popisuje také, co dělat, když Marketplace aktualizaci odmítne.

---

## 🔌 **Na HA 2026.11 chyběla většina senzorů**

Home Assistant 2026.11 změnil `DeviceInfo` ze slovníku na třídu. Integrace takové senzory považovala za chybné
a vůbec je nezaregistrovala. V logu je u nich hláška `has invalid device_info type`. Zmizely mimo jiné
výkony a toky ze sítě, stav baterie a vypočtené senzory, takže byly nedostupné i grafy a ochrana režimů.
Verze 2.4.10 přijímá oba tvary. Po aktualizaci a restartu se senzory vrátí s původními ID i historií.

## 🛒 **Marketplace hlásí „The oig_cloud directory belongs to psimsa/oig_cloud“**

HA 2026.11 nahradil HACS vestavěným Marketplace a převzal z HACS seznam nainstalovaných repozitářů. Kdo
kdysi nainstaloval původní repozitář `psimsa/oig_cloud` a pak přešel na tento, má v Marketplace oba
záznamy označené jako nainstalované. Marketplace pak odmítne aktualizaci s hláškou výše.

**V Marketplace ani neodinstalovávejte psimsa/oig_cloud, ani nemažte integraci OIG Cloud.** Obě položky
sdílejí složku `custom_components/oig_cloud`, takže odinstalace by smazala i tuto integraci a mazání
integrace by smazalo její nastavení.

Stačí jednou zrušit příznak „nainstalováno“ u starého záznamu. Otevřete *Terminal* doplňku
*Advanced SSH & Web Terminal* (obsahuje `python3`) a vložte celý blok. Home Assistant se zastaví a za pár minut
znovu nastartuje. Webový terminál se mezitím odpojí, úprava ale běží na pozadí dál. Po startu by měl příkaz
`cat /tmp/psimsa.log` vypsat `Uvolněno: psimsa/oig_cloud`.

```bash
cat > /tmp/psimsa.py <<'PY'
import json, shutil
path = "/config/.storage/marketplace.repositories"
shutil.copy(path, path + ".bak")
with open(path, encoding="utf-8") as f:
    store = json.load(f)
for repo in store["data"].values():
    if repo.get("full_name", "").lower() == "psimsa/oig_cloud":
        repo.update(installed=False, version_installed=None, installed_commit=None)
        print("Uvolněno:", repo["full_name"])
with open(path, "w", encoding="utf-8") as f:
    json.dump(store, f, indent=2, ensure_ascii=False)
PY
nohup sh -c 'ha core stop; python3 /tmp/psimsa.py; ha core start' > /tmp/psimsa.log 2>&1 &
```

Potom aktualizujte OIG Cloud jako obvykle: Nastavení → Aktualizace, nebo Nastavení → Marketplace. Zálohu původního záznamu najdete v souboru
`marketplace.repositories.bak`. Entitu `update.oig_cloud_cbb_update` starého repozitáře pak můžete smazat.
