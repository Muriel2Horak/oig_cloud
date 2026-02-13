import { PricePoint, PriceBlock, PricingStats, PricingData } from '@/ui/features/pricing/types';

const params = new URLSearchParams(window.location.search);
const INVERTER_SN = params.get('sn') || params.get('inverter_sn') || '2206237016';

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

interface TimelinePoint {
  timestamp: string;
  price?: number;
  export_price?: number;
  solar_power?: number;
  battery_soc?: number;
  consumption?: number;
  mode?: string;
}

export async function fetchSpotPrices(hass: any): Promise<PricePoint[]> {
  try {
    if (hass?.callApi) {
      const response = await hass.callApi('GET', `oig_cloud/spot_prices/${INVERTER_SN}/intervals`);
      return parseSpotPriceResponse(response);
    }
    
    const token = hass?.auth?.data?.access_token;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    
    const response = await fetch(`/api/oig_cloud/spot_prices/${INVERTER_SN}/intervals`, { headers });
    if (!response.ok) return [];
    
    const data = await response.json();
    return parseSpotPriceResponse(data);
  } catch (err) {
    console.warn('[Pricing] Failed to fetch spot prices:', err);
    return [];
  }
}

function parseSpotPriceResponse(data: any): PricePoint[] {
  // Backend vrací { intervals: [{time, price}] }, fallback na { prices: [{timestamp, price}] }
  const items = data?.intervals || data?.prices;
  if (!items || !Array.isArray(items)) return [];
  
  return items.map((p: any) => ({
    time: p.time || p.timestamp,
    buy: p.price ?? 0,
    sell: p.export_price ?? Math.round((p.price ?? 0) * 0.7 * 100) / 100,
  }));
}

export async function fetchTimelineData(hass: any): Promise<TimelinePoint[]> {
  try {
    if (hass?.callApi) {
      return await hass.callApi('GET', `oig_cloud/battery_forecast/${INVERTER_SN}/timeline`);
    }
    
    const token = hass?.auth?.data?.access_token;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    
    const response = await fetch(`/api/oig_cloud/battery_forecast/${INVERTER_SN}/timeline`, { headers });
    if (!response.ok) return [];
    
    return await response.json();
  } catch (err) {
    console.warn('[Pricing] Failed to fetch timeline:', err);
    return [];
  }
}

export function extractCurrentPrices(hass: any): { buy: number; sell: number } {
  const states = hass?.states || {};
  
  const buyEntity = states[getSensorId('spot_price_current_15min')];
  const sellEntity = states[getSensorId('export_price_current_15min')];
  
  return {
    buy: parseNumber(buyEntity),
    sell: parseNumber(sellEntity),
  };
}

export function calculatePricingStats(prices: PricePoint[]): PricingStats {
  if (prices.length === 0) {
    return {
      cheapestBuy: { time: '', price: 0 },
      bestSell: { time: '', price: 0 },
      avgBuy: 0,
      avgSell: 0,
      totalCost: 0,
    };
  }
  
  const buyPrices = prices.map(p => p.buy);
  const sellPrices = prices.map(p => p.sell);
  
  const avgBuy = buyPrices.reduce((a, b) => a + b, 0) / buyPrices.length;
  const avgSell = sellPrices.reduce((a, b) => a + b, 0) / sellPrices.length;
  
  const cheapestIdx = buyPrices.indexOf(Math.min(...buyPrices));
  const bestSellIdx = sellPrices.indexOf(Math.max(...sellPrices));
  
  return {
    cheapestBuy: { time: prices[cheapestIdx].time, price: prices[cheapestIdx].buy },
    bestSell: { time: prices[bestSellIdx].time, price: prices[bestSellIdx].sell },
    avgBuy: Math.round(avgBuy * 100) / 100,
    avgSell: Math.round(avgSell * 100) / 100,
    totalCost: 0,
  };
}

export function findPriceBlocks(prices: PricePoint[], blockHours: number = 3): PriceBlock[] {
  if (prices.length === 0) return [];
  
  const blockSize = Math.floor((blockHours * 60) / 15);
  if (prices.length < blockSize) return [];
  
  const blocks: PriceBlock[] = [];
  
  const cheapestBlock = findExtremeBlock(prices, blockSize, true);
  if (cheapestBlock) {
    blocks.push({
      start: cheapestBlock.start,
      end: cheapestBlock.end,
      type: 'cheap',
      avgPrice: cheapestBlock.avg,
    });
  }
  
  const expensiveBlock = findExtremeBlock(prices, blockSize, false);
  if (expensiveBlock) {
    blocks.push({
      start: expensiveBlock.start,
      end: expensiveBlock.end,
      type: 'expensive',
      avgPrice: expensiveBlock.avg,
    });
  }
  
  return blocks;
}

function findExtremeBlock(
  prices: PricePoint[],
  blockSize: number,
  findLowest: boolean
): { start: string; end: string; avg: number } | null {
  let extremeBlock: { start: string; end: string; avg: number } | null = null;
  let extremeAvg = findLowest ? Infinity : -Infinity;
  
  for (let i = 0; i <= prices.length - blockSize; i++) {
    const block = prices.slice(i, i + blockSize);
    const blockAvg = block.reduce((sum, p) => sum + p.buy, 0) / blockSize;
    
    if ((findLowest && blockAvg < extremeAvg) || (!findLowest && blockAvg > extremeAvg)) {
      extremeAvg = blockAvg;
      extremeBlock = {
        start: block[0].time,
        end: block[block.length - 1].time,
        avg: blockAvg,
      };
    }
  }
  
  return extremeBlock;
}

export async function loadPricingData(hass: any): Promise<PricingData | null> {
  try {
    const prices = await fetchSpotPrices(hass);
    
    if (prices.length === 0) {
      return null;
    }
    
    const stats = calculatePricingStats(prices);
    const blocks = findPriceBlocks(prices);
    
    return {
      prices,
      blocks,
      stats,
    };
  } catch (err) {
    console.error('[Pricing] Failed to load pricing data:', err);
    return null;
  }
}

export function extractSolarForecast(hass: any): number[] {
  const states = hass?.states || {};
  const solarEntity = states[getSensorId('solar_forecast')];
  
  if (!solarEntity?.attributes) return [];
  
  const today = solarEntity.attributes.today_hourly_string1_kw || {};
  const tomorrow = solarEntity.attributes.tomorrow_hourly_string1_kw || {};
  
  const values: number[] = [];
  const allHours = { ...today, ...tomorrow };
  
  const sortedKeys = Object.keys(allHours).sort();
  for (const key of sortedKeys) {
    values.push(allHours[key] || 0);
  }
  
  return values;
}
