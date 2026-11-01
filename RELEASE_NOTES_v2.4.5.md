# OIG Cloud pro Home Assistant — poznámky k vydání 2.4.5

Verze 2.4.5 opravuje kartu **Plán & realita**, která ukazovala něco jiného, než co box opravdu dělal. Plánovač
se nemění, oprava se týká záznamu a zobrazení.

---

## 📊 **Režimy teď odpovídají realitě**

- **Přepnutí se zapisovala o interval později.** Box přepíná přibližně minutu po příkazu a záznam bral režim ze
  začátku intervalu. Každé přepnutí tak vypadalo o 15 minut pozdě a jako odchylka od plánu. Teď rozhoduje režim,
  který v intervalu převažoval.
- **Dlaždice ukazovaly plán místo skutečnosti.** Proběhlé bloky a právě běžící blok teď ukazují skutečný režim,
  budoucí bloky plán. Odchylka má dál značku „!" a plánovaný režim najdete v popisku.
- **Jedna dlaždice spojovala minulost s budoucností.** Dnešní bloky se teď dělí na hranici mezi skutečností
  a plánem.
- **Počet přepnutí** teď počítá jen skutečné změny režimu.

Soulad s plánem proto může vyjít jinak než dřív, typicky vyšší, protože zmizely falešné odchylky. Uložené
archivy minulých dnů zůstávají beze změny.
