# Analýza události: přetížení zálohy / možný bypass, 17:05:45

PŘÍČINA: Trvalé přetížení záložní fáze T — držela se kolem 3 650 W, tedy zhruba 350 W nad limitem 3 300 W, nepřetržitě po celé 4 minuty před událostí.

DŮKAZ:
- Fáze T nesla celou dobu 3 570–3 690 W (průměr ~3 640 W), zatímco fáze R a S jen ~400 W a ~100 W — nešlo o špičku, ale o setrvalý stav nad limitem.
- Ostatní podezřelé byly v pořádku: baterie měla 71–72 % a bez potíží dodávala ~2 000 W, střídač měl stabilních 38 °C, síť držela 243–244 V a 50,0 Hz a žádný náhlý skok odběru se neobjevil.

PRO MAJITELE: Na fázi T v záloze běží velký jednofázový spotřebič (odhadem ~3,5 kW), který sám o sobě překračuje, co záloha na jedné fázi unese — proto se box přepnul na bypass. Pomůže přepojit tento spotřebič na fázi S (ta je téměř prázdná), případně nepouštět dva velké spotřebiče na stejné fázi najednou.
