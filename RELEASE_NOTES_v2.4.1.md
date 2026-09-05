# OIG Cloud pro Home Assistant — poznámky k vydání 2.4.1

Verze 2.4.1 je opravné vydání pro **Home Assistant 2026.8**. Po přechodu na tuto verzi HA přestala
část integrace fungovat — na referenční instalaci se **nenačetlo 53 entit** (bojler, výstrahy ČHMÚ,
dopočítané energetické senzory a ServiceShield) a každý restart zaplavil log stovkou chyb. Všechny
nálezy v tomto vydání pocházejí z reálné instalace, ne z revize kódu.

Pokud vám po aktualizaci Home Assistantu zmizely entity bojleru nebo ServiceShieldu, je tohle
vydání pro vás.

---

## 🩹 **Co je opraveno**

### 📵 **Nenačítaly se entity (53 na referenční instalaci)**

Home Assistant 2026.8 odstranil z `DeviceInfo` položku `via_device`, kterou jsme používali k
zavěšení podřízených zařízení (bojler, analytika, ServiceShield) pod hlavní Battery Box. Starý klíč
propadl do zastaralé větve registru zařízení, a protože se tento krok odehrává čistě uvnitř jádra
HA, ohlašovač zastaralostí místo varování **vyhodil chybu a přidání entity zrušil**.

Podřízená zařízení teď deklarují jen svou identitu a vazba na Battery Box se nastavuje až po
dokončení startu. **Strom zařízení zůstává stejný jako dřív** — v Nastavení → Zařízení uvidíte
bojler i ServiceShield nadále pod Battery Boxem. Přibyla i pojistka v testech, která tuto regresi
příště zachytí dřív, než se vydá.

### 🔁 **Stovky chyb při restartu a zbytečná zátěž**

Posluchač aktivity bojleru nebyl označen jako `@callback`, takže Home Assistant posílal **každou
změnu stavu v celé instalaci** do vlákna na pozadí — jen proto, aby ji posluchač vzápětí zahodil.
Při vypínání navíc vznikalo **116 chyb `Executor shutdown has been called`** na jeden restart.
Posluchač nyní běží přímo ve smyčce událostí; jeho práce je čistě paměťová.

### 🐌 **Pomalé aktualizace senzoru „Poslední aktualizace dat"**

Senzor při každé aktualizaci procházel **všechny entity v Home Assistantu** (na referenční
instalaci 1789), a to dvakrát. HA naměřil aktualizaci trvající **2,8 s**. Výsledek se nyní krátce
drží v paměti, takže se sken neopakuje zbytečně.

### 🛡️ **Diagnostika ServiceShieldu**

Když ServiceShield zablokoval příkaz jako duplikát právě probíhajícího volání, jeho záznam se
mlčky zahodil kvůli neplatné hodnotě ve vnitřním kontraktu (chyba se projevila jen u běžícího
volání, u fronty ne). Opraveno. Navíc se do logu nově vypisuje i text chyby, ne pouze její typ —
dřív z hlášky nešlo poznat, co je špatně.

### ⏱️ **Blokující čtení souboru v hlavní smyčce**

Modul telemetrie ServiceShieldu načítal `manifest.json` už při importu, tedy uvnitř smyčky
událostí, na což Home Assistant upozorňoval varováním. Verze se nyní zjišťuje až při první potřebě
a mimo smyčku.

---

## 📈 **Výsledek na referenční instalaci**

| | Před | Po |
|---|---|---|
| Nedostupné entity OIG | 54 | 1 |
| Chyby a varování „oig" po startu | desítky | **0** |
| Entity ServiceShieldu | nedostupné | aktivní |

---

## ⬆️ **Aktualizace**

Přes HACS jako obvykle, poté restart Home Assistantu. Konfigurace ani entity se nemění, žádný
zásah z vaší strany není potřeba.

## 🔎 **Známá omezení**

- Hodinová **AI analýza** zatím nedostává podklady o cenách a plánu nabíjení — kvůli chybě v
  sestavení interního dotazu jí místo dat chodí „nedostupné". Oprava a rozšíření podkladů se
  chystá do dalšího vydání.
