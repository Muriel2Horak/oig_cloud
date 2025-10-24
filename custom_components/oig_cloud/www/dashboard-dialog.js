/**
 * Dashboard Tile Config Dialog
 * Dialog pro konfiguraci dlaždic - výběr entity nebo tlačítka
 */

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
                    <button class="tile-dialog-close" onclick="window.tileDialog.close()">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>

                <div class="tile-dialog-tabs">
                    <button class="tile-tab active" data-tab="entity" onclick="window.tileDialog.switchTab('entity')">
                        📊 Entity
                    </button>
                    <button class="tile-tab" data-tab="button" onclick="window.tileDialog.switchTab('button')">
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
                                   oninput="window.tileDialog.filterEntities(this.value)">
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
                                <input type="text"
                                       id="entity-icon"
                                       class="form-input"
                                       placeholder="mdi:fridge">
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
                            <select id="support-entity-1" class="form-input">
                                <option value="">-- Žádná --</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>🔹 Podpůrná entita 2 (pravý dolní roh, volitelné):</label>
                            <select id="support-entity-2" class="form-input">
                                <option value="">-- Žádná --</option>
                            </select>
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
                            <label>Entita:</label>
                            <select id="button-entity" class="form-input"></select>
                        </div>

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
                                <input type="text"
                                       id="button-icon"
                                       class="form-input"
                                       placeholder="mdi:lightbulb">
                            </div>

                            <div class="form-group">
                                <label>Barva:</label>
                                <input type="color"
                                       id="button-color"
                                       class="form-input"
                                       value="#FFC107">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tile-dialog-footer">
                    <button class="btn btn-secondary" onclick="window.tileDialog.close()">
                        Zrušit
                    </button>
                    <button class="btn btn-primary" onclick="window.tileDialog.save()">
                        Uložit
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        this.dialog = dialog;
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

        // Naplnit seznamy entit
        this.populateEntityLists();

        // Pre-fill form pokud editujeme existující dlaždici
        if (existingTile) {
            this.loadTileConfig(existingTile);
        }

        // Zobrazit dialog
        this.dialog.style.display = 'flex';

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
        this.populateSupportEntitySelects(); // Naplnit selecty pro podpůrné entity
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

            return `
                <div class="entity-item" data-entity-id="${entityId}">
                    <input type="radio"
                           name="entity"
                           value="${entityId}"
                           id="e_${entityId.replace(/\./g, '_')}"
                           onchange="window.tileDialog.onEntitySelected('${entityId}')">
                    <label for="e_${entityId.replace(/\./g, '_')}">
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
     * Naplnit seznam entit pro tlačítka (switch, light)
     */
    populateButtonEntityList() {
        const buttonEntity = document.getElementById('button-entity');
        if (!buttonEntity) return;

        const switchables = Object.keys(this.hass.states)
            .filter(id => id.startsWith('switch.') || id.startsWith('light.') || id.startsWith('fan.'))
            .sort((a, b) => {
                const nameA = this.hass.states[a].attributes.friendly_name || a;
                const nameB = this.hass.states[b].attributes.friendly_name || b;
                return nameA.localeCompare(nameB);
            });

        buttonEntity.innerHTML = '<option value="">-- Vyberte entitu --</option>' +
            switchables.map(entityId => {
                const name = this.hass.states[entityId].attributes.friendly_name || entityId;
                return `<option value="${entityId}">${name}</option>`;
            }).join('');
    }

    /**
     * Naplnit selecty pro podpůrné entity
     */
    populateSupportEntitySelects() {
        const supportEntity1 = document.getElementById('support-entity-1');
        const supportEntity2 = document.getElementById('support-entity-2');
        
        if (!supportEntity1 || !supportEntity2) return;

        // Všechny senzory a binary senzory
        const entities = Object.keys(this.hass.states)
            .filter(id => id.startsWith('sensor.') || id.startsWith('binary_sensor.'))
            .sort((a, b) => {
                const nameA = this.hass.states[a].attributes.friendly_name || a;
                const nameB = this.hass.states[b].attributes.friendly_name || b;
                return nameA.localeCompare(nameB);
            });

        const options = '<option value="">-- Žádná --</option>' +
            entities.map(entityId => {
                const name = this.hass.states[entityId].attributes.friendly_name || entityId;
                return `<option value="${entityId}">${name}</option>`;
            }).join('');

        supportEntity1.innerHTML = options;
        supportEntity2.innerHTML = options;
    }

    /**
     * Filtrovat entity podle hledaného textu
     */
    filterEntities(searchText) {
        const items = document.querySelectorAll('.entity-item');
        const search = searchText.toLowerCase();

        items.forEach(item => {
            const entityId = item.dataset.entityId;
            const state = this.hass.states[entityId];
            const name = (state.attributes.friendly_name || entityId).toLowerCase();

            if (name.includes(search) || entityId.toLowerCase().includes(search)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    /**
     * Když je vybrána entita, auto-fill ikonu a barvu
     */
    onEntitySelected(entityId) {
        const state = this.hass.states[entityId];
        if (!state) return;

        // Auto-fill label
        const labelInput = document.getElementById('entity-label');
        if (labelInput && !labelInput.value) {
            labelInput.value = state.attributes.friendly_name || '';
        }

        // Auto-fill icon
        const iconInput = document.getElementById('entity-icon');
        if (iconInput && !iconInput.value && state.attributes.icon) {
            iconInput.value = state.attributes.icon;
        }

        // Auto-fill color podle domény
        const colorInput = document.getElementById('entity-color');
        if (colorInput) {
            colorInput.value = this.tileManager.getColorFromDomain(entityId);
        }
    }

    /**
     * Načíst existující konfiguraci do formu
     */
    loadTileConfig(tileConfig) {
        if (tileConfig.type === 'entity') {
            this.switchTab('entity');

            // Vybrat radio button
            const radio = document.querySelector(`input[name="entity"][value="${tileConfig.entity_id}"]`);
            if (radio) radio.checked = true;

            // Fill form
            document.getElementById('entity-label').value = tileConfig.label || '';
            document.getElementById('entity-icon').value = tileConfig.icon || '';
            document.getElementById('entity-color').value = tileConfig.color || '#03A9F4';
            
            // Podporné entity
            if (tileConfig.support_entities) {
                document.getElementById('support-entity-1').value = tileConfig.support_entities.top_right || '';
                document.getElementById('support-entity-2').value = tileConfig.support_entities.bottom_right || '';
            }

        } else if (tileConfig.type === 'button') {
            this.switchTab('button');

            // Fill form
            document.getElementById('button-action').value = tileConfig.action || 'toggle';
            document.getElementById('button-entity').value = tileConfig.entity_id || '';
            document.getElementById('button-label').value = tileConfig.label || '';
            document.getElementById('button-icon').value = tileConfig.icon || '';
            document.getElementById('button-color').value = tileConfig.color || '#FFC107';
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
        const entityId = document.getElementById('button-entity').value;
        if (!entityId) {
            alert('Vyberte entitu');
            return null;
        }

        const action = document.getElementById('button-action').value;
        const label = document.getElementById('button-label').value.trim();
        const icon = document.getElementById('button-icon').value.trim();
        const color = document.getElementById('button-color').value;

        return {
            type: 'button',
            entity_id: entityId,
            action: action,
            label: label || null,
            icon: icon || null,
            color: color
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
        document.getElementById('button-entity').value = '';
        document.getElementById('button-label').value = '';
        document.getElementById('button-icon').value = '';
        document.getElementById('button-color').value = '#FFC107';

        // Odznačit všechny entity
        document.querySelectorAll('input[name="entity"]').forEach(radio => {
            radio.checked = false;
        });

        // Zobrazit všechny entity (zrušit filtr)
        document.querySelectorAll('.entity-item').forEach(item => {
            item.style.display = '';
        });

        // Přepnout na první tab
        this.switchTab('entity');
    }
}

// Export do window pro použití inline onclick handlerů
window.TileConfigDialog = TileConfigDialog;
