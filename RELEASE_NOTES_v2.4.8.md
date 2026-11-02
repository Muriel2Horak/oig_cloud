# OIG Cloud pro Home Assistant — poznámky k vydání 2.4.8

Verze 2.4.8 ukazuje, proč plánovač drží UPS, a opravuje ocenění energie, která zbude v baterii na konci plánu.

---

## 🧮 **Kolik by stál Home 1 místo UPS**

Nadcházející dlaždice UPS na kartě **Plán & realita** teď ukazují třeba „Home 1: +1,34". Je to rozdíl, který spočítal plánovač
pro začátek bloku, včetně ztrát nabíjení a vybíjení, opotřebení, přepnutí režimu a hodnoty energie na konci plánu.

## 🔋 **Hodnota energie na konci plánu**

Energie, která zbyla v baterii, se oceňovala podle denního mediánu ceny. Po drahém dni to bylo víc, než kolik stojí její
dokoupení v levných hodinách na konci plánu, a plán pak držel baterii místo toho, aby klesl a levně ji dobil. Teď má energie
hodnotu nejvýš ceny svého dokoupení.

Při přehrání celého roku to ušetřilo asi 5 Kč, počet přepnutí ani zásahy boxu se nezměnily. Plán se průběžně přepočítává,
takže většinu chyby už dřív sám dorovnal. Jde tedy hlavně o to, aby plán dával smysl, ne o velkou úsporu.
