/**
 * OIG Cloud Dashboard - Utility Functions
 *
 * Helpers pro formatting, notifications, debouncing a další utility funkce.
 * Extrahováno z monolitického dashboard-core.js
 *
 * @module dashboard-utils
 * @version 1.0.0
 * @date 2025-11-02
 */

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

/**
 * Formátuje výkon (W → kW při >= 1000W)
 * @param {number} watts - Výkon ve wattech
 * @returns {string} Formátovaný string s jednotkou
 */
export function formatPower(watts) {
    if (watts === null || watts === undefined || isNaN(watts)) return '-- W';
    const absWatts = Math.abs(watts);
    if (absWatts >= 1000) {
        return (watts / 1000).toFixed(2) + ' kW';
    } else {
        return Math.round(watts) + ' W';
    }
}

/**
 * Formátuje energii (Wh → kWh při >= 1000Wh)
 * @param {number} wattHours - Energie ve watthodinách
 * @returns {string} Formátovaný string s jednotkou
 */
export function formatEnergy(wattHours) {
    if (wattHours === null || wattHours === undefined || isNaN(wattHours)) return '-- Wh';
    const absWh = Math.abs(wattHours);
    if (absWh >= 1000) {
        return (wattHours / 1000).toFixed(2) + ' kWh';
    } else {
        return Math.round(wattHours) + ' Wh';
    }
}

/**
 * Formátuje relativní čas (před X minutami/hodinami/dny)
 * @param {Date} date - Datum k porovnání
 * @returns {string} Lidsky čitelný relativní čas
 */
export function formatRelativeTime(date) {
    if (!date) return '';

    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 10) return 'právě teď';
    if (diffSec < 60) return `před ${diffSec} sekundami`;
    if (diffMin === 1) return 'před minutou';
    if (diffMin < 60) return `před ${diffMin} minutami`;
    if (diffHour === 1) return 'před hodinou';
    if (diffHour < 24) return `před ${diffHour} hodinami`;
    if (diffDay === 1) return 'včera';
    if (diffDay < 7) return `před ${diffDay} dny`;

    return date.toLocaleDateString('cs-CZ');
}

/**
 * Formátuje ČHMÚ datetime (ISO string → lidsky čitelný formát)
 * @param {string} isoString - ISO datetime string
 * @returns {string} Formátovaný čas
 */
export function formatChmuDateTime(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        return date.toLocaleString('cs-CZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return isoString;
    }
}

/**
 * Formátuje číslo s desetinným místem
 * @param {number} value - Hodnota
 * @param {number} decimals - Počet desetinných míst
 * @returns {string} Formátované číslo
 */
export function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return value.toFixed(decimals);
}

/**
 * Formátuje cenu v CZK
 * @param {number} value - Cena
 * @returns {string} Formátovaná cena s jednotkou
 */
export function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) return '-- CZK';
    return `${value.toFixed(2)} CZK`;
}

/**
 * Formátuje procenta
 * @param {number} value - Hodnota (0-100)
 * @returns {string} Formátovaná procenta
 */
