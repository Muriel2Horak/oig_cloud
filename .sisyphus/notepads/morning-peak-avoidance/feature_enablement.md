# Safe Feature Flag Enablement Guide

## Overview
The Morning Peak Avoidance feature is deployed but disabled by default. This guide provides step-by-step instructions for safely enabling and testing the feature.

## Prerequisites
- [ ] HA deployment completed successfully
- [ ] HA service restarted and is stable
- [ ] No error logs related to the new feature
- [ ] Feature entities are available in HA

## Current Status Check

Before enabling, verify the current state:

### 1. Check Feature Flag Status
```bash
# Using HA API
curl -s -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  "$HA_URL/api/states" | \
  grep -i "enable_pre_peak_charging" | \
  jq -r '.state'
```
Expected: `False` (safe default)

### 2. Check Canary Threshold
```bash
curl -s -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  "$HA_URL/api/states" | \
  grep -i "pre_peak_charging_canary_soc_threshold_kwh" | \
  jq -r '.state'
```
Expected: `1.5` (kWh)

### 3. Check Battery State
```bash
curl -s -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  "$HA_URL/api/states" | \
  grep -i "oig_cloud_battery_soc" | \
  jq -r '.state'
```
Note: Current battery SOC percentage

## Enablement Procedure

### Step 1: Enable Feature Flag
**Method A: Using HA UI**
1. Navigate to HA → Developer Tools → Services
2. Service: `number.set_value`
3. Entity: `number.oig_cloud_enable_pre_peak_charging`
4. Value: `1` (for True)
5. Click "Call Service"

**Method B: Using HA API**
```bash
curl -X POST -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "number.oig_cloud_enable_pre_peak_charging", "value": 1}' \
  "$HA_URL/api/services/number/set_value"
```

### Step 2: Monitor Initial Activation
After enabling, monitor for:

#### Expected Behaviors (Morning Hours 6-9 AM)
- [ ] `binary_sensor.oig_cloud_pre_peak_charging_active` becomes `on`
- [ ] Log messages: "Pre-peak charging active"
- [ ] Battery SOC increases if below threshold
- [ ] Charging stops when threshold is reached

#### Log Monitoring
```bash
# Check for pre-peak activity
curl -s -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  "$HA_URL/api/states" | \
  grep -i "pre_peak" | \
  jq -r '.attributes.friendly_name, .state'
```

### Step 3: Test Canary Threshold (1.5 kWh)
The feature will only activate when:
1. Battery SOC < 20% (approx 2.048 kWh remaining)
2. During morning peak hours (typically 6-9 AM)
3. Canary threshold is set (1.5 kWh)

**To verify it's working:**
1. Wait for morning peak hours
2. Monitor `binary_sensor.oig_cloud_pre_peak_charging_active`
3. Check if battery charges appropriately
4. Verify charging stops at threshold

### Step 4: Adjust Threshold (Optional)
If the 1.5 kWh threshold needs adjustment:

```bash
# Set new threshold (e.g., 2.0 kWh)
curl -X POST -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "number.oig_cloud_pre_peak_charging_canary_soc_threshold_kwh", "value": 2.0}' \
  "$HA_URL/api/services/number/set_value"
```

## Safety Checks

### During Enablement
- [ ] Monitor HA CPU/Memory usage
- [ ] Check for any error logs
- [ ] Verify normal OIG Cloud functionality continues
- [ ] Ensure battery behavior is expected

### If Issues Occur
**Immediate Actions:**
1. **Disable feature flag immediately:**
   ```bash
   curl -X POST -H "Authorization: Bearer $HA_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"entity_id": "number.oig_cloud_enable_pre_peak_charging", "value": 0}' \
     "$HA_URL/api/services/number/set_value"
   ```

2. **Restart HA:**
   ```bash
   curl -X POST -H "Authorization: Bearer $HA_TOKEN" \
     -H "Content-Type: application/json" \
     "$HA_URL/api/services/homeassistant/restart"
   ```

3. **Check logs for errors**
4. **Document the issue**

## Monitoring After Enablement

### First 24 Hours
- [ ] Check HA logs hourly for errors
- [ ] Monitor battery SOC during morning peak
- [ ] Verify charging stops at threshold
- [ ] Ensure no negative impact on grid operations

### First Week
- [ ] Daily check of morning peak behavior
- [ ] Monitor overall battery performance
- [ ] Check for any pattern anomalies
- [ ] Adjust threshold if needed

## Success Criteria

The feature is working successfully when:
- [ ] Pre-peak charging activates during morning hours
- [ ] Charging stops at configured threshold
- [ ] No HA errors or instability
- [ ] Battery SOC remains at optimal levels
- [ ] Normal OIG Cloud functionality unaffected

## Troubleshooting

### Feature Not Activating
1. Verify `enable_pre_peak_charging` is True
2. Check current time is during morning peak (6-9 AM)
3. Ensure battery SOC is below 20%
4. Review logs for any error messages

### Unexpected Charging Behavior
1. Check threshold setting
2. Verify battery SOC accuracy
3. Review HA logs for error messages
4. Consider adjusting threshold value

### HA Performance Issues
1. Monitor CPU/Memory usage
2. Check for error logs
3. Restart HA if needed
4. Disable feature if issues persist

## Rollback Plan

If issues cannot be resolved:
1. Set `enable_pre_peak_charging` to False
2. Restart HA
3. Document the issue
4. Consider threshold adjustment or code review

## Contact Information
- **Feature Owner**: Development Team
- **HA Admin**: Martin Horak
- **Emergency**: Disable feature flag immediately if issues occur