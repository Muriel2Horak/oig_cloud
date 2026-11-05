# OIG Cloud pro Home Assistant — poznámky k vydání 2.4.11

Verze 2.4.11 uklízí po ručním uvolnění starého záznamu psimsa/oig_cloud v Marketplace.

---

## 🧹 **Osiřelá entita `update.oig_cloud_cbb_update` zmizí sama**

Kdo starý záznam `psimsa/oig_cloud` uvolnil ručně podle návodu k 2.4.10 (přes File editor nebo terminál),
tomu v Home Assistantu zůstala nedostupná entita `update.oig_cloud_cbb_update`. Pokud měla nastavenou oblast,
v Nastavení visela i oprava „Entita update.oig_cloud_cbb_update má oblast, ale nemá vlastní název“.

Verze 2.4.11 po startu Home Assistanta tuto entitu i její zařízení smaže, jakmile záznam psimsa už není
veden jako nainstalovaný. S ní zmizí i oprava. Entitu vaší integrace OIG Cloud ani jiné doplňky z Marketplace
nemění.

Automatické uvolnění záznamu z verze 2.4.10 zůstává. Kdo je ještě na Home Assistant 2026.10, ať nejdřív
aktualizuje OIG Cloud a teprve potom Home Assistant. Kdo už má 2026.11 a Marketplace mu aktualizaci odmítá,
postupuje podle poznámek k vydání 2.4.10.
