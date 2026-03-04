# Jak vyčistit cache pro V2 Dashboard

## Problém
Safari zobrazuje správný 3-sloupcový layout, ale Chrome/Edge zobrazuje starou verzi.

## Příčina
Chrome má agresivnější cache pro iframe obsah než Safari.

## Řešení pro Chrome/Edge

### Metoda 1: DevTools Clear Cache (DOPORUČENO)
1. Otevřete V2 Dashboard v Chrome
2. Stiskněte **F12** (otevře DevTools)
3. **Pravým tlačítkem myši na ikonu Refresh** (vedle adresního řádku)
4. V menu vyberte: **"Empty Cache and Hard Reload"** nebo **"Vyprázdnit mezipaměť a pevné znovu načtení"**

### Metoda 2: Manuální vyčištění site data
1. Otevřete V2 Dashboard
2. Stiskněte **F12**
3. Přejděte na záložku **Application** (nebo **Aplikace**)
4. V levém menu: **Storage** → **Clear site data**
5. Zaškrtněte všechny položky
6. Klikněte **"Clear site data"**
7. Zavřete DevTools a obnovte stránku (**Ctrl+Shift+R**)

### Metoda 3: Vyčištění celé cache Chrome
1. Menu **⋮** (tři tečky) → **Settings** (Nastavení)
2. **Privacy and security** (Soukromí a zabezpečení)
3. **Clear browsing data** (Vymazat data prohlížení)
4. Vyberte **"Cached images and files"** (Obrázky a soubory uložené v mezipaměti)
5. Časový rozsah: **"All time"** (Celou dobu)
6. Klikněte **"Clear data"**

### Metoda 4: Inkognito režim (pro test)
1. Otevřete nové **Inkognito okno** (**Ctrl+Shift+N**)
2. Přihlaste se do HA
3. Otevřete V2 Dashboard
4. Měli byste vidět správný layout jako v Safari

## Po vyčištění cache
Obnovte stránku a měli byste vidět stejný 3-sloupcový layout jako v Safari.

## Proč Safari funguje správně?
Safari má jinou strategii cachování pro iframe obsah a častěji kontroluje aktualizace.
