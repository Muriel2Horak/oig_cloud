import { describe, it, expect } from 'vitest';
import {
  TimelineTab,
  TIMELINE_TAB_LABELS,
  TIMELINE_MODE_CONFIG,
} from '@/ui/features/timeline/types';

describe('Timeline types', () => {
  describe('TIMELINE_TAB_LABELS', () => {
    it('should have labels for all tabs', () => {
      expect(TIMELINE_TAB_LABELS.yesterday).toBe('📊 Včera');
      expect(TIMELINE_TAB_LABELS.today).toBe('📆 Dnes');
      expect(TIMELINE_TAB_LABELS.tomorrow).toBe('📅 Zítra');
      expect(TIMELINE_TAB_LABELS.history).toBe('📈 Historie');
      expect(TIMELINE_TAB_LABELS.detail).toBe('💎 Detail');
    });

    it('should have 5 tabs', () => {
      expect(Object.keys(TIMELINE_TAB_LABELS)).toHaveLength(5);
    });
  });

  describe('TIMELINE_MODE_CONFIG', () => {
    it('should have colors for common modes', () => {
      expect(TIMELINE_MODE_CONFIG['HOME I']).toBeDefined();
      expect(TIMELINE_MODE_CONFIG['HOME II']).toBeDefined();
      expect(TIMELINE_MODE_CONFIG['DO NOTHING']).toBeDefined();
    });

    it('should use hex colors', () => {
      (Object.values(TIMELINE_MODE_CONFIG) as Array<{ color: string }>).forEach((config) => {
        expect(config.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });
});
