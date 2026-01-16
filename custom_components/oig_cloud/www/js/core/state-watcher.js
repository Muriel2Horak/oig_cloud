/**
 * OIG Cloud Dashboard - State Watcher (HA state_changed stream)
 *
 * Uses HA websocket `state_changed` events and filters only selected entities.
 * This keeps updates HA-like (event-driven) while still avoiding per-entity subscriptions.
 */

(function () {
    const callbacks = new Set();
    const watched = new Set();
    const watchedPrefixes = new Set();

    let unsub = null;
    let running = false;

    function _getHassSafe() {
        try {
            return getHass?.() || null;
        } catch (e) {
            return null;
        }
    }

    function registerEntities(entityIds) {
        if (!entityIds) return;
        for (const id of entityIds) {
            if (typeof id === 'string' && id.length > 0) watched.add(id);
        }
    }

    function registerPrefix(prefix) {
        const hass = _getHassSafe();
        if (typeof prefix !== 'string' || prefix.length === 0) return;
        watchedPrefixes.add(prefix);
        if (!hass || !hass.states) return;
        const ids = Object.keys(hass.states);
        registerEntities(ids.filter((eid) => eid.startsWith(prefix)));
    }

    function onEntityChange(cb) {
        if (typeof cb !== 'function') return () => {};
        callbacks.add(cb);
        return () => callbacks.delete(cb);
    }

    function _matchesWatched(entityId) {
        if (watched.has(entityId)) return true;
        for (const prefix of watchedPrefixes) {
            if (entityId.startsWith(prefix)) return true;
        }
        return false;
    }

    function _handleStateChanged(event) {
        const entityId = event?.data?.entity_id;
        if (!entityId || !_matchesWatched(entityId)) return;
        const newState = event.data?.new_state;
        for (const cb of callbacks) {
            try {
                cb(entityId, newState);
            } catch (e) {
                // keep watcher resilient
            }
        }
    }

    function start(options = {}) {
        if (running) return;
        const hass = _getHassSafe();
        if (!hass || !hass.connection) {
            setTimeout(() => start(options), 500);
            return;
        }
        running = true;

        const prefixes = Array.isArray(options.prefixes) ? options.prefixes : [];
        prefixes.forEach(registerPrefix);

        unsub = hass.connection.subscribeEvents(_handleStateChanged, 'state_changed');

        console.log('[StateWatcher] Started', {
            mode: 'state_changed',
            prefixes,
            watched: watched.size
        });
    }

    function stop() {
        running = false;
        if (unsub) {
            try {
                unsub();
            } catch (e) {
                // ignore
            }
        }
        unsub = null;
        console.log('[StateWatcher] Stopped');
    }

    globalThis.DashboardStateWatcher = {
        start,
        stop,
        registerEntities,
        registerPrefix,
        onEntityChange,
    };
})();
