# OIG Cloud Deployment Complete

## Summary

✅ **Deployment Status:** COMPLETED

### What Was Deployed:
1. **dashboard.html** - Fixed `fetchWithAuth is not defined` race condition
   - Removed inline `DOMContentLoaded` listener
   - Added deferred logic with 500ms retry
   - Added `typeof fetchWithAuth !== 'function'` check

2. **timeline.js** - Added defensive checks
   - Added check in `loadAllTabsData()` (line ~588)
   - Added check in `buildExtendedTimeline()` (line ~3737)

3. **pricing.js** - Added defensive check
   - Added check in `fetchTimelineFromAPI()` (line ~2261)

4. **analytics.js** - Added defensive check
   - Added check in `fetchCostComparisonTileData()` (line ~57)

5. **All 741 files** - Deployed via rsync
6. **Permissions fixed** - Set to 644 for files, 755 for directories

## What Was the Problem?

### Original Error:
```
Uncaught ReferenceError: fetchWithAuth is not defined
    at dashboard.html?entry_id=...:1074:21
    at timeline.js?...:3735:26
    at pricing.js?...:2265:22
    at analytics.js?...:60:27
```

### Root Cause:
Inline `DOMContentLoaded` event listener in `dashboard.html` was running BEFORE all scripts were loaded, specifically BEFORE `api.js` where `fetchWithAuth` is defined.

### Deployment Issues Encountered:
1. **Permission denied (13)** - SSH Terminal add-on user doesn't have write permissions
2. **Operation not permitted** - Cannot set file times on remote
3. **r-x permissions** - Files are read-only, need `root` ownership

### Solutions Applied:
1. ✅ Used `chown` to fix file permissions
2. ✅ Used `chmod` to set proper file/directory permissions
3. ✅ Deployed entire project with rsync for consistency

## Next Steps

### Step 1: Reload OIG Cloud Integration

**Option A: Via HA UI (Recommended)**
1. Open Home Assistant: http://<HA_HOST>:8123
2. Go to: Settings → Devices & Services
3. Find: OIG Cloud integration
4. Click: ⚙️ (three dots) → Reload
5. Wait 10-20 seconds
6. Proceed to Step 2

**Option B: Via HA CLI (if available)**
```bash
ssh ha
ha config entries list | jq '.[] | select(.domain == "oig_cloud") | .entry_id'
# Note the entry_id
ha config entries reload <entry_id>
```

### Step 2: Test Dashboard

1. Open dashboard: https://ha.muriel-cz.cz/local/oig_cloud_dashboard
2. Open Chrome DevTools (F12)
3. Go to Console tab
4. Clear console if needed (clear button or Ctrl+L)
5. Refresh page (Ctrl+Shift+R or Cmd+Shift+R to bypass cache)

### Step 3: Verify Fix

**Check Console for Errors:**
- ❌ **If you see:** `ReferenceError: fetchWithAuth is not defined`
  - Fix FAILED - something went wrong
  - Check that all 4 files were deployed
  - Try hard refresh: Ctrl+Shift+R

- ✅ **If you see NO such error:**
  - Fix WORKING!
  - Look for these success logs:
    ```
    [Dashboard] Prefetching timeline data...
    [Dashboard] Prefetched today data: X blocks
    [TimelineDialog] Loading ALL tabs data for plan hybrid...
    ```

### Step 4: Verify Data Loading

**In Console, check for:**
```
[Pricing] Fetching hybrid timeline from API...
[Pricing] API fetch completed in XXXms - loaded XXX points for hybrid plan
```

**In Network tab (Chrome DevTools):**
- Check for successful API calls:
  - `/api/oig_cloud/battery_forecast/2206237016/detail_tabs`
  - `/api/oig_cloud/spot_prices`
  - `/api/oig_cloud/battery_forecast/2206237016/timeline`

### Step 5: Verify UI Functionality

**Check these tabs:**
1. **⚡ Toky** tab - Should show current energy flows
2. **💰 Predikce a statistiky** tab - Should show:
   - Spot prices
   - Cost comparison tiles
   - Battery forecast data
   - Timeline charts

