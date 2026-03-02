import { describe, it, expect } from 'vitest';
import { ChmuWarning, LEVEL_COLORS, LEVEL_LABELS } from '@/ui/features/chmu/types';

describe('CHMU types', () => {
  describe('LEVEL_COLORS', () => {
    it('should have colors for all levels', () => {
      expect(LEVEL_COLORS.low).toBeDefined();
      expect(LEVEL_COLORS.medium).toBeDefined();
      expect(LEVEL_COLORS.high).toBeDefined();
      expect(LEVEL_COLORS.extreme).toBeDefined();
    });

    it('should use hex colors', () => {
      Object.values(LEVEL_COLORS).forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('LEVEL_LABELS', () => {
    it('should have Czech labels', () => {
      expect(LEVEL_LABELS.low).toBe('Nízká');
      expect(LEVEL_LABELS.medium).toBe('Střední');
      expect(LEVEL_LABELS.high).toBe('Vysoká');
      expect(LEVEL_LABELS.extreme).toBe('Extrémní');
    });
  });

  describe('ChmuWarning', () => {
    it('should have required properties', () => {
      const warning: ChmuWarning = {
        id: '1',
        type: 'wind',
        level: 'high',
        title: 'Vítr',
        description: 'Silný vítr',
        start: '2024-01-15T12:00:00',
        end: '2024-01-15T18:00:00',
        regions: ['Praha', 'Středočeský'],
      };

      expect(warning.id).toBe('1');
      expect(warning.level).toBe('high');
      expect(warning.regions).toHaveLength(2);
    });
  });
});
