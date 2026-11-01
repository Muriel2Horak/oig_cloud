# OIG Cloud pro Home Assistant — poznámky k vydání 2.4.7

Verze 2.4.7 dokončuje úklid po rychlejším startu a opravuje senzory, které zůstávaly bez hodnoty.

---

## ⚡ **Plán hned po restartu**

První přepočet plánu po restartu znovu četl všechny minulé intervaly z databáze a mohl trvat minuty. Uzavřené intervaly
se teď ukládají, takže po restartu není potřeba je číst znovu.

## 🧹 **Senzory bez hodnoty**

- **Napětí a výkon sítě** v rozšířených senzorech se teď doplní z živých hodnot, pokud je rozšířená data nemají.
- **Doba reakce režimu** se ukáže hned po načtení historie, ne až po dalším přepnutí.
- **Senzor „Upravené spotové ceny elektřiny"** je odstraněný. Nikdy neměl implementaci, takže nemohl mít hodnotu.
  Při aktualizaci zmizí sám. Pokud ho používáte v automatizaci nebo na kartě, přejděte na aktuální spotovou cenu.
