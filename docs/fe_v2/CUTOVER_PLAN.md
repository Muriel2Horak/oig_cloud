# OIG FE V2 - Cutover & Rollback Plan

## 1. Overview

### 1.1 Goal
Bezpečně přepnout výchozí dashboard z V1 na V2 s možností okamžitého rollbacku.

### 1.2 Strategy
- **Parallel Run:** V1 a V2 běží současně
- **Gradual Cutover:** Uživatelé postupně přecházejí
- **Instant Rollback:** Jedno-klik rollback k V1

---

## 2. Pre-Cutover Checklist

### 2.1 Technical Readiness
- [ ] V2 všechny PAR-XXX testy green
- [ ] V2 žádné critical console errors
- [ ] V2 memory stabilní (< 100MB po 1h)
- [ ] V2 mobile responsivita OK
- [ ] V2 HA Companion App testována (iOS + Android)
- [ ] V2 visual parity s V1 (tolerance < 5% pixel diff)
- [ ] V2 deploy script otestován
- [ ] Rollback script otestován

### 2.2 Operational Readiness
- [ ] Monitoring nastaven (console errors, performance)
- [ ] Uživatel informován o změně
- [ ] Rollback kontakt dostupný
- [ ] Backup V1 assets

---

## 3. Deployment Architecture

### 3.1 Current State (V1 Only)
```
HA Sidebar
├── OIG Dashboard → /oig_cloud_static/dashboard.html
```

### 3.2 Parallel Run (V1 + V2)
```
HA Sidebar
├── OIG Dashboard → /oig_cloud_static/dashboard.html
├── OIG Dashboard V2 (BETA) → /oig_cloud_static_v2/index.html
```

### 3.3 Post-Cutover (V2 Default)
```
HA Sidebar
├── OIG Dashboard → /oig_cloud_static_v2/index.html
├── OIG Dashboard (Legacy) → /oig_cloud_static/dashboard.html
```

---

## 4. Cutover Steps

### Phase 1: Deploy V2 (Parallel Run)

#### Step 1.1: Build V2
```bash
cd custom_components/oig_cloud/www_v2
npm run build
```

#### Step 1.2: Deploy V2 Assets
```bash
# Copy to HA
./deploy_to_ha.sh --fe-v2-only

# Verify
curl http://10.0.0.143:8123/oig_cloud_static_v2/index.html | head -20
```

#### Step 1.3: Register V2 Panel
Edit `custom_components/oig_cloud/__init__.py`:

```python
# Existing V1 panel (unchanged)
panel_url = "/oig_cloud_static/dashboard.html"

# Add V2 panel
panel_v2_url = "/oig_cloud_static_v2/index.html"

async def async_setup(hass, config):
    # ... existing V1 registration ...
    
    # Register V2 panel
    hass.http.register_static_path(
        "/oig_cloud_static_v2",
        hass.config.path("custom_components/oig_cloud/www_v2/dist"),
        cache_headers=False
    )
    
    hass.components.frontend.async_register_built_in_panel(
        component_name="custom",
        sidebar_title="OIG Dashboard V2 (BETA)",
        sidebar_icon="mdi:lightning-bolt",
        frontend_url_path="oig-cloud-v2",
        config={
            "_panel_custom": {
                "name": "oig-cloud-v2",
                "embed_iframe": True,
                "trust_external": False,
                "js_url": "/oig_cloud_static_v2/index.html"
            }
        },
        require_admin=False
    )
```

#### Step 1.4: Restart HA
```bash
./deploy_to_ha.sh --restart-only
```

#### Step 1.5: Verify
- [ ] V1 panel funguje
- [ ] V2 panel viditelný v sidebaru
- [ ] V2 panel načítá bez chyb

### Phase 2: Beta Testing (1-2 weeks)

#### Monitoring
```bash
# Check for errors
ssh ha-server "docker logs homeassistant 2>&1 | grep -i 'oig.*error'"

# Check console (user feedback)
```

#### User Feedback
- [ ] V2 používán denně
- [ ] Žádné kritické problémy
- [ ] Performance přijatelná

### Phase 3: Cutover (V2 Default)

#### Step 3.1: Update Panel Registration
Edit `custom_components/oig_cloud/__init__.py`:

```python
# Swap defaults
PANEL_TITLE = "OIG Dashboard"
PANEL_V2_URL = "/oig_cloud_static_v2/index.html"
PANEL_V1_URL = "/oig_cloud_static/dashboard.html"

async def async_setup(hass, config):
    # V2 is now default
    hass.components.frontend.async_register_built_in_panel(
        component_name="custom",
        sidebar_title=PANEL_TITLE,
        sidebar_icon="mdi:lightning-bolt",
        frontend_url_path="oig-cloud",
        config={
            "_panel_custom": {
                "name": "oig-cloud",
                "embed_iframe": True,
                "trust_external": False,
                "js_url": PANEL_V2_URL
            }
        },
        require_admin=False
    )
    
    # V1 as legacy
    hass.components.frontend.async_register_built_in_panel(
        component_name="custom",
        sidebar_title="OIG Dashboard (Legacy)",
        sidebar_icon="mdi:lightning-bolt-outline",
        frontend_url_path="oig-cloud-legacy",
        config={
            "_panel_custom": {
                "name": "oig-cloud-legacy",
                "embed_iframe": True,
                "trust_external": False,
                "js_url": PANEL_V1_URL
            }
        },
        require_admin=False
    )
```

#### Step 3.2: Deploy & Restart
```bash
./deploy_to_ha.sh
```

#### Step 3.3: Verify
- [ ] "OIG Dashboard" nyní vede na V2
- [ ] "OIG Dashboard (Legacy)" vede na V1
- [ ] V2 funguje korektně

### Phase 4: Deprecation (30 days)

