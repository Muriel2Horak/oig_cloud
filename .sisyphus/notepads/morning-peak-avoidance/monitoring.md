# Morning Peak Avoidance Deployment Monitoring

## Deployment Status
- **Deployed**: 2025-03-03 
- **HA Server**: 10.0.0.143:8123
- **BOX_ID**: 2206237016
- **Feature Flag**: `enable_pre_peak_charging` (defaults to False)
- **Canary Threshold**: 1.5 kWh

## Monitoring Checklist

### 1. HA Service Health
- [ ] Verify HA is running and accessible
- [ ] Check HA logs for startup errors
- [ ] Confirm OIG Cloud integration is loaded

### 2. Integration Status
- [ ] Navigate to HA → Settings → Integrations → OIG Cloud
- [ ] Verify integration shows as "Available" 
- [ ] Check for any configuration warnings

### 3. Feature Flag Status
- [ ] Check `enable_pre_peak_charging` is False (safe default)
- [ ] Verify `pre_peak_charging_canary_soc_threshold_kwh` is 1.5
- [ ] Confirm feature entities are available but not active

### 4. Entity Availability
Morning Peak Avoidance creates these entities:
- `sensor.oig_cloud_pre_peak_availability` - Shows if peak avoidance is active
- `binary_sensor.oig_cloud_pre_peak_charging_active` - Shows if charging for peak avoidance
- `number.oig_cloud_pre_peak_charging_canary_soc_threshold_kwh` - Configurable threshold

### 5. Log Monitoring
Monitor these log patterns:
- **INFO**: "Pre-peak avoidance scheduled"
- **INFO**: "Pre-peak charging active"
- **INFO**: "Pre-peak charging completed"
- **WARNING**: "Pre-peak charging skipped" (normal when disabled)
- **ERROR**: Any pre-peak related errors

### 6. Performance Monitoring
- [ ] Monitor HA restart time (should be < 2 minutes)
- [ ] Check for increased CPU/memory usage
- [ ] Verify normal OIG Cloud polling continues working

## Rollback Procedures

### Immediate Rollback
If issues occur after enabling the feature:
1. Set `enable_pre_peak_charging` to False
2. Restart HA
3. Monitor for error resolution

### Full Deployment Rollback
If deployment causes instability:
1. Revert to previous commit (before morning peak changes)
2. Run `./deploy_to_ha.sh` again
3. Monitor HA stability

## Enablement Procedure

### Phase 1: Canary Testing (1.5 kWh threshold)
1. Set `enable_pre_peak_charging` to True
2. Monitor logs for 24 hours
3. Check battery behavior during morning peak (6-9 AM)
4. Verify no negative impact on normal operations

### Phase 2: Full Rollout
If canary testing successful:
1. Adjust `pre_peak_charging_canary_soc_threshold_kwh` if needed
2. Continue monitoring for 1 week
3. Document performance metrics and user experience

## Emergency Contacts
- HA Admin: Martin Horak
- Deployment Support: Check GitHub issues
- Critical Issues: Disable feature flag immediately

## Troubleshooting

### Common Issues
1. **Feature not working**: Check `enable_pre_peak_charging` is True
2. **No entities**: Verify deployment completed successfully
3. **Unexpected behavior**: Review logs for pre-peak related messages
4. **Performance issues**: Monitor HA resource usage

### Log Commands
```bash
# Check HA logs
curl -s -H "Authorization: Bearer $TOKEN" "$HA_URL/api/states" | grep -i pre_peak

# Check for errors
curl -s -H "Authorization: Bearer $TOKEN" "$HA_URL/api/states" | grep -i "oig_cloud" | grep -i error
```

### Feature Status Check
```bash
# Check current feature flag status
curl -s -H "Authorization: Bearer $TOKEN" "$HA_URL/api/states" | grep -i "enable_pre_peak_charging"
```

## Success Criteria
- [ ] HA restarts successfully with new code
- [ ] No error logs related to pre-peak avoidance
- [ ] Feature flag can be enabled/disabled safely
- [ ] Battery behavior follows expected patterns
- [ ] No impact on normal OIG Cloud functionality