export function formatPercent(value) {
    if (value === null || value === undefined || isNaN(value)) return '-- %';
    return `${Math.round(value)} %`;
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

/**
 * Zobrazí notifikaci (toast)
 * @param {string} title - Nadpis notifikace
 * @param {string} message - Text zprávy
 * @param {string} type - Typ: 'success', 'error', 'warning', 'info'
 */
export function showNotification(title, message, type = 'success') {
    // Pokus o použití HA notification
    const hass = window.getHass?.();
    if (hass?.callService) {
        try {
            hass.callService('persistent_notification', 'create', {
                title: title,
                message: message,
                notification_id: `oig_dashboard_${Date.now()}`
            });
            return;
        } catch (e) {
            console.warn('[Notification] HA notification failed, using fallback:', e);
        }
    }

    // Fallback: browser console + alert (jen pro error)
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    if (type === 'error') {
        alert(`${title}\n\n${message}`);
    }
}

// ============================================================================
// DEBOUNCE HELPERS
// ============================================================================

/**
 * Vytvoří debounced verzi funkce
 * @param {Function} func - Funkce k debounce
 * @param {number} delay - Delay v ms
 * @returns {Function} Debounced funkce
 */
export function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Vytvoří throttled verzi funkce
 * @param {Function} func - Funkce k throttle
 * @param {number} limit - Minimální interval v ms
 * @returns {Function} Throttled funkce
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ============================================================================
// DOM HELPERS
// ============================================================================

// Cache pro previousValues (detekce změn)
const previousValues = {};

/**
 * Aktualizuje element jen pokud se hodnota změnila
 * @param {string} elementId - ID elementu
 * @param {string} newValue - Nová hodnota
 * @param {string} cacheKey - Klíč pro cache (optional)
 * @param {boolean} isFallback - True pokud je hodnota fallback (např. '--')
 * @returns {boolean} True pokud se změnilo
 */
export function updateElementIfChanged(elementId, newValue, cacheKey, isFallback = false) {
    if (!cacheKey) cacheKey = elementId;
    const element = document.getElementById(elementId);
    if (!element) return false;

    // Update fallback visualization
    if (isFallback) {
        element.classList.add('fallback-value');
        element.setAttribute('title', 'Data nejsou k dispozici');
    } else {
        element.classList.remove('fallback-value');
        element.removeAttribute('title');
    }

    // Update value if changed
    if (previousValues[cacheKey] === undefined || previousValues[cacheKey] !== newValue) {
        element.textContent = newValue;
        previousValues[cacheKey] = newValue;
        return true;
    }
    return false;
}

/**
 * Aktualizuje CSS třídu jen pokud se stav změnil
 * @param {HTMLElement} element - DOM element
 * @param {string} className - Název třídy
 * @param {boolean} shouldAdd - True = přidat, False = odebrat
 * @returns {boolean} True pokud se změnilo
 */
export function updateClassIfChanged(element, className, shouldAdd) {
    if (!element) return false;
    const hasClass = element.classList.contains(className);
    if (shouldAdd && !hasClass) {
        element.classList.add(className);
        return true;
    } else if (!shouldAdd && hasClass) {
        element.classList.remove(className);
        return true;
    }
    return false;
}

/**
 * Najde element s retry mechanikou
 * @param {string} selector - CSS selector
 * @param {number} maxRetries - Max počet pokusů
 * @param {number} delay - Delay mezi pokusy (ms)
 * @returns {Promise<HTMLElement>} Element nebo null
 */
export async function waitForElement(selector, maxRetries = 10, delay = 100) {
    for (let i = 0; i < maxRetries; i++) {
        const element = document.querySelector(selector);
        if (element) return element;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    return null;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validuje, zda je hodnota číslo v rozsahu
 * @param {*} value - Hodnota k validaci
 * @param {number} min - Minimální hodnota
 * @param {number} max - Maximální hodnota
 * @returns {boolean} True pokud je validní
 */
export function isNumberInRange(value, min, max) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
}

/**
 * Validuje entity ID formát (sensor.xxx_yyy)
 * @param {string} entityId - Entity ID
 * @returns {boolean} True pokud je validní
 */
export function isValidEntityId(entityId) {
    if (typeof entityId !== 'string') return false;
    return /^[a-z_]+\.[a-z0-9_]+$/.test(entityId);
}

// ============================================================================
// TIME HELPERS
// ============================================================================

/**
 * Vrátí aktuální čas ve formátu HH:MM:SS
 * @returns {string} Formátovaný čas
 */
export function getCurrentTimeString() {
    const now = new Date();
    return now.toLocaleTimeString('cs-CZ');
}

/**
 * Převede sekundy na lidsky čitelný formát (1h 23m 45s)
 * @param {number} seconds - Počet sekund
 * @returns {string} Formátovaný čas
 */
export function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0s';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
}

// ============================================================================
// EXPORT DEFAULT (pro backward compatibility s non-module scripts)
// ============================================================================

if (typeof window !== 'undefined') {
/**
 * Find shield sensor ID with support for numeric suffixes
 * Handles: sensor.oig_<SN>_<name> or sensor.oig_<SN>_<name>_2, _3, etc.
 * @param {string} sensorName - Sensor name (without prefix)
 * @returns {string} - Full entity ID
 */
function findShieldSensorId(sensorName) {
    try {
        const hass = getHass();
        if (!hass || !hass.states) {
            console.warn(`[Shield] Cannot find ${sensorName} - hass not available`);
            return `sensor.oig_${INVERTER_SN}_${sensorName}`; // Fallback to basic pattern
        }

        const sensorPrefix = `sensor.oig_${INVERTER_SN}_${sensorName}`;

        // Find matching entity with strict pattern:
        // - sensor.oig_<SN>_<name> (exact match)
        // - sensor.oig_<SN>_<name>_2, _3, etc. (with numeric suffix)
        const entityId = Object.keys(hass.states).find(id => {
            if (id === sensorPrefix) {
                return true; // Exact match
            }
            if (id.startsWith(sensorPrefix + '_')) {
                // Check if suffix is numeric (e.g., _2, _3)
                const suffix = id.substring(sensorPrefix.length + 1);
                return /^\d+$/.test(suffix);
            }
            return false;
        });

        if (!entityId) {
            console.warn(`[Shield] Sensor not found with prefix: ${sensorPrefix}`);
            return `sensor.oig_${INVERTER_SN}_${sensorName}`; // Fallback to basic pattern
        }

        return entityId;
    } catch (e) {
        console.error(`[Shield] Error finding sensor ${sensorName}:`, e);
        return `sensor.oig_${INVERTER_SN}_${sensorName}`; // Fallback to basic pattern
    }
}

// Export utilities
if (typeof window !== 'undefined') {
    window.DashboardUtils = {
        formatPower,
        formatEnergy,
        formatRelativeTime,
        formatChmuDateTime,
        formatNumber,
        formatCurrency,
        formatPercent,
        formatDuration,
        showNotification,
        debounce,
        throttle,
        updateElementIfChanged,
        updateClassIfChanged,
        waitForElement,
        isNumberInRange,
        isValidEntityId,
        getCurrentTimeString,
        findShieldSensorId
    };
}

