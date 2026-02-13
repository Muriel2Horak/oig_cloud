import { BoilerProfile, BoilerState, BoilerHourData } from '@/ui/features/boiler/types';

const INVERTER_SN = new URLSearchParams(window.location.search).get('inverter_sn') || '2206237016';

export function getSensorId(sensor: string): string {
  return `sensor.oig_${INVERTER_SN}_${sensor}`;
}

interface HassState {
  state: string;
  attributes?: Record<string, any>;
  last_updated?: string;
}

function parseNumber(state: HassState | null | undefined): number {
  if (!state?.state) return 0;
  const val = parseFloat(state.state);
  return isNaN(val) ? 0 : val;
}

function parseString(state: HassState | null | undefined): string {
  if (!state?.state || state.state === 'unknown' || state.state === 'unavailable') return '';
  return state.state;
}

interface BoilerProfileAPI {
  id?: string;
  name?: string;
  target_temp?: number;
  start_time?: string;
  end_time?: string;
  days?: number[];
  enabled?: boolean;
}

interface BoilerPlanAPI {
  state?: {
    current_temp?: number;
    target_temp?: number;
    heating?: boolean;
    next_profile?: string;
    next_start?: string;
  };
  profiles?: Record<string, BoilerProfileAPI>;
  current_category?: string;
  config?: {
    min_temp?: number;
    max_temp?: number;
  };
  summary?: {
    today_hours?: number[];
    predicted_kwh?: number;
    predicted_cost?: number;
  };
}

export async function fetchBoilerProfile(hass: any): Promise<BoilerPlanAPI | null> {
  try {
    const entryId = INVERTER_SN;
    
    if (hass?.callApi) {
      return await hass.callApi('GET', `oig_cloud/${entryId}/boiler_profile`);
    }
    
    const token = hass?.auth?.data?.access_token;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    
    const response = await fetch(`/api/oig_cloud/${entryId}/boiler_profile`, { headers });
    if (!response.ok) return null;
    
    return await response.json();
  } catch (err) {
    console.warn('[Boiler] Failed to fetch profile:', err);
    return null;
  }
}

export async function fetchBoilerPlan(hass: any): Promise<BoilerPlanAPI | null> {
  try {
    const entryId = INVERTER_SN;
    
    if (hass?.callApi) {
      return await hass.callApi('GET', `oig_cloud/${entryId}/boiler_plan`);
    }
    
    const token = hass?.auth?.data?.access_token;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    
    const response = await fetch(`/api/oig_cloud/${entryId}/boiler_plan`, { headers });
    if (!response.ok) return null;
    
    return await response.json();
  } catch (err) {
    console.warn('[Boiler] Failed to fetch plan:', err);
    return null;
  }
}

export function extractBoilerState(hass: any): BoilerState {
  const states = hass?.states || {};
  
  const currentTemp = parseNumber(states[getSensorId('boiler_temperature')]);
  const targetTemp = parseNumber(states[getSensorId('boiler_target_temperature')]);
  const heatingState = parseString(states[getSensorId('boiler_heating')]);
  
  return {
    currentTemp: currentTemp || 45,
    targetTemp: targetTemp || 55,
    heating: heatingState === 'on' || heatingState === 'heating',
    nextProfile: '',
    nextStart: '',
  };
}

export function parseBoilerProfiles(data: BoilerPlanAPI | null): BoilerProfile[] {
  if (!data?.profiles) return [];
  
  return Object.entries(data.profiles).map(([id, profile]) => ({
    id,
    name: profile.name || id,
    targetTemp: profile.target_temp || 55,
    startTime: profile.start_time || '06:00',
    endTime: profile.end_time || '22:00',
    days: profile.days || [1, 1, 1, 1, 1, 0, 0],
    enabled: profile.enabled !== false,
  }));
}

export function parseBoilerState(data: BoilerPlanAPI | null): BoilerState {
  const state = data?.state;
  
  return {
    currentTemp: state?.current_temp || 45,
    targetTemp: state?.target_temp || 55,
    heating: state?.heating || false,
    nextProfile: state?.next_profile || '',
    nextStart: state?.next_start || '',
  };
}

export function generateHeatmapData(data: BoilerPlanAPI | null): BoilerHourData[] {
  const hours: BoilerHourData[] = [];
  
  const summary = data?.summary?.today_hours || [];
  
  for (let i = 0; i < 24; i++) {
    const isActive = summary.includes(i);
    hours.push({
      hour: i,
      temp: isActive ? 55 : 25,
      heating: isActive,
    });
  }
  
  return hours;
}

export interface BoilerData {
  state: BoilerState;
  profiles: BoilerProfile[];
  heatmap: BoilerHourData[];
}

export async function loadBoilerData(hass: any): Promise<BoilerData> {
  const [profileData, planData] = await Promise.all([
    fetchBoilerProfile(hass),
    fetchBoilerPlan(hass),
  ]);
  
  const combinedData = planData || profileData;
  
  return {
    state: parseBoilerState(combinedData),
    profiles: parseBoilerProfiles(combinedData),
    heatmap: generateHeatmapData(combinedData),
  };
}
