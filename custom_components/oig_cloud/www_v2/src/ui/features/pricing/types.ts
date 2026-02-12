export interface PricePoint {
  time: string;
  buy: number;
  sell: number;
}

export interface PriceBlock {
  start: string;
  end: string;
  type: 'cheap' | 'expensive' | 'optimal';
  avgPrice: number;
}

export interface PricingStats {
  cheapestBuy: { time: string; price: number };
  bestSell: { time: string; price: number };
  avgBuy: number;
  avgSell: number;
  totalCost: number;
}

export interface ChartZoomState {
  start: Date | null;
  end: Date | null;
  level: 'full' | 'day' | 'hour';
}

export type DatalabelMode = 'auto' | 'always' | 'never';

export interface PricingData {
  prices: PricePoint[];
  blocks: PriceBlock[];
  stats: PricingStats;
  solar?: number[];
  battery?: number[];
  consumption?: number[];
}
