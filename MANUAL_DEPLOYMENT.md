# Manual Deployment Guide for OIG Cloud Dashboard Fixes

## Problem Fixed: `ReferenceError: fetchWithAuth is not defined`

Root cause: Race condition - inline `DOMContentLoaded` listener was running before `api.js` was loaded.

## Files Modified:

### 1. `/custom_components/oig_cloud/www/dashboard.html`
**Lines 1065-1101:** Prefetch timeline data
- **Removed:** `document.addEventListener('DOMContentLoaded')` listener
- **Added:** Deferred function with `typeof fetchWithAuth` check
- **Added:** 500ms retry mechanism

### 2. `/custom_components/oig_cloud/www/js/features/timeline.js`
**Lines ~588:** `loadAllTabsData()` function
**Lines ~3737:** `buildExtendedTimeline()` function
- **Added:** `if (typeof fetchWithAuth !== 'function')` checks

### 3. `/custom_components/oig_cloud/www/js/features/pricing.js`
**Lines ~2261:** `fetchTimelineFromAPI()` function
- **Added:** `if (typeof fetchWithAuth !== 'function')` check

### 4. `/custom_components/oig_cloud/www/js/features/analytics.js`
**Lines ~57:** `fetchCostComparisonTileData()` function
- **Added:** `if (typeof fetchWithAuth !== 'function')` check

## Deployment Methods:

### Method 1: HA File Editor (Recommended)
1. Open HA: http://10.0.0.143:8123
2. Go to: Settings → File editor
3. Navigate to: `/config/custom_components/oig_cloud/www/`
4. Open `dashboard.html`
5. Replace lines 1065-1101 with the fixed version
6. Save the file
7. Navigate to: `/config/custom_components/oig_cloud/www/js/features/`
8. Open each file:
   - `timeline.js`
   - `pricing.js`
   - `analytics.js`
9. Add the defensive checks at the beginning of the specified functions
10. Save each file
11. Go to: Settings → Devices & Services → OIG Cloud → ⚙️ → Reload
12. Wait 10-20 seconds

### Method 2: Samba/CIFS Share
1. Mount HA share: `//10.0.0.143/config`
2. Navigate to: `custom_components/oig_cloud/www/`
3. Copy modified files:
   - `dashboard.html`
   - `js/features/timeline.js`
   - `js/features/pricing.js`
   - `js/features/analytics.js`
4. Reload HA integration

### Method 3: Terminal Access (if permissions allow)
```bash
# Check if homeassistant user can write
ssh hassio@10.0.0.143 "whoami"
ssh hassio@10.0.0.143 "touch /config/test_write && rm /config/test_write"

# If write works, deploy:
cat dashboard.html | ssh hassio@10.0.0.143 "cat > /config/custom_components/oig_cloud/www/dashboard.html"
```

### Method 4: HA Terminal Add-on
1. Install "SSH & Web Terminal" add-on
2. Open terminal
3. Use `homeassistant` user to deploy files

## Testing:

### Manual Testing (Chrome DevTools)
1. Open dashboard: https://ha.muriel-cz.cz/local/oig_cloud_dashboard
2. Open Chrome DevTools (F12)
3. Go to Console tab
4. Clear console
5. Refresh page (Ctrl+Shift+R)
6. Check for errors:
   - ❌ `ReferenceError: fetchWithAuth is not defined` → Fix failed
   - ✅ No fetchWithAuth error → Fix working

### Automated Testing (Playwright)
```bash
cd /Users/martinhorak/Downloads/oig_cloud
python test_dashboard_fixes.py
```

### API Endpoint Testing
```bash
# Test detail_tabs API
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://10.0.0.143:8123/api/oig_cloud/battery_forecast/2206237016/detail_tabs?tab=today
```

## Expected Results:

### Before Fix:
```
Uncaught ReferenceError: fetchWithAuth is not defined
    at dashboard.html?entry_id=...:1074:21
    at timeline.js?...:3735:26
    at pricing.js?...:2265:22
    at analytics.js?...:60:27
```

### After Fix:
```
✅ [Dashboard] Prefetching timeline data...
✅ [Dashboard] Prefetched today data: 12 blocks
✅ [TimelineDialog] Loading ALL tabs data for plan hybrid...
✅ [Pricing] Fetching hybrid timeline from API...
✅ [DashboardTimeline] Module loaded
✅ No fetchWithAuth errors
```

## Troubleshooting:

### Cache Issues:
If you still see old code, hard refresh:
- **Windows:** Ctrl + Shift + R
- **Mac:** Cmd + Shift + R

### Files Not Updating:
1. Check file timestamps: `ls -la /config/custom_components/oig_cloud/www/`
2. Verify files were actually modified
3. Check HA logs for any file read errors

### Still Seeing fetchWithAuth Error:
1. Verify all 4 files were updated
2. Clear browser cache
3. Clear HA cache: Settings → File Editor → ⋮ → Reload Resources
4. Check JavaScript console for other errors

## Verification Checklist:

- [ ] `dashboard.html` updated with deferred prefetch
- [ ] `timeline.js` updated with defensive checks
- [ ] `pricing.js` updated with defensive checks
- [ ] `analytics.js` updated with defensive checks
- [ ] Files saved in HA File Editor
- [ ] OIG Cloud integration reloaded
- [ ] Dashboard opened in browser
- [ ] Console checked for `fetchWithAuth is not defined` errors
- [ ] Timeline data loading (console shows "Prefetched today data")
- [ ] Battery forecast data visible in UI

## Rollback:

If deployment causes issues:
1. Restore from backup: `/config/backups/`
2. Or revert changes in HA File Editor
3. Reload integration
