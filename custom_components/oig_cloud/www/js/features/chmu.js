// === ČHMÚ WEATHER WARNING FUNCTIONS ===

let chmuWarningData = null;

// Update ČHMÚ warning badge
function updateChmuWarningBadge() {
    const hass = getHass();
    if (!hass) return;

    const localSensorId = `sensor.oig_${INVERTER_SN}_chmu_warning_level`;
    const globalSensorId = `sensor.oig_${INVERTER_SN}_chmu_warning_level_global`;

    const localSensor = hass.states[localSensorId];
    const globalSensor = hass.states[globalSensorId];

    if (!localSensor) {
        console.log('[ČHMÚ] Local sensor not found:', localSensorId);
        return;
    }

    const badge = document.getElementById('chmu-warning-badge');
    const icon = document.getElementById('chmu-icon');
    const text = document.getElementById('chmu-text');

    if (!badge || !icon || !text) return;

    const severity = Number.parseInt(localSensor.state) || 0;
    const attrs = localSensor.attributes || {};
    const warningsCount = attrs.warnings_count || 0;
    const eventType = attrs.event_type || '';

    // OPRAVENO: Pokud je warnings_count=0 nebo event_type obsahuje "Žádná výstraha", zobraz jako severity 0
    const effectiveSeverity = (warningsCount === 0 || eventType.includes('Žádná výstraha')) ? 0 : severity;

    // Store data for modal
    chmuWarningData = {
        local: localSensor,
        global: globalSensor,
        severity: effectiveSeverity
    };

    badge.classList.remove(
        'severity-0',
        'severity-1',
        'severity-2',
        'severity-3',
        'severity-4'
    );
    badge.classList.add('chmu-warning-badge', 'button-reset', `severity-${effectiveSeverity}`);

    // Update icon and text based on effective severity
    if (effectiveSeverity === 0) {
        icon.textContent = '✓';
        text.textContent = 'Bez výstrah';
    } else {
        if (effectiveSeverity >= 3) {
            icon.textContent = '🚨';
        } else {
            icon.textContent = '⚠️';
        }

        // Show event type instead of generic "Oranžové varování"
        text.textContent = eventType;

        // If multiple warnings, show count
        if (warningsCount > 1) {
            text.textContent = `${eventType} +${warningsCount - 1}`;
        }
    }
}

/**
 * Update battery efficiency statistics on Pricing tab
 * Loads data from battery_efficiency sensor and displays monthly stats
 */
function toggleChmuWarningModal() {
    const modal = document.getElementById('chmu-modal');
    if (!modal) return;

    if (modal.classList.contains('active')) {
        closeChmuWarningModal();
    } else {
        openChmuWarningModal();
    }
}

// Open ČHMÚ warning modal
function openChmuWarningModal() {
    const modal = document.getElementById('chmu-modal');
    const modalBody = document.getElementById('chmu-modal-body');

    if (!modal || !modalBody || !chmuWarningData) return;

    modal.classList.add('active');

    // Render modal content
    renderChmuWarningModal(modalBody);
}

// Close ČHMÚ warning modal
function closeChmuWarningModal(event) {
    const modal = document.getElementById('chmu-modal');
    if (!modal) return;

    // If event is provided, check if we clicked outside the content
    if (event && event.target !== modal) return;

    modal.classList.remove('active');
}

