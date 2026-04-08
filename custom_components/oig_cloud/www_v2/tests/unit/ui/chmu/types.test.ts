import { describe, it, expect } from 'vitest';
import { ChmuWarningDetail, SEVERITY_COLORS, SEVERITY_LABELS } from '@/ui/features/chmu/types';

describe('CHMU types', () => {
  describe('SEVERITY_COLORS', () => {
    it('should have colors for all levels', () => {
      expect(SEVERITY_COLORS[0]).toBeDefined();
      expect(SEVERITY_COLORS[1]).toBeDefined();
      expect(SEVERITY_COLORS[2]).toBeDefined();
      expect(SEVERITY_COLORS[3]).toBeDefined();
      expect(SEVERITY_COLORS[4]).toBeDefined();
    });

    it('should use hex colors', () => {
      Object.values(SEVERITY_COLORS).forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('SEVERITY_LABELS', () => {
    it('should have Czech labels', () => {
      expect(SEVERITY_LABELS[0]).toBe('Bez výstrahy');
      expect(SEVERITY_LABELS[1]).toBe('Nízká');
      expect(SEVERITY_LABELS[2]).toBe('Zvýšená');
      expect(SEVERITY_LABELS[3]).toBe('Vysoká');
      expect(SEVERITY_LABELS[4]).toBe('Extrémní');
    });
  });

  describe('ChmuWarningDetail', () => {
    it('should have required properties', () => {
      const warning: ChmuWarningDetail = {
        event_type: 'Vítr',
        severity: 3,
        description: 'Silný vítr',
        instruction: 'Nevycházet',
        onset: '2024-01-15T12:00:00',
        expires: '2024-01-15T18:00:00',
        eta_hours: 2,
      };

      expect(warning.event_type).toBe('Vítr');
      expect(warning.severity).toBe(3);
      expect(warning.eta_hours).toBe(2);
    });
  });
});
