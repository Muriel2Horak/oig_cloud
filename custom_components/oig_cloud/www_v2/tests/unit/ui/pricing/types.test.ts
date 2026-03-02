import { describe, it, expect } from 'vitest';
import {
  PricePoint,
  PriceBlock,
  PricingStats,
  ChartZoomState,
  DatalabelMode,
  PricingData,
} from '@/ui/features/pricing/types';

describe('Pricing types', () => {
  describe('PricePoint', () => {
    it('should have required properties', () => {
      const point: PricePoint = {
        time: '2024-01-15T14:00:00',
        buy: 1.5,
        sell: 0.8,
      };
      
      expect(point.time).toBeDefined();
      expect(point.buy).toBeDefined();
      expect(point.sell).toBeDefined();
    });
  });

  describe('PriceBlock', () => {
    it('should support block types', () => {
      const cheapBlock: PriceBlock = {
        start: '2024-01-15T02:00:00',
        end: '2024-01-15T05:00:00',
        type: 'cheap',
        avgPrice: 0.5,
      };
      
      const expensiveBlock: PriceBlock = {
        start: '2024-01-15T18:00:00',
        end: '2024-01-15T21:00:00',
        type: 'expensive',
        avgPrice: 2.5,
      };
      
      expect(cheapBlock.type).toBe('cheap');
      expect(expensiveBlock.type).toBe('expensive');
    });
  });

  describe('PricingStats', () => {
    it('should have stats properties', () => {
      const stats: PricingStats = {
        cheapestBuy: { time: '2024-01-15T03:00:00', price: 0.3 },
        bestSell: { time: '2024-01-15T19:00:00', price: 2.1 },
        avgBuy: 1.2,
        avgSell: 0.8,
        totalCost: 150,
      };
      
      expect(stats.cheapestBuy.price).toBe(0.3);
      expect(stats.bestSell.price).toBe(2.1);
      expect(stats.avgBuy).toBe(1.2);
    });
  });

  describe('ChartZoomState', () => {
    it('should have zoom levels', () => {
      const fullZoom: ChartZoomState = { start: null, end: null, level: 'full' };
      const dayZoom: ChartZoomState = { 
        start: new Date('2024-01-15T00:00:00'), 
        end: new Date('2024-01-15T23:59:59'), 
        level: 'day' 
      };
      
      expect(fullZoom.level).toBe('full');
      expect(dayZoom.level).toBe('day');
    });
  });

  describe('DatalabelMode', () => {
    it('should have all modes', () => {
      const modes: DatalabelMode[] = ['auto', 'always', 'never'];
      
      expect(modes).toContain('auto');
      expect(modes).toContain('always');
      expect(modes).toContain('never');
    });
  });

  describe('PricingData', () => {
    it('should combine all data', () => {
      const data: PricingData = {
        prices: [
          { time: '2024-01-15T00:00:00', buy: 1.0, sell: 0.5 },
          { time: '2024-01-15T01:00:00', buy: 0.8, sell: 0.4 },
        ],
        blocks: [
          { start: '2024-01-15T00:00:00', end: '2024-01-15T04:00:00', type: 'cheap', avgPrice: 0.7 },
        ],
        stats: {
          cheapestBuy: { time: '2024-01-15T01:00:00', price: 0.8 },
          bestSell: { time: '2024-01-15T00:00:00', price: 0.5 },
          avgBuy: 0.9,
          avgSell: 0.45,
          totalCost: 50,
        },
      };
      
      expect(data.prices).toHaveLength(2);
      expect(data.blocks).toHaveLength(1);
      expect(data.stats.avgBuy).toBe(0.9);
    });

    it('should support optional arrays', () => {
      const data: PricingData = {
        prices: [],
        blocks: [],
        stats: {
          cheapestBuy: { time: '', price: 0 },
          bestSell: { time: '', price: 0 },
          avgBuy: 0,
          avgSell: 0,
          totalCost: 0,
        },
        solar: [1000, 2000, 3000],
        battery: [-500, 0, 500],
        consumption: [1500, 2000, 1800],
      };
      
      expect(data.solar).toBeDefined();
      expect(data.battery).toBeDefined();
      expect(data.consumption).toBeDefined();
    });
  });
});
