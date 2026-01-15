/**
 * Dashboard Tile Config Dialog
 * Dialog pro konfiguraci dlaždic - výběr entity nebo tlačítka
 */

/**
 * Helper: Render ikonu pro picker a preview (emoji protože ha-icon nefunguje v iframe)
 */
function renderIconHTML(icon, color = 'var(--text-primary)') {
    if (!icon) return '';

    // MDI ikona (formát mdi:xxx) - převést na emoji
    if (icon.startsWith('mdi:')) {
        const iconName = icon.substring(4); // Odstranit 'mdi:' prefix
        const emoji = globalThis.DashboardUtils?.getIconEmoji?.(iconName) || '⚙️';
        return `<span style="font-size: 28px; color: ${color};">${emoji}</span>`;
    }

    // Emoji nebo jiný text
    return icon;
}

function normalizeEntityId(entityId) {
    return String(entityId).replaceAll('.', '_');
}

function escapeAttrValue(value) {
    return String(value)
        .replaceAll("'", '&#39;')
        .replaceAll('"', '&quot;');
}

class TileConfigDialog {
    constructor(hass, tileManager) {
        this.hass = hass;
        this.tileManager = tileManager;
        this.index = null;
        this.side = null;
        this.currentTab = 'entity';

        this.createDialog();
        this.setupEventListeners();
    }

    _getSupportEntityIds(prefix, number) {
        const base = prefix ? `${prefix}-support-entity-${number}` : `support-entity-${number}`;
        return {
            listId: `${base}-list`,
            hiddenId: base,
            searchId: `${base}-search`
        };
    }

    _filterEntityList(listSelector, searchText) {
        const items = document.querySelectorAll(listSelector);
        const search = searchText.toLowerCase();

        items.forEach(item => {
            const entityId = item.dataset.entityId;
            const state = this.hass.states[entityId];
            const name = (state.attributes.friendly_name || entityId).toLowerCase();

            item.style.display = name.includes(search) || entityId.toLowerCase().includes(search)
                ? ''
                : 'none';
        });
    }

    _filterSupportEntities(prefix, number, searchText, selectHandler) {
        const ids = this._getSupportEntityIds(prefix, number);
        const listDiv = document.getElementById(ids.listId);
        const hiddenInput = document.getElementById(ids.hiddenId);

        if (!searchText.trim()) {
            listDiv.style.display = 'none';
            hiddenInput.value = '';
            return;
        }

        const search = searchText.toLowerCase();
        const filtered = this.supportEntities.filter(entityId => {
            const state = this.hass.states[entityId];
            const name = (state.attributes.friendly_name || entityId).toLowerCase();
            return name.includes(search) || entityId.toLowerCase().includes(search);
        });

        if (filtered.length === 0) {
            listDiv.innerHTML = '<div style="padding: 10px; text-align: center; color: var(--text-secondary);">Žádné entity nenalezeny</div>';
            listDiv.style.display = 'block';
            return;
        }

        listDiv.innerHTML = filtered.slice(0, 20).map(entityId => {
            const state = this.hass.states[entityId];
            const name = state.attributes.friendly_name || entityId;
            const value = state.state;
            const unit = state.attributes.unit_of_measurement || '';
            const safeName = escapeAttrValue(name);

            return `
                <div class="entity-item support-entity-item"
                     data-entity-id="${entityId}"
                     onclick="globalThis.tileDialog.${selectHandler}(${number}, '${entityId}', '${safeName}')">
                    <div class="entity-item-name">${name}</div>
                    <div class="entity-item-value">${value} ${unit}</div>
                </div>
            `;
        }).join('');

        listDiv.style.display = 'block';
    }

    _selectSupportEntity(prefix, number, entityId, entityName) {
        const ids = this._getSupportEntityIds(prefix, number);
        const searchInput = document.getElementById(ids.searchId);
        const hiddenInput = document.getElementById(ids.hiddenId);
        const listDiv = document.getElementById(ids.listId);

        searchInput.value = entityName;
        hiddenInput.value = entityId;
        listDiv.style.display = 'none';
    }

    _applyEntityDefaults(entityId, labelId, iconId, colorId) {
        if (!entityId) return;

        const state = this.hass.states[entityId];
        if (!state) return;

        const labelInput = document.getElementById(labelId);
        if (labelInput && !labelInput.value) {
            labelInput.value = state.attributes.friendly_name || '';
        }

        const iconInput = document.getElementById(iconId);
        if (iconInput && !this.isEditing && !iconInput.value && state.attributes.icon) {
            iconInput.value = state.attributes.icon;
        }

        const colorInput = document.getElementById(colorId);
        if (colorInput) {
            colorInput.value = this.tileManager.getColorFromDomain(entityId);
        }
    }

