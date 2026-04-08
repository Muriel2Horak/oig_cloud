import { describe, it, expect } from 'vitest';
import {
  BoxMode,
  GridDelivery,
  ShieldQueueItem,
  BatteryChargeParams,
  BOX_MODE_LABELS,
  GRID_DELIVERY_LABELS,
  QUEUE_STATUS_COLORS,
} from '@/ui/features/control-panel/types';

describe('Control Panel types', () => {
  describe('BOX_MODE_LABELS', () => {
    it('should have labels for all modes', () => {
      expect(BOX_MODE_LABELS.home_1).toBe('Home 1');
      expect(BOX_MODE_LABELS.home_2).toBe('Home 2');
      expect(BOX_MODE_LABELS.home_3).toBe('Home 3');
      expect(BOX_MODE_LABELS.home_ups).toBe('Home UPS');
      expect(BOX_MODE_LABELS.home_5).toBe('Home 5');
      expect(BOX_MODE_LABELS.home_6).toBe('Home 6');
    });

    it('should have 6 modes', () => {
      expect(Object.keys(BOX_MODE_LABELS)).toHaveLength(6);
    });
  });

  describe('GRID_DELIVERY_LABELS', () => {
    it('should have labels for all options', () => {
      expect(GRID_DELIVERY_LABELS.off).toBe('Vypnuto');
      expect(GRID_DELIVERY_LABELS.on).toBe('Zapnuto');
      expect(GRID_DELIVERY_LABELS.limited).toBe('S omezením');
    });

    it('should have 3 options', () => {
      expect(Object.keys(GRID_DELIVERY_LABELS)).toHaveLength(3);
    });
  });

  describe('QUEUE_STATUS_COLORS', () => {
    it('should have colors for all statuses', () => {
      expect(QUEUE_STATUS_COLORS.queued).toBeDefined();
      expect(QUEUE_STATUS_COLORS.running).toBeDefined();
    });

    it('should use hex colors', () => {
      Object.values(QUEUE_STATUS_COLORS).forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('ShieldQueueItem', () => {
    it('should have required properties', () => {
      const item: ShieldQueueItem = {
        id: '123',
        type: 'mode_change',
        status: 'queued',
        service: 'set_box_mode',
        targetValue: 'Home 2',
        changes: ['mode'],
        createdAt: '2024-01-15T14:00:00',
        position: 1,
      };

      expect(item.id).toBe('123');
      expect(item.type).toBe('mode_change');
      expect(item.status).toBe('queued');
    });

    it('should support all item types', () => {
      const types: ShieldQueueItem['type'][] = [
        'mode_change',
        'grid_delivery',
        'grid_limit',
        'boiler_mode',
        'battery_formating',
      ];

      expect(types).toHaveLength(5);
    });

    it('should support all statuses', () => {
      const statuses: ShieldQueueItem['status'][] = [
        'queued',
        'running',
      ];

      expect(statuses).toHaveLength(2);
    });
  });

  describe('BatteryChargeParams', () => {
    it('should have required properties', () => {
      const params: BatteryChargeParams = {
        targetSoc: 80,
        estimatedCost: 25.50,
        estimatedTime: 3600,
      };

      expect(params.targetSoc).toBe(80);
      expect(params.estimatedCost).toBe(25.50);
      expect(params.estimatedTime).toBe(3600);
    });
  });
});
