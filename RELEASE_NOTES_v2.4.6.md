# OIG Cloud pro Home Assistant — poznámky k vydání 2.4.6

Verze 2.4.6 opravuje výpočet **účinnosti baterie** a výpadek cen po restartu Home Assistantu.

---

## 🔋 **Účinnost baterie**

- **Opačné znaménko ve výpočtu.** Energie odebraná z baterie se za měsíc přičítala místo odečítala. Hodnoty nad
  100 % se pak zobrazily jako bezeztrátových 100 %. Účinnost i ztráty teď odpovídají energetické bilanci.
- **Rozběhnutý měsíc nepočítal s energií v baterii.** První den měsíce proto vycházelo třeba 32 % a „−68 % vs minulý
  měsíc". Teď se uložená energie započítá a srovnání se ukáže až po týdnu dat.

Hodnoty jsou dál měřené na článcích (DC), takže ztráty v měniči v nich nejsou.

## ⚡ **Ceny hned po restartu**

Volitelné senzory se přidávaly v jedné dávce, takže jeden pomalý na několik minut schoval ostatní, včetně cen pro
kartu Toky. Každá skupina má teď vlastní dávku, takže pomalý senzor zdrží jen svou skupinu.
