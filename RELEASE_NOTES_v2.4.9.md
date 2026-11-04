# OIG Cloud pro Home Assistant — poznámky k vydání 2.4.9

Verze 2.4.9 opravuje dvojí počítání nákladů za odběr a výdělku za dodávku do sítě.

---

## 💸 **Náklady za odběr se počítaly dvakrát**

Od verze 2.4.7 mohly senzory nákladů za odběr (`computed_grid_import_cost_*`) i výdělku za dodávku
(`computed_grid_export_earnings_*`) ukazovat zhruba dvojnásobek skutečné částky. Týká se to denních, měsíčních
i ročních hodnot, po fázích i celkových.

Náklady se sčítají na dvou místech a každé mělo vlastní hodiny. Když senzor nákladů dostal novou hodnotu dřív
než senzory baterie, započítala se stejná půlminuta dvakrát. Verze 2.4.7 změnila pořadí, v jakém se senzory
registrují, a právě to pořadí nastalo. Teď obě místa sdílejí jedny hodiny, takže se každý úsek započítá jednou.

Denní hodnota se srovná sama o půlnoci. Měsíční a roční součty si nadsazenou částku nesou až do svého vynulování.
