/**
 * Dashboard Tile Manager
 * Správa konfigurace dynamických dlaždic na OIG Dashboard
 */

class DashboardTileManager {
    constructor(hass) {
        this.hass = hass;
        this.config = this.loadConfig();
        this.listeners = [];
    }

    /**
     * Načíst konfiguraci z localStorage
     */
    loadConfig() {
        try {
            const stored = localStorage.getItem('oig_dashboard_tiles');
            if (stored) {
                const config = JSON.parse(stored);
                console.log('📦 Loaded tile config from localStorage:', config);
                return config;
            }
        } catch (e) {
            console.error('❌ Failed to load tile config:', e);
        }

        // Default konfigurace - 6 prázdných dlaždic na každé straně
        const defaultConfig = this.getDefaultConfig();

        // Pokusit se načíst z HA storage (async, takže to může trvat)
        this.loadFromHAStorage();

        return defaultConfig;
    }

    /**
     * Načíst konfiguraci z HA storage (async)
     */
    async loadFromHAStorage() {
        try {
            const hass = window.hass || this.hass;
            if (!hass) {
                console.warn('⚠️ Cannot load from HA storage - no hass connection');
                return;
            }

            // TODO: Implementovat načtení z HA storage přes WebSocket
            // const result = await hass.callWS({
            //     type: 'oig_cloud/get_dashboard_tiles'
            // });

            console.log('ℹ️ HA storage load not yet implemented');
        } catch (e) {
            console.error('❌ Failed to load from HA storage:', e);
        }
    }

    /**
     * Výchozí konfigurace
     */
    getDefaultConfig() {
        return {
            tiles_left: Array(6).fill(null),
            tiles_right: Array(6).fill(null),
            left_count: 6,
            right_count: 6,
            visible: true,  // ZMĚNĚNO: Default je nyní TRUE (viditelné)
            version: 1
        };
    }

    /**
     * Uložit konfiguraci do localStorage
     */
    saveConfig() {
        try {
            localStorage.setItem('oig_dashboard_tiles', JSON.stringify(this.config));
            console.log('💾 Saved tile config to localStorage:', this.config);
            this.notifyListeners();

            // Debounced sync do HA (TODO: Fáze 4)
            this.scheduleSyncToHA();
        } catch (e) {
            console.error('❌ Failed to save tile config:', e);
        }
    }

    /**
     * Nastavit dlaždici
     */
    setTile(side, index, tileConfig) {
        const key = `tiles_${side}`;
        if (!this.config[key]) {
            console.error(`❌ Invalid side: ${side}`);
            return;
        }

        if (index < 0 || index >= this.config[key].length) {
            console.error(`❌ Invalid index: ${index}`);
            return;
        }

        console.log(`🔧 Setting tile [${side}][${index}]:`, tileConfig);
        this.config[key][index] = tileConfig;
        this.saveConfig();
    }

    /**
     * Odebrat dlaždici
     */
    removeTile(side, index) {
        console.log(`🗑️ Removing tile [${side}][${index}]`);
        this.setTile(side, index, null);
    }

    /**
     * Získat dlaždici
     */
    getTile(side, index) {
        const key = `tiles_${side}`;
        if (!this.config[key]) return null;
        return this.config[key][index];
    }

    /**
     * Získat všechny dlaždice na straně
     */
    getTiles(side) {
        const key = `tiles_${side}`;
        return this.config[key] || [];
    }

    /**
     * Resetovat konfiguraci
     */
    reset() {
        console.log('🔄 Resetting tile config to defaults');
        this.config = this.getDefaultConfig();
        this.saveConfig();
    }

