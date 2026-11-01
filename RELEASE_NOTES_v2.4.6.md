# OIG Cloud pro Home Assistant — poznámky k vydání 2.4.6

Verze 2.4.6 zrychluje **start Home Assistantu**, opravuje výpočet **účinnosti baterie** a výpadek cen po restartu.

---

## 🚀 **Rychlejší start Home Assistantu**

Home Assistant při startu čekal na integraci i několik minut, hlavně na senzory, které četly 30 dní historie.
Tahle práce teď běží na pozadí a po restartu se neopakuje, pokud už pro daný den hotová je. Při měření klesl jeden
start z 507 s na 99 s a samotná integrace na 2,9 s. Čas startu dál závisí i na ostatních integracích a zařízení.

## 🔋 **Účinnost baterie**

- **Opačné znaménko ve výpočtu.** Energie odebraná z baterie se za měsíc přičítala místo odečítala. Hodnoty nad
  100 % se pak zobrazily jako bezeztrátových 100 %. Účinnost i ztráty teď odpovídají energetické bilanci.
- **Rozběhnutý měsíc nepočítal s energií v baterii.** První den měsíce proto vycházelo třeba 32 % a „−68 % vs minulý
  měsíc". Teď se uložená energie započítá a srovnání se ukáže až po týdnu dat.

Hodnoty jsou dál měřené na článcích (DC), takže ztráty v měniči v nich nejsou.

## ⚡ **Ceny hned po restartu**

Volitelné senzory se přidávaly v jedné dávce, takže jeden pomalý na několik minut schoval ostatní, včetně cen pro
kartu Toky. Každá skupina má teď vlastní dávku, takže pomalý senzor zdrží jen svou skupinu.