    /**
     * Vytvoř dialog element
     */
    createDialog() {
        // Odstranit existující dialog (pokud existuje)
        const existing = document.getElementById('tile-config-dialog');
        if (existing) {
            existing.remove();
        }

        const dialog = document.createElement('div');
        dialog.id = 'tile-config-dialog';
        dialog.className = 'tile-dialog-overlay';
        dialog.style.display = 'none';

        dialog.innerHTML = `
            <div class="tile-dialog">
                <div class="tile-dialog-header">
                    <h2>Konfigurace dlaždice</h2>
                    <button class="tile-dialog-close" onclick="globalThis.tileDialog.close()">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>

                <div class="tile-dialog-tabs">
                    <button class="tile-tab active" data-tab="entity" onclick="globalThis.tileDialog.switchTab('entity')">
                        📊 Entity
                    </button>
                    <button class="tile-tab" data-tab="button" onclick="globalThis.tileDialog.switchTab('button')">
                        🔘 Tlačítko
                    </button>
                </div>

                <div class="tile-dialog-content">
                    <!-- Tab: Entity -->
                    <div id="tab-entity" class="tile-tab-content active">
                        <div class="form-group">
                            <label>Vyberte hlavní entitu:</label>
                            <input type="text"
                                   id="entity-search"
                                   class="form-input"
                                   placeholder="🔍 Hledat entitu..."
                                   oninput="globalThis.tileDialog.filterEntities(this.value)">
                        </div>

                        <div id="entity-list" class="entity-list"></div>

                        <div class="form-group">
                            <label>Vlastní popisek (volitelné):</label>
                            <input type="text"
                                   id="entity-label"
                                   class="form-input"
                                   placeholder="Např. Lednice v garáži">
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Ikona (volitelné):</label>
                                <div class="icon-input-wrapper">
                                    <div class="icon-preview-box" id="entity-icon-preview" onclick="globalThis.tileDialog.openIconPicker('entity')">
                                        <span class="icon-preview-placeholder">🔍</span>
                                    </div>
                                    <input type="text"
                                           id="entity-icon"
                                           class="form-input icon-input-field"
                                           placeholder="Klikni na 🔍 nebo hledej..."
                                           oninput="globalThis.tileDialog.searchIcons(this.value, 'entity')"
                                           readonly>
                                    <button type="button" class="icon-picker-btn" onclick="globalThis.tileDialog.openIconPicker('entity')" title="Vybrat ikonu">
                                        📋
                                    </button>
                                </div>
                                <div id="icon-suggestions" class="icon-suggestions" style="display: none;"></div>
                            </div>

                            <div class="form-group">
                                <label>Barva:</label>
                                <input type="color"
                                       id="entity-color"
                                       class="form-input"
                                       value="#03A9F4">
                            </div>
                        </div>

                        <hr style="margin: 15px 0; border: 0; border-top: 1px solid var(--border-primary);">

                        <div class="form-group">
                            <label>🔹 Podpůrná entita 1 (pravý horní roh, volitelné):</label>
                            <input type="text"
                                   id="support-entity-1-search"
                                   class="form-input"
                                   placeholder="🔍 Hledat entitu nebo ponechat prázdné..."
                                   oninput="globalThis.tileDialog.filterSupportEntities(1, this.value)">
                            <div id="support-entity-1-list" class="entity-list support-entity-list" style="display: none;"></div>
                            <input type="hidden" id="support-entity-1" value="">
                        </div>

                        <div class="form-group">
                            <label>🔹 Podpůrná entita 2 (pravý dolní roh, volitelné):</label>
                            <input type="text"
                                   id="support-entity-2-search"
                                   class="form-input"
                                   placeholder="🔍 Hledat entitu nebo ponechat prázdné..."
                                   oninput="globalThis.tileDialog.filterSupportEntities(2, this.value)">
                            <div id="support-entity-2-list" class="entity-list support-entity-list" style="display: none;"></div>
                            <input type="hidden" id="support-entity-2" value="">
                        </div>
                    </div>

                    <!-- Tab: Button -->
                    <div id="tab-button" class="tile-tab-content">
                        <div class="form-group">
                            <label>Akce:</label>
                            <select id="button-action" class="form-input">
                                <option value="toggle">Přepnout (Toggle)</option>
                                <option value="turn_on">Pouze zapnout</option>
                                <option value="turn_off">Pouze vypnout</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Vyberte entitu pro tlačítko:</label>
                            <input type="text"
                                   id="button-entity-search"
                                   class="form-input"
                                   placeholder="🔍 Hledat entitu..."
                                   oninput="globalThis.tileDialog.filterButtonEntities(this.value)">
                        </div>

                        <div id="button-entity-list" class="entity-list"></div>

                        <div class="form-group">
                            <label>Popisek:</label>
                            <input type="text"
                                   id="button-label"
                                   class="form-input"
                                   placeholder="Světlo obývák">
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Ikona:</label>
                                <div class="icon-input-wrapper">
                                    <div class="icon-preview-box" id="button-icon-preview" onclick="globalThis.tileDialog.openIconPicker('button')">
                                        <span class="icon-preview-placeholder">🔍</span>
                                    </div>
                                    <input type="text"
                                           id="button-icon"
                                           class="form-input icon-input-field"
                                           placeholder="Klikni na 🔍 nebo hledej..."
                                           readonly>
                                    <button type="button" class="icon-picker-btn" onclick="globalThis.tileDialog.openIconPicker('button')" title="Vybrat ikonu">
                                        📋
                                    </button>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Barva:</label>
                                <input type="color"
                                       id="button-color"
                                       class="form-input"
                                       value="#FFC107">
                            </div>
                        </div>

                        <hr style="margin: 15px 0; border: 0; border-top: 1px solid var(--border-primary);">

                        <div class="form-group">
                            <label>🔹 Podpůrná entita 1 (pravý horní roh, volitelné):</label>
                            <input type="text"
                                   id="button-support-entity-1-search"
                                   class="form-input"
                                   placeholder="🔍 Hledat entitu nebo ponechat prázdné..."
                                   oninput="globalThis.tileDialog.filterButtonSupportEntities(1, this.value)">
                            <div id="button-support-entity-1-list" class="entity-list support-entity-list" style="display: none;"></div>
                            <input type="hidden" id="button-support-entity-1" value="">
                        </div>

                        <div class="form-group">
                            <label>🔹 Podpůrná entita 2 (pravý dolní roh, volitelné):</label>
                            <input type="text"
                                   id="button-support-entity-2-search"
                                   class="form-input"
                                   placeholder="🔍 Hledat entitu nebo ponechat prázdné..."
                                   oninput="globalThis.tileDialog.filterButtonSupportEntities(2, this.value)">
                            <div id="button-support-entity-2-list" class="entity-list support-entity-list" style="display: none;"></div>
                            <input type="hidden" id="button-support-entity-2" value="">
                        </div>
                    </div>
                </div>

                <div class="tile-dialog-footer">
                    <button class="btn btn-secondary" onclick="globalThis.tileDialog.close()">
                        Zrušit
                    </button>
                    <button class="btn btn-primary" onclick="globalThis.tileDialog.save()">
                        Uložit
                    </button>
                </div>
            </div>

            <!-- Icon Picker Modal -->
            <div class="icon-picker-modal" id="icon-picker-modal" style="display: none;" onclick="if(event.target === this) globalThis.tileDialog.closeIconPicker()">
                <div class="icon-picker-content" onclick="event.stopPropagation()">
                    <div class="icon-picker-header">
                        <h3>Vyberte ikonu</h3>
                        <button class="icon-picker-close" onclick="globalThis.tileDialog.closeIconPicker()">✕</button>
                    </div>
                    <div class="icon-picker-search">
                        <input type="text"
                               id="icon-picker-search"
                               class="form-input"
                               placeholder="🔍 Hledat ikonu..."
                               oninput="globalThis.tileDialog.filterIconPicker(this.value)">
                    </div>
                    <div class="icon-picker-body" id="icon-picker-body">
                        <!-- Icons will be populated here -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        this.dialog = dialog;
        this.iconPickerModal = document.getElementById('icon-picker-modal');
        this.iconPickerBody = document.getElementById('icon-picker-body');
        this.currentIconTarget = null; // 'entity' nebo 'button'
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Click mimo dialog = zavřít
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) {
                this.close();
            }
        });

        // ESC key = zavřít
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.dialog.style.display === 'flex') {
                this.close();
            }
        });
    }

    /**
     * Otevřít dialog
     */
    open(index, side) {
        this.index = index;
        this.side = side;

        console.log(`📝 Opening tile config dialog for [${side}][${index}]`);

        // Načíst existující konfiguraci (pokud existuje)
        const existingTile = this.tileManager.getTile(side, index);

        // Flag pro rozlišení editace vs nová dlaždice
        this.isEditing = !!existingTile;

        // Zobrazit dialog co nejdřív (Safari má pomalejší DOM render při velkém seznamu entit)
        this.dialog.style.display = 'flex';

        // Rychlé placeholdery aby bylo jasné, že se načítá
        try {
            const lists = [
                'entity-list',
                'button-entity-list',
                'support-entity-1-list',
                'support-entity-2-list',
                'support-button-entity-1-list',
                'support-button-entity-2-list'
            ];
            lists.forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '<div class="entity-item" style="opacity:0.7;padding:8px;">Načítání…</div>';
            });
        } catch (e) {
            console.warn('[Tiles] Failed to set dialog placeholders:', e);
        }

        // Naplnit seznamy entit až po prvním paintu (aby otevření dialogu nebylo blokované)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.populateEntityLists();

                // Pre-fill form pokud editujeme existující dlaždici
                if (existingTile) {
                    this.loadTileConfig(existingTile);
                }
            });
        });

        // Focus na search input
        setTimeout(() => {
            const searchInput = document.getElementById('entity-search');
            if (searchInput) searchInput.focus();
        }, 100);
    }

    /**
     * Zavřít dialog
     */
    close() {
        this.dialog.style.display = 'none';
        this.isEditing = false; // Reset editačního flagu
        this.resetForm();
    }

    /**
     * Přepnout tab
     */
    switchTab(tabName) {
        this.currentTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.tile-tab').forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.tile-tab-content').forEach(content => {
            if (content.id === `tab-${tabName}`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }

    /**
     * Naplnit seznamy entit
     */
    populateEntityLists() {
        this.populateEntityList();
        this.populateButtonEntityList();
        this.populateSupportEntityLists(); // Naplnit listy pro podpůrné entity
    }

    /**
     * Naplnit seznam entit (sensor, binary_sensor)
     */
    populateEntityList() {
        const entityList = document.getElementById('entity-list');
        if (!entityList) return;

        const entities = Object.keys(this.hass.states)
            .filter(id => id.startsWith('sensor.') || id.startsWith('binary_sensor.'))
            .sort((a, b) => {
                const nameA = this.hass.states[a].attributes.friendly_name || a;
                const nameB = this.hass.states[b].attributes.friendly_name || b;
                return nameA.localeCompare(nameB);
            });

        entityList.innerHTML = entities.map(entityId => {
            const state = this.hass.states[entityId];
            const name = state.attributes.friendly_name || entityId;
            const value = state.state;
            const unit = state.attributes.unit_of_measurement || '';
            const icon = state.attributes.icon || '';
            const safeId = normalizeEntityId(entityId);

            return `
                <div class="entity-item" data-entity-id="${entityId}">
                    <input type="radio"
                           name="entity"
                           value="${entityId}"
                           id="e_${safeId}"
                           onchange="globalThis.tileDialog.onEntitySelected('${entityId}')">
                    <label for="e_${safeId}">
                        <div class="entity-item-content">
                            <div class="entity-item-name">
                                ${icon ? `<span class="entity-item-icon">${icon}</span>` : ''}
                                ${name}
                            </div>
                            <div class="entity-item-value">${value} ${unit}</div>
                        </div>
                    </label>
                </div>
            `;
        }).join('');
    }

    /**
     * Naplnit seznam entit pro tlačítka (switch, light, fan, input_boolean)
     */
    populateButtonEntityList() {
        const buttonEntityList = document.getElementById('button-entity-list');
        if (!buttonEntityList) return;

        const switchables = Object.keys(this.hass.states)
            .filter(id =>
                id.startsWith('switch.') ||
                id.startsWith('light.') ||
                id.startsWith('fan.') ||
                id.startsWith('input_boolean.')
            )
            .sort((a, b) => {
                const nameA = this.hass.states[a].attributes.friendly_name || a;
                const nameB = this.hass.states[b].attributes.friendly_name || b;
                return nameA.localeCompare(nameB);
            });

        buttonEntityList.innerHTML = switchables.map(entityId => {
            const state = this.hass.states[entityId];
            const name = state.attributes.friendly_name || entityId;
            const value = state.state;
            const icon = state.attributes.icon || '';
            const safeId = normalizeEntityId(entityId);

            return `
                <div class="entity-item" data-entity-id="${entityId}">
                    <input type="radio"
                           name="button_entity"
                           value="${entityId}"
                           id="b_${safeId}"
                           onchange="globalThis.tileDialog.onButtonEntitySelected('${entityId}')">
                    <label for="b_${safeId}">
                        <div class="entity-item-content">
                            <div class="entity-item-name">
                                ${icon ? `<span class="entity-item-icon">${icon}</span>` : ''}
                                ${name}
                            </div>
                            <div class="entity-item-value">${value}</div>
                        </div>
                    </label>
                </div>
            `;
        }).join('');
    }

    /**
     * Naplnit selecty pro podpůrné entity
     */
    /**
     * Naplnit listy pro podpůrné entity
     */
    populateSupportEntityLists() {
        // OPRAVA: Podporovat VŠECHNY entity, nejen senzory
        // Listy se naplní dynamicky při psaní, zde jen inicializace
        this.supportEntities = Object.keys(this.hass.states)
            .sort((a, b) => {
                const nameA = this.hass.states[a].attributes.friendly_name || a;
                const nameB = this.hass.states[b].attributes.friendly_name || b;
                return nameA.localeCompare(nameB);
            });
    }

    /**
     * Filtrovat podporné entity podle hledaného textu
     */
    filterSupportEntities(number, searchText) {
        this._filterSupportEntities('', number, searchText, 'selectSupportEntity');
    }

    /**
     * Vybrat podpornou entitu
     */
    selectSupportEntity(number, entityId, entityName) {
        this._selectSupportEntity('', number, entityId, entityName);
        console.log(`✅ Selected support entity ${number}: ${entityId}`);
    }

    /**
     * Filtrovat support entities pro button (stejné jako filterSupportEntities)
     */
    filterButtonSupportEntities(number, searchText) {
        this._filterSupportEntities('button', number, searchText, 'selectButtonSupportEntity');
    }

    /**
     * Vybrat button support entitu
     */
    selectButtonSupportEntity(number, entityId, entityName) {
        this._selectSupportEntity('button', number, entityId, entityName);
        console.log(`✅ Selected button support entity ${number}: ${entityId}`);
    }

    /**
     * Vyhledávání ikon
```
     */
    searchIcons(searchText) {
        const suggestionsDiv = document.getElementById('icon-suggestions');

        if (!searchText.trim() || searchText.startsWith('mdi:')) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        // Základní populární ikony
        const commonIcons = [
            // Spotřebiče & Domácnost
            'fridge', 'fridge-outline', 'dishwasher', 'washing-machine', 'tumble-dryer',
            'stove', 'microwave', 'coffee-maker', 'kettle', 'toaster',

            // Světla & Osvětlení
            'lightbulb', 'lightbulb-outline', 'lamp', 'ceiling-light', 'floor-lamp',
            'led-strip', 'led-strip-variant', 'wall-sconce', 'chandelier',

            // Vytápění & Chlazení
            'thermometer', 'thermostat', 'radiator', 'radiator-disabled', 'heat-pump',
            'air-conditioner', 'fan', 'hvac', 'fire', 'snowflake', 'snowflake-melt',

            // Energie & Baterie
            'lightning-bolt', 'flash', 'battery', 'battery-charging', 'battery-50',
            'solar-panel', 'solar-power', 'meter-electric', 'meter-electric-outline',
            'power-plug', 'power-socket', 'transmission-tower',

            // Auto & Doprava
            'car', 'car-electric', 'car-battery', 'ev-station', 'ev-plug-type2',
            'garage', 'garage-open', 'garage-alert',

            // Zabezpečení & Vstup
            'door', 'door-open', 'door-closed', 'lock', 'lock-open', 'shield-home',
            'cctv', 'camera', 'motion-sensor', 'alarm-light', 'bell', 'alert',

            // Okna & Stínění
            'window-closed', 'window-open', 'blinds', 'blinds-open', 'curtains',
            'roller-shade', 'roller-shade-closed',

            // Mediální zařízení
            'television', 'speaker', 'speaker-wireless', 'music', 'volume-high',
            'cast', 'cast-connected', 'chromecast',

            // Síť & IoT
            'router-wireless', 'wifi', 'access-point', 'lan', 'network',
            'home-assistant', 'home-automation',

            // Voda & Sanitace
            'water', 'water-percent', 'water-boiler', 'water-pump', 'shower',
            'toilet', 'faucet', 'pipe', 'waves',

            // Počasí & Klima
            'weather-sunny', 'weather-cloudy', 'weather-night', 'weather-rainy',
            'weather-snowy', 'weather-windy', 'home-thermometer',

            // Plyn & Ostatní utility
            'meter-gas', 'gas-cylinder', 'gauge', 'chart-line', 'chart-areaspline',

            // Speciální
            'information', 'help-circle', 'alert-circle', 'checkbox-marked-circle',
            'toggle-switch', 'power', 'sync'
        ];

        const search = searchText.toLowerCase();
        const filtered = commonIcons.filter(icon => icon.includes(search));

        if (filtered.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        suggestionsDiv.innerHTML = filtered.slice(0, 12).map(icon => `
            <div class="icon-suggestion-item" onclick="globalThis.tileDialog.selectIcon('mdi:${icon}')">
                <ha-icon icon="mdi:${icon}" style="--mdc-icon-size: 20px;"></ha-icon>
                <span class="icon-name">mdi:${icon}</span>
            </div>
        `).join('');

        suggestionsDiv.style.display = 'block';
    }

    /**
     * Vybrat ikonu
     */
    selectIcon(icon) {
        document.getElementById('entity-icon').value = icon;
        document.getElementById('icon-suggestions').style.display = 'none';
    }

    /**
     * Filtrovat entity podle hledaného textu
     */
    filterEntities(searchText) {
        this._filterEntityList('#entity-list .entity-item', searchText);
    }

    /**
     * Filtrovat entity pro tlačítka podle hledaného textu
     */
    filterButtonEntities(searchText) {
        this._filterEntityList('#button-entity-list .entity-item', searchText);
    }

    /**
     * Když je vybrána entita, auto-fill ikonu a barvu
     */
    onEntitySelected(entityId) {
        this._applyEntityDefaults(entityId, 'entity-label', 'entity-icon', 'entity-color');
    }

    /**
     * Když je vybrána button entita, auto-fill ikonu a barvu
     */
    onButtonEntitySelected(entityId) {
        this._applyEntityDefaults(entityId, 'button-label', 'button-icon', 'button-color');
    }

    /**
     * Načíst existující konfiguraci do formu
     */
    loadTileConfig(tileConfig) {
        if (tileConfig.type === 'entity') {
            this.loadEntityTileConfig(tileConfig);
            return;
        }
        if (tileConfig.type === 'button') {
            this.loadButtonTileConfig(tileConfig);
        }
    }

    loadEntityTileConfig(tileConfig) {
        this.switchTab('entity');

        const radio = document.querySelector(`input[name="entity"][value="${tileConfig.entity_id}"]`);
        if (radio) radio.checked = true;

        document.getElementById('entity-label').value = tileConfig.label || '';
        document.getElementById('entity-icon').value = tileConfig.icon || '';
        document.getElementById('entity-color').value = tileConfig.color || '#03A9F4';

        if (tileConfig.icon) {
            this.updateIconPreview('entity', tileConfig.icon);
        }

        this.loadSupportEntities(tileConfig.support_entities, {
            topInput: 'support-entity-1',
            topSearch: 'support-entity-1-search',
            bottomInput: 'support-entity-2',
            bottomSearch: 'support-entity-2-search'
        });
    }

    loadButtonTileConfig(tileConfig) {
        this.switchTab('button');

        const radio = document.querySelector(`input[name="button_entity"][value="${tileConfig.entity_id}"]`);
        if (radio) radio.checked = true;

        document.getElementById('button-action').value = tileConfig.action || 'toggle';
        document.getElementById('button-label').value = tileConfig.label || '';
        document.getElementById('button-icon').value = tileConfig.icon || '';
        document.getElementById('button-color').value = tileConfig.color || '#FFC107';

        if (tileConfig.icon) {
            this.updateIconPreview('button', tileConfig.icon);
        }

        this.loadSupportEntities(tileConfig.support_entities, {
            topInput: 'button-support-entity-1',
            topSearch: 'button-support-entity-1-search',
            bottomInput: 'button-support-entity-2',
            bottomSearch: 'button-support-entity-2-search'
        });
    }

    loadSupportEntities(supportEntities, fields) {
        if (!supportEntities) return;

        const topRight = supportEntities.top_right;
        if (topRight) {
            const entity1 = this.hass.states[topRight];
            if (entity1) {
                document.getElementById(fields.topInput).value = topRight;
                document.getElementById(fields.topSearch).value = entity1.attributes.friendly_name || topRight;
            }
        }

        const bottomRight = supportEntities.bottom_right;
        if (bottomRight) {
            const entity2 = this.hass.states[bottomRight];
            if (entity2) {
                document.getElementById(fields.bottomInput).value = bottomRight;
                document.getElementById(fields.bottomSearch).value = entity2.attributes.friendly_name || bottomRight;
            }
        }
    }

    /**
     * Uložit konfiguraci
     */
    save() {
        let config;

        if (this.currentTab === 'entity') {
            config = this.saveEntityConfig();
        } else {
            config = this.saveButtonConfig();
        }

        if (!config) return; // Validace selhala

        // Uložit do tile manageru
        this.tileManager.setTile(this.side, this.index, config);

        // Zavřít dialog
        this.close();

        console.log(`✅ Saved tile config:`, config);
    }

    /**
     * Uložit entity config
     */
    saveEntityConfig() {
        const selectedEntity = document.querySelector('input[name="entity"]:checked');
        if (!selectedEntity) {
            alert('Vyberte entitu');
            return null;
        }

        const entityId = selectedEntity.value;
        const label = document.getElementById('entity-label').value.trim();
        const icon = document.getElementById('entity-icon').value.trim();
        const color = document.getElementById('entity-color').value;

        // Podpůrné entity
        const supportEntity1 = document.getElementById('support-entity-1').value;
        const supportEntity2 = document.getElementById('support-entity-2').value;

        return {
            type: 'entity',
            entity_id: entityId,
            label: label || null,
            icon: icon || null,
            color: color,
            support_entities: {
                top_right: supportEntity1 || null,
                bottom_right: supportEntity2 || null
            }
        };
    }

    /**
     * Uložit button config
     */
    saveButtonConfig() {
        const selectedEntity = document.querySelector('input[name="button_entity"]:checked');
        if (!selectedEntity) {
            alert('Vyberte entitu');
            return null;
        }

        const entityId = selectedEntity.value;
        const action = document.getElementById('button-action').value;
        const label = document.getElementById('button-label').value.trim();
        const icon = document.getElementById('button-icon').value.trim();
        const color = document.getElementById('button-color').value;

        // Přečíst support entities
        const supportEntity1 = document.getElementById('button-support-entity-1').value;
        const supportEntity2 = document.getElementById('button-support-entity-2').value;

        return {
            type: 'button',
            entity_id: entityId,
            action: action,
            label: label || null,
            icon: icon || null,
            color: color,
            support_entities: {
                top_right: supportEntity1 || null,
                bottom_right: supportEntity2 || null
            }
        };
    }

    /**
     * Resetovat form
     */
    resetForm() {
        document.getElementById('entity-search').value = '';
        document.getElementById('entity-label').value = '';
        document.getElementById('entity-icon').value = '';
        document.getElementById('entity-color').value = '#03A9F4';

        document.getElementById('button-action').value = 'toggle';
        document.getElementById('button-entity-search').value = '';
        document.getElementById('button-label').value = '';
        document.getElementById('button-icon').value = '';
        document.getElementById('button-color').value = '#FFC107';

        // Reset support entities for entity tab
        document.getElementById('support-entity-1-search').value = '';
        document.getElementById('support-entity-1').value = '';
        document.getElementById('support-entity-2-search').value = '';
        document.getElementById('support-entity-2').value = '';

        // Reset support entities for button tab
        document.getElementById('button-support-entity-1-search').value = '';
        document.getElementById('button-support-entity-1').value = '';
        document.getElementById('button-support-entity-2-search').value = '';
        document.getElementById('button-support-entity-2').value = '';

        // Reset icon previews
        document.getElementById('entity-icon-preview').innerHTML = '<span class="icon-preview-placeholder">🔍</span>';
        document.getElementById('button-icon-preview').innerHTML = '<span class="icon-preview-placeholder">🔍</span>';

        // Odznačit všechny entity
        document.querySelectorAll('input[name="entity"]').forEach(radio => {
            radio.checked = false;
        });
        document.querySelectorAll('input[name="button_entity"]').forEach(radio => {
            radio.checked = false;
        });

        // Zobrazit všechny entity (zrušit filtr)
        document.querySelectorAll('.entity-item').forEach(item => {
            item.style.display = '';
        });

        // Přepnout na první tab
        this.switchTab('entity');
    }

    /**
     * Otevřít icon picker modal
     */
    openIconPicker(target) {
        this.currentIconTarget = target;
        this.populateIconPicker();
        this.iconPickerModal.style.display = 'flex';
        document.getElementById('icon-picker-search').value = '';
        document.getElementById('icon-picker-search').focus();
    }

    /**
     * Zavřít icon picker modal
     */
    closeIconPicker() {
        this.iconPickerModal.style.display = 'none';
        this.currentIconTarget = null;
    }

    /**
     * Naplnit icon picker všemi ikonami
     */
    async populateIconPicker() {
        const categories = {
            'Spotřebiče': [
                'fridge', 'fridge-outline', 'dishwasher', 'washing-machine', 'tumble-dryer',
                'stove', 'microwave', 'coffee-maker', 'kettle', 'toaster', 'blender', 'food-processor',
                'rice-cooker', 'slow-cooker', 'pressure-cooker', 'air-fryer', 'oven', 'range-hood'
            ],
            'Osvětlení': [
                'lightbulb', 'lightbulb-outline', 'lamp', 'ceiling-light', 'floor-lamp', 'led-strip',
                'led-strip-variant', 'wall-sconce', 'chandelier', 'desk-lamp', 'spotlight', 'light-switch'
            ],
            'Vytápění & Chlazení': [
                'thermometer', 'thermostat', 'radiator', 'radiator-disabled', 'heat-pump',
                'air-conditioner', 'fan', 'hvac', 'fire', 'snowflake', 'fireplace', 'heating-coil'
            ],
            'Energie & Baterie': [
                'lightning-bolt', 'flash', 'battery', 'battery-charging', 'battery-50', 'battery-10',
                'solar-panel', 'solar-power', 'meter-electric', 'power-plug', 'power-socket',
                'ev-plug', 'transmission-tower', 'current-ac', 'current-dc'
            ],
            'Auto & Doprava': [
                'car', 'car-electric', 'car-battery', 'ev-station', 'ev-plug-type2', 'garage',
                'garage-open', 'motorcycle', 'bicycle', 'scooter', 'bus', 'train', 'airplane'
            ],
            'Zabezpečení': [
                'door', 'door-open', 'lock', 'lock-open', 'shield-home', 'cctv', 'camera',
                'motion-sensor', 'alarm-light', 'bell', 'eye', 'key', 'fingerprint', 'shield-check'
            ],
            'Okna & Stínění': [
                'window-closed', 'window-open', 'blinds', 'blinds-open', 'curtains', 'roller-shade',
                'window-shutter', 'balcony', 'door-sliding'
            ],
            'Média & Zábava': [
                'television', 'speaker', 'speaker-wireless', 'music', 'volume-high', 'cast',
                'chromecast', 'radio', 'headphones', 'microphone', 'gamepad', 'movie', 'spotify'
            ],
            'Síť & IT': [
                'router-wireless', 'wifi', 'access-point', 'lan', 'network', 'home-assistant',
                'server', 'nas', 'cloud', 'ethernet', 'bluetooth', 'cellphone', 'tablet', 'laptop'
            ],
            'Voda & Koupelna': [
                'water', 'water-percent', 'water-boiler', 'water-pump', 'shower', 'toilet',
                'faucet', 'pipe', 'bathtub', 'sink', 'water-heater', 'pool'
            ],
            'Počasí': [
                'weather-sunny', 'weather-cloudy', 'weather-night', 'weather-rainy', 'weather-snowy',
                'weather-windy', 'weather-fog', 'weather-lightning', 'weather-hail', 'temperature',
                'humidity', 'barometer'
            ],
            'Ventilace & Kvalita vzduchu': [
                'fan', 'air-filter', 'air-purifier', 'smoke-detector', 'co2', 'wind-turbine'
            ],
            'Zahrada & Venku': [
                'flower', 'tree', 'sprinkler', 'grass', 'garden-light', 'outdoor-lamp', 'grill',
                'pool', 'hot-tub', 'umbrella', 'thermometer-lines'
            ],
            'Domácnost': [
                'iron', 'vacuum', 'broom', 'mop', 'washing', 'basket', 'hanger', 'scissors'
            ],
            'Notifikace & Stav': [
                'information', 'help-circle', 'alert-circle', 'checkbox-marked-circle', 'check',
                'close', 'minus', 'plus', 'arrow-up', 'arrow-down', 'refresh', 'sync', 'bell-ring'
            ],
            'Ovládání': [
                'toggle-switch', 'power', 'play', 'pause', 'stop', 'skip-next', 'skip-previous',
                'volume-up', 'volume-down', 'brightness-up', 'brightness-down'
            ],
            'Čas & Plánování': [
                'clock', 'timer', 'alarm', 'calendar', 'calendar-clock', 'schedule', 'history'
            ],
            'Ostatní': [
                'home', 'cog', 'tools', 'wrench', 'hammer', 'chart-line', 'gauge', 'dots-vertical',
                'menu', 'settings', 'account', 'logout'
            ]
        };

        console.log('🎨 Populating icon picker...');

        // Vyprázdnit body
        this.iconPickerBody.innerHTML = '';

        // Vytvořit kategorie přímo jako DOM elementy
        for (const [category, icons] of Object.entries(categories)) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'icon-category';

            const categoryTitle = document.createElement('h4');
            categoryTitle.className = 'icon-category-title';
            categoryTitle.textContent = category;
            categoryDiv.appendChild(categoryTitle);

            const gridDiv = document.createElement('div');
            gridDiv.className = 'icon-category-grid';

            icons.forEach(icon => {
                const fullIcon = `mdi:${icon}`;

                const itemDiv = document.createElement('div');
                itemDiv.className = 'icon-picker-item';
                itemDiv.dataset.icon = fullIcon;
                itemDiv.onclick = () => this.selectIconFromPicker(fullIcon);

                // Vložit HTML s ha-icon
                itemDiv.innerHTML = `
                    ${renderIconHTML(fullIcon)}
                    <span class="icon-picker-name">${icon}</span>
                `;

                gridDiv.appendChild(itemDiv);
            });

            categoryDiv.appendChild(gridDiv);
            this.iconPickerBody.appendChild(categoryDiv);
        }

        console.log('✅ Icon picker populated with', Object.keys(categories).reduce((sum, cat) => sum + categories[cat].length, 0), 'emoji icons');
    }    /**
     * Filtrování icon pickeru
     */
    filterIconPicker(searchText) {
        const search = searchText.toLowerCase();
        const categories = this.iconPickerBody.querySelectorAll('.icon-category');

        categories.forEach(category => {
            const items = category.querySelectorAll('.icon-picker-item');
            let hasVisible = false;

            items.forEach(item => {
                const iconName = item.dataset.icon.toLowerCase();
                if (iconName.includes(search)) {
                    item.style.display = '';
                    hasVisible = true;
                } else {
                    item.style.display = 'none';
                }
            });

            category.style.display = hasVisible ? '' : 'none';
        });
    }

    /**
     * Vybrat ikonu z pickeru
     */
    selectIconFromPicker(icon) {
        console.log('🎯 Icon selected from picker:', icon);
        const inputId = this.currentIconTarget === 'entity' ? 'entity-icon' : 'button-icon';
        const previewId = this.currentIconTarget === 'entity' ? 'entity-icon-preview' : 'button-icon-preview';

        const inputField = document.getElementById(inputId);
        const previewBox = document.getElementById(previewId);

        if (inputField) {
            inputField.value = icon;
            console.log('✅ Input field updated:', inputId, '=', icon);
        }

        if (previewBox) {
            previewBox.innerHTML = renderIconHTML(icon);
            console.log('✅ Preview box updated with rendered icon');
        }

        this.closeIconPicker();
    }

    /**
     * Aktualizovat náhled ikony při načtení konfigurace
     */
    updateIconPreview(target, icon) {
        if (!icon) return;
        console.log('🎨 Updating icon preview:', target, icon);
        const previewId = target === 'entity' ? 'entity-icon-preview' : 'button-icon-preview';
        const previewBox = document.getElementById(previewId);
        if (previewBox) {
            previewBox.innerHTML = renderIconHTML(icon);
            console.log('✅ Preview updated');
        } else {
            console.error('❌ Preview box not found:', previewId);
        }
    }
}

// Export do window pro použití inline onclick handlerů
globalThis.TileConfigDialog = TileConfigDialog;