    /**
     * Přidat listener pro změny
     */
    addChangeListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Odebrat listener
     */
    removeChangeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    /**
     * Notifikovat listenery o změně
     */
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.config);
            } catch (e) {
                console.error('❌ Listener error:', e);
            }
        });
    }

    /**
     * Naplánovat sync do HA (debounced)
     */
    scheduleSyncToHA() {
        // Zrušit předchozí timeout
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }

        // Naplánovat sync za 2 sekundy
        this.syncTimeout = setTimeout(() => {
            this.syncToHA();
        }, 2000);
    }

    /**
     * Sync konfigurace do Home Assistant
     */
    async syncToHA() {
        // Try multiple methods to get hass
        const hass = (typeof getHass === 'function' ? getHass() : null) ||
                     window.hass ||
                     this.hass;

        if (!hass) {
            console.warn('⚠️ Cannot sync to HA: hass not available');
            return;
        }

        try {
            console.log('☁️ Syncing config to HA...');

            // Volání služby s celou konfigurací jako JSON string
            await hass.callService('oig_cloud', 'save_dashboard_tiles', {
                config: JSON.stringify(this.config)
            });

            console.log('✅ Config synced to HA successfully');
        } catch (e) {
            console.error('❌ Failed to sync to HA:', e);
        }
    }

    /**
     * Načíst konfiguraci z HA
     * TODO: Implementovat v Fázi 4
     */
    async loadFromHA() {
        if (!this.hass) {
            console.warn('⚠️ Cannot load from HA: hass not available');
            return null;
        }

        try {
            console.log('☁️ Loading config from HA...');
            // TODO: Call service to get config
            // const result = await this.hass.callWS({ type: 'oig_cloud/get_dashboard_config' });
            // return result;
            return null;
        } catch (e) {
            console.warn('⚠️ Failed to load from HA:', e);
            return null;
        }
    }

    /**
     * Helper: Získat barvu podle domény entity
     */
    getColorFromDomain(entityId) {
        if (!entityId) return '#9E9E9E';

        const domain = entityId.split('.')[0];
        const colors = {
            'sensor': '#03A9F4',
            'binary_sensor': '#FF9800',
            'switch': '#4CAF50',
            'light': '#FFC107',
            'climate': '#2196F3',
            'cover': '#9C27B0',
            'fan': '#00BCD4',
            'media_player': '#E91E63'
        };

        return colors[domain] || '#9E9E9E';
    }

    /**
     * Export konfigurace jako JSON (pro backup)
     */
    export() {
        return JSON.stringify(this.config, null, 2);
    }

    /**
     * Import konfigurace z JSON (pro restore)
     */
    import(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            if (imported.tiles_left && imported.tiles_right) {
                this.config = imported;
                this.saveConfig();
                console.log('✅ Imported config successfully');
                return true;
            } else {
                console.error('❌ Invalid config format');
                return false;
            }
        } catch (e) {
            console.error('❌ Failed to import config:', e);
            return false;
        }
    }

    /**
     * Nastavit počet dlaždic pro stranu
     */
    setTileCount(side, count) {
        const parsedCount = parseInt(count);
        if (isNaN(parsedCount) || parsedCount < 0 || parsedCount > 6) {
            console.error(`❌ Invalid tile count: ${count}`);
            return;
        }

        const key = `${side}_count`;
        console.log(`🔢 Setting tile count for ${side}: ${parsedCount}`);
        this.config[key] = parsedCount;

        // Pokud snížíme počet, ořežeme pole
        const tilesKey = `tiles_${side}`;
        if (this.config[tilesKey].length > parsedCount) {
            this.config[tilesKey] = this.config[tilesKey].slice(0, parsedCount);
        }

        // Pokud zvýšíme počet, doplníme null
        while (this.config[tilesKey].length < parsedCount) {
            this.config[tilesKey].push(null);
        }

        this.saveConfig();
    }

    /**
     * Získat počet dlaždic pro stranu
     */
    getTileCount(side) {
        const key = `${side}_count`;
        return this.config[key] || 6;
    }

    /**
     * Přepnout viditelnost sekce dlaždic
     */
    toggleVisibility() {
        this.config.visible = !this.config.visible;
        console.log(`👁️ Toggling tiles visibility: ${this.config.visible}`);
        this.saveConfig();
    }

    /**
     * Získat viditelnost sekce
     */
    isVisible() {
        return this.config.visible !== false; // Default true
    }
}

// Export pro použití v ostatních souborech
window.DashboardTileManager = DashboardTileManager;
