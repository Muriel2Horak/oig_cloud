# OIG Cloud pro Home Assistant — poznámky k vydání 2.4.4

Verze 2.4.4 mění způsob, jakým plánovač vybírá nabíjení ze sítě, a opravuje ceny, ze kterých přitom
vychází. Přináší také záznam plánu a skutečnosti, díky kterému jde jeho rozhodnutí zpětně ověřit.

---

## 🔑 **Změna přihlášení k OIG Cloud**

Kdo si změnil heslo, neměl dosud kde zadat nové, dokud integrace nenahlásila neúspěšné přihlášení.
Přihlášení je teď v **Nastavení integrace → Přihlášení k OIG Cloud** a také pod položkou
**Překonfigurovat** v Home Assistantu. Nové údaje se před uložením ověří, takže překlep nic nerozbije.

## 🌙 **Samostatný krok pro Home 5 a Home 6**

Přepínač **Box má Home 5/6** v Modulech teď otevře vlastní krok průvodce. Pásmo Home 6 se v něm vybírá
ve stejné hodinové mřížce jako NT a VT a zapíše se do boxu. Projeví se až po zapnutí Home 6 v ovládacím
panelu. V pásmu se vypne záložní výstup a FVE nevyrábí, takže při výpadku sítě tehdy nefunguje záloha.

## 🔋 **Plánovač vybírá nabíjení optimalizátorem**

Přehrání na roce skutečných dat: **11 822 Kč místo 12 305 Kč**, 1 741 přepnutí režimu místo 4 728
a žádné vynucené dobití místo 5. Volby „komfortní SoC" a „percentil drahých hodin" už nejsou potřeba
a z nastavení zmizely. Důvody rozhodnutí se v plánu zobrazují česky.

## 💰 **Správný tarif NT/VT**

Plánovač a ceny teď počítají s distribucí podle nastavených hodin NT a VT. Dřív mohl kvůli špatné
sazbě nabíjet v hodinách, které ve skutečnosti levné nebyly.

## 📈 **Plán a skutečnost**

Každý uzavřený den se ukládá i se skutečnými hodnotami, změny plánu během dne se zaznamenávají
a měří se přesnost předpovědi. Solární korekce se z tohoto archivu učí.

## 🛠️ **Další opravy**

- Po restartu už se nezobrazuje plochý plán 0,5 kWh na interval. Plánovač počká na data o spotřebě,
  nejdéle 20 minut, a střídač mezitím zůstane v posledním režimu.
- Přepínač **Home 5/6** se přesunul z nastavení bojleru do **Modulů**. Uložená hodnota zůstává.
- Simulátor začíná z aktuálního návrhu a v grafu ukazuje skutečná data předvolby.
- Karta Bojler má nový pruh s plánem a skutečností.
- Ochranná doba mezi přepnutími režimu je zkrácená na pět minut.