**Expected Results:**
- ✅ No `fetchWithAuth is not defined` errors
- ✅ Timeline data loads successfully
- ✅ Battery forecast data visible
- ✅ Spot prices visible
- ✅ Charts render correctly

## Troubleshooting

### If you still see `fetchWithAuth is not defined`:

**Cause:** Browser is using cached version

**Solution:**
1. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. Clear browser cache:
   - Chrome DevTools → Application tab → Clear storage → Clear site data
3. Check files on server:
   ```bash
   ssh ha "grep -n 'fetchWithAuth' /config/custom_components/oig_cloud/www/js/core/api.js | head -5"
   ```
   Should show the function is defined

### If timeline data doesn't load:

**Check:**
1. API is accessible:
   ```bash
   curl http://<HA_HOST>:8123/api/oig_cloud/battery_forecast/2206237016/detail_tabs?tab=today
   ```
   Should return JSON data

2. HA is using updated files:
   - Check file modification time:
   ```bash
   ssh ha "ls -la /config/custom_components/oig_cloud/www/dashboard.html | grep -E 'Feb 12|Feb 13'"
   ```

### If permissions error persists:

```bash
ssh ha "sudo chown -R root:root /config/custom_components/oig_cloud"
ssh ha "sudo chmod -R 644 /config/custom_components/oig_cloud"
ssh ha "sudo find /config/custom_components/oig_cloud -type d -exec chmod 755 {} \\;"
```

## Rollback Plan

If deployment causes issues:

**Option A: Manual Restore via HA File Editor**
1. Open: Settings → File Editor
2. Navigate to: `/config/custom_components/oig_cloud/`
3. Find backup directory: `/config/custom_components/oig_cloud_backups/`
4. Copy files from backup to main directory
5. Reload OIG Cloud integration

**Option B: Via Backup**
```bash
# List available backups
ssh ha "ls -la /config/custom_components/oig_cloud_backups/"

# Restore specific backup
ssh ha "rm -rf /config/custom_components/oig_cloud/*"
ssh ha "cp -r /config/custom_components/oig_cloud_backups/backup_YYYYMMDD_HHMMSS/* /config/custom_components/oig_cloud/"
```

## Success Criteria

Deployment is successful when:
- [x] All 4 files deployed with defensive checks
- [x] File permissions set correctly (644 files, 755 dirs)
- [ ] OIG Cloud integration reloaded
- [ ] Dashboard loads without `fetchWithAuth is not defined` error
- [ ] Console shows success logs
- [ ] Timeline data loads (prefetched today data)
- [ ] Battery forecast visible in UI
- [ ] Spot prices visible in UI

## Files Modified

| File | Lines Changed | Purpose |
|------|--------------|---------|
| `www/dashboard.html` | 1065-1101 | Fix prefetch race condition |
| `www/js/features/timeline.js` | ~588, ~3737 | Add defensive checks |
| `www/js/features/pricing.js` | ~2261 | Add defensive check |
| `www/js/features/analytics.js` | ~57 | Add defensive check |

## Deployment Method

**Tool:** `rsync` via SSH
**Files transferred:** 741
**Directories:** 61
**Source:** `/Users/martinhorak/Downloads/oig_cloud/custom_components/oig_cloud/`
**Target:** `/config/custom_components/oig_cloud/`

## Testing Tools

**Available Tests:**
1. `/Users/martinhorak/Downloads/oig_cloud/test_dashboard_fixes.py` - Playwright automated tests
2. `/tmp/test_dashboard_fixes.js` - Manual console tests

**To run automated tests:**
```bash
cd /Users/martinhorak/Downloads/oig_cloud
python test_dashboard_fixes.py
```

**To run manual tests:**
1. Open dashboard: https://ha.muriel-cz.cz/local/oig_cloud_dashboard
2. Open Chrome DevTools (F12)
3. Go to Console tab
4. Copy and paste content of `/tmp/test_dashboard_fixes.js`
5. Press Enter
6. Check test results

---

**Deployment completed:** $(date)
**Next action:** Reload OIG Cloud integration in HA UI
