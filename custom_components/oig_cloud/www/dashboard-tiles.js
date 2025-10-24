/**
 * Dashboard Tile Manager
 * Správa konfigurace dynamických dlaždic na OIG Dashboard
 */

class DashboardTileManager {
    constructor(hass) {
        this.hass = hass;
        this.config = null; // Bude načteno v init()
        this.listeners = [];
        this.isInitialized = false;
    }

    /**
     * Asynchronní inicializace - načte konfiguraci z HA storage
     * MUSÍ se zavolat před použitím!
     */
    async init() {
        if (this.isInitialized) {
            console.log('⚠️ TileManager already initialized');
            return;
        }

        console.log('🔄 Initializing TileManager...');

        // Pokus načíst z HA storage JAKO PRVNÍ
        const haConfig = await this.loadFromHAStorage();

        if (haConfig) {
            console.log('✅ Using config from HA storage');
            this.config = haConfig;
        } else {
            // Pokud není v HA, zkusit localStorage
            try {
                const stored = localStorage.getItem('oig_dashboard_tiles');
                if (stored) {
                    this.config = JSON.parse(stored);
                    console.log('📦 Using config from localStorage fallback');
                } else {
                    this.config = this.getDefaultConfig();
                    console.log('🆕 Using default config');
                }
            } catch (e) {
                console.error('❌ Failed to load from localStorage:', e);
                this.config = this.getDefaultConfig();
            }
        }

        // Synchronizovat do localStorage jako cache
        try {
            localStorage.setItem('oig_dashboard_tiles', JSON.stringify(this.config));
        } catch (e) {
            console.error('❌ Failed to cache to localStorage:', e);
        }

        this.isInitialized = true;
        console.log('✅ TileManager initialized with config:', this.config);

        // Notifikovat listenery o dokončení načtení
        this.notifyListeners();
    }

    /**
     * Načíst konfiguraci z HA storage (async)
     */
    async loadFromHAStorage() {
        try {
            const hass = window.hass || this.hass;
            if (!hass) {
                console.warn('⚠️ Cannot load from HA storage - no hass connection');
                return null;
            }

            console.log('☁️ Loading config from HA storage...');

            // Použít WebSocket API přímo pro kompatibilitu Safari + Chrome
            const response = await hass.callWS({
                type: 'call_service',
                domain: 'oig_cloud',
                service: 'get_dashboard_tiles',
                service_data: {},
                return_response: true
            });

            if (response && response.response && response.response.config) {
                console.log('✅ Config loaded from HA storage:', response.response.config);
                return response.response.config;
            } else {
                console.log('ℹ️ No config found in HA storage');
                return null;
            }
        } catch (e) {
            console.error('❌ Failed to load from HA storage:', e);
            return null;
        }
    }

    /**
     * Výchozí konfigurace
     */
    getDefaultConfig() {
        return {
            tiles_left: Array(6).fill(null),  // 2×3 nebo 3×2 grid = 6 dlaždic
            tiles_right: Array(6).fill(null), // 2×3 nebo 3×2 grid = 6 dlaždic
            left_count: 6,
            right_count: 6,
            visible: true,  // ZMĚNĚNO: Default je nyní TRUE (viditelné)
            version: 1
        };
    }

    /**
     * Uložit konfiguraci do localStorage a HA storage
     */
    saveConfig() {
        if (!this.isInitialized || !this.config) {
            console.warn('⚠️ Cannot save - TileManager not initialized yet');
            return;
        }

        try {
            // Uložit do localStorage jako cache
            localStorage.setItem('oig_dashboard_tiles', JSON.stringify(this.config));
            console.log('💾 Saved tile config to localStorage cache:', this.config);
            this.notifyListeners();

            // VŽDY synchronizovat do HA storage (debounced)
            this.scheduleSyncToHA();
        } catch (e) {
            console.error('❌ Failed to save tile config to localStorage:', e);
            // I když selže localStorage, zkusíme sync do HA
            this.scheduleSyncToHA();
        }
    }

    /**
     * Nastavit dlaždici
     */
    setTile(side, index, tileConfig) {
        if (!this.isInitialized || !this.config) {
            console.warn('⚠️ Cannot set tile - TileManager not initialized yet');
            return;
        }

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
        if (!this.isInitialized || !this.config) return null;
        const key = `tiles_${side}`;
        if (!this.config[key]) return null;
        return this.config[key][index];
    }

    /**
     * Získat všechny dlaždice na straně
     */
    getTiles(side) {
        if (!this.isInitialized || !this.config) return [];
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
        if (isNaN(parsedCount) || parsedCount < 0 || parsedCount > 6) {  // Max 6 pro 2×3 nebo 3×2 grid
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