// Render ČHMÚ warning modal content
function renderChmuWarningModal(container) {
    if (!chmuWarningData || !container) return;

    const { local } = chmuWarningData;
    const attrs = local.attributes || {};
    const severity = Number.parseInt(local.state) || 0;

    // If no warnings
    if (severity === 0) {
        container.innerHTML = `
            <div class="chmu-no-warnings">
                <div class="chmu-no-warnings-icon">☀️</div>
                <h4>Žádná meteorologická výstraha</h4>
                <p>V současné době nejsou aktivní žádná varování pro váš region.</p>
            </div>
        `;
        return;
    }

    // Get warnings from new structure
    const allWarningsDetails = attrs.all_warnings_details || [];
    const topEventType = attrs.event_type;
    const topDescription = attrs.description;
    const topInstruction = attrs.instruction;
    const topOnset = attrs.onset;
    const topExpires = attrs.expires;
    const topEtaHours = attrs.eta_hours;

    if (allWarningsDetails.length === 0) {
        container.innerHTML = `
            <div class="chmu-no-warnings">
                <div class="chmu-no-warnings-icon">❓</div>
                <h4>Data nejsou k dispozici</h4>
                <p>Varování byla detekována, ale detaily nejsou dostupné.</p>
            </div>
        `;
        return;
    }

        const icon = getWarningIcon(topEventType);
        const severityLabel = getSeverityLabel(severity);

        container.textContent = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'chmu-warning-item chmu-warning-top severity-' + severity;
        container.appendChild(wrapper);

        const header = document.createElement('div');
        header.className = 'chmu-warning-header';
        wrapper.appendChild(header);

        const iconDiv = document.createElement('div');
        iconDiv.className = 'chmu-warning-icon';
        iconDiv.textContent = icon;
        header.appendChild(iconDiv);

        const titleDiv = document.createElement('div');
        titleDiv.className = 'chmu-warning-title';
        const h4 = document.createElement('h4');
        h4.textContent = topEventType;
        const severitySpan = document.createElement('span');
        severitySpan.className = 'chmu-warning-severity severity-' + severity;
        severitySpan.textContent = severityLabel;
        titleDiv.appendChild(h4);
        titleDiv.appendChild(severitySpan);
        header.appendChild(titleDiv);

        if (topDescription) {
            const descDiv = document.createElement('div');
            descDiv.className = 'chmu-warning-description';
            descDiv.textContent = topDescription;
            wrapper.appendChild(descDiv);
        }

        if (topInstruction) {
            const instrDiv = document.createElement('div');
            instrDiv.className = 'chmu-warning-instruction';
            instrDiv.textContent = topInstruction;
            wrapper.appendChild(instrDiv);
        }
}

// Helper: Convert severity name to level
function getSeverityLevelFromName(severityName) {
    const map = {
        'Minor': 1,
        'Moderate': 2,
        'Severe': 3,
        'Extreme': 4
    };
    return map[severityName] || 1;
}

// Get icon for warning type
function getWarningIcon(eventType) {
    const icons = {
        'Vítr': '🌪️',
        'Silný vítr': '💨',
        'Déšť': '🌧️',
        'Silný déšť': '⛈️',
        'Sníh': '❄️',
        'Sněžení': '🌨️',
        'Bouřky': '⛈️',
        'Mráz': '🥶',
        'Vedro': '🌡️',
        'Mlha': '🌫️',
        'Náledí': '🧊',
        'Laviny': '⚠️'
    };

    for (const [key, icon] of Object.entries(icons)) {
        if (eventType.includes(key)) return icon;
    }

    return '⚠️';
}

// Get severity label
function getSeverityLabel(severity) {
    const labels = {
        1: 'Minor',
        2: 'Moderate',
        3: 'Severe',
        4: 'Extreme'
    };
    return labels[severity] || 'Unknown';
}

// Format ČHMÚ datetime
function formatChmuDateTime(isoString) {
    if (!isoString) return '--';

    try {
        const date = new Date(isoString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${day}.${month}. ${hours}:${minutes}`;
    } catch (e) {
        console.warn('[CHMU] Failed to format datetime', e);
        return isoString;
    }
}

// ========================================================================
// MODE TIMELINE DIALOG - Phase 2.7
// ========================================================================

// === TIMELINE (moved to dashboard-timeline.js) ===
// MODE_CONFIG is already defined in dashboard-timeline.js as const
// No need to re-declare it here

// Export ČHMÚ functions
globalThis.DashboardChmu = {
    updateChmuWarningBadge,
    toggleChmuWarningModal,
    openChmuWarningModal,
    closeChmuWarningModal,
    renderChmuWarningModal,
    init: function() {
        console.log('[DashboardChmu] Initialized');
    }
};

console.log('[DashboardChmu] Module loaded');