- V1 označen jako "(Legacy)"
- Monitoring pokračuje
- Po 30 dnech bez kritických problémů → Phase 5

### Phase 5: Remove V1 (Optional)

```python
# Remove V1 registration
# Remove www/ directory (backup first!)
```

---

## 5. Rollback Plan

### 5.1 Instant Rollback (< 2 min)

#### Scenario: V2 má kritický bug

```bash
# Option A: Swap URLs in __init__.py
# Change PANEL_V2_URL to PANEL_V1_URL for default panel

# Option B: Use rollback script
./rollback_to_v1.sh
```

#### rollback_to_v1.sh
```bash
#!/bin/bash
set -e

HA_CONTAINER="homeassistant"
INIT_FILE="custom_components/oig_cloud/__init__.py"

echo "[ROLLBACK] Switching default panel to V1..."

# Update __init__.py to point V1 as default
sed -i.bak 's|PANEL_V2_URL|PANEL_V1_URL|g' "$INIT_FILE"
sed -i.bak 's|"js_url": "/oig_cloud_static_v2|"js_url": "/oig_cloud_static|g' "$INIT_FILE"

# Copy to container
docker cp "$INIT_FILE" "$HA_CONTAINER:/config/$INIT_FILE"

# Restart HA
docker restart "$HA_CONTAINER"

echo "[ROLLBACK] Complete. V1 is now default."
echo "[ROLLBACK] Verify at: http://10.0.0.143:8123/oig-cloud"
```

### 5.2 Partial Rollback

#### Scenario: Jen určitá feature je rozbitá

```typescript
// Feature flags in V2
const FEATURES = {
  particles: true,      // Can disable if performance issues
  charts: true,         // Can disable if Chart.js issues
  boiler: true,         // Can disable if API issues
  analytics: true,      // Can disable if data issues
};

// Runtime toggle via localStorage
// localStorage.setItem('oig_v2_features', JSON.stringify({ particles: false }))
```

### 5.3 Data Migration Rollback

#### Scenario: Storage keys incompatible

```typescript
// V2 uses oig_v2_* prefix, V1 uses oig_*
// No shared state - rollback is clean

// If needed, migrate back:
function migrateV2ToV1() {
  const v2Layout = localStorage.getItem('oig_v2_layout_desktop');
  if (v2Layout) {
    localStorage.setItem('oig_layout_desktop', v2Layout);
    localStorage.removeItem('oig_v2_layout_desktop');
  }
}
```

---

## 6. Monitoring

### 6.1 Health Checks

```bash
# Script: monitor_v2.sh
#!/bin/bash

# Check V2 panel responds
V2_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://10.0.0.143:8123/oig_cloud_static_v2/index.html)

if [ "$V2_STATUS" != "200" ]; then
  echo "[ALERT] V2 panel not responding: $V2_STATUS"
  # Send notification
  exit 1
fi

# Check for JS errors in HA logs
ERRORS=$(docker logs homeassistant 2>&1 | grep -c "oig.*error" | tail -1)
if [ "$ERRORS" -gt 10 ]; then
  echo "[WARN] Multiple OIG errors detected: $ERRORS"
fi

echo "[OK] V2 health check passed"
```

### 6.2 Metrics to Track

| Metric | Threshold | Action |
|--------|-----------|--------|
| Console errors | > 5/min | Investigate |
| Load time | > 3s | Optimize |
| Memory usage | > 150MB | Check leak |
| User complaints | > 0 critical | Rollback |

---

## 7. Communication Plan

### 7.1 Pre-Cutover
```
Subject: OIG Dashboard V2 Coming Soon

Váš OIG Dashboard dostane aktualizaci.
Nová verze V2 bude dostupná v sidebaru jako "V2 (BETA)".

Datum: [DATE]
Změny: Rychlejší načítání, lepší stabilita
Rollback: V1 zůstane dostupný
```

### 7.2 Cutover
```
Subject: OIG Dashboard V2 is Now Default

V2 je nyní výchozí verze.
Pokud narazíte na problém, použijte "OIG Dashboard (Legacy)".
```

### 7.3 Issue Found
```
Subject: OIG Dashboard - Problém vyřešen

Detekovali jsme problém ve V2.
Dočasně jsme přešli zpět na V1.
Očekávaná oprava: [DATE]
```

---

## 8. Timeline

```
Week 1:
├── Day 1-2: Deploy V2 (Parallel Run)
├── Day 3-7: Beta testing

Week 2:
├── Day 8-14: Continued beta, bug fixes

Week 3:
├── Day 15: Cutover (V2 default)
├── Day 16-21: Monitoring

Week 4-8:
├── V1 as Legacy
├── Monitoring continues

Week 9+:
├── Optionally remove V1
```

---

## 9. Emergency Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| Developer | [YOUR CONTACT] | 24/7 for critical |
| HA Admin | [HA ADMIN] | Business hours |
| User | [USER] | For feedback |

---

## 10. Rollback Decision Matrix

| Issue | Severity | Impact | Action |
|-------|----------|--------|--------|
| Dashboard not loading | Critical | All users | Instant rollback |
| Feature broken | High | Some users | Feature flag disable |
| Performance slow | Medium | UX impact | Investigate, no rollback |
| Visual glitch | Low | Minor | Log, fix in next release |
| API error | High | Data missing | Check backend, consider rollback |

---

## 11. Post-Cutover Validation

### Immediate (within 1 hour)
- [ ] V2 default panel loads
- [ ] All tabs functional
- [ ] No console errors
- [ ] Mobile works

### 24 hours
- [ ] Memory stable
- [ ] No user complaints
- [ ] Performance acceptable

### 7 days
- [ ] No critical issues
- [ ] V1 Legacy usage < 10%
- [ ] Ready to deprecate V1
