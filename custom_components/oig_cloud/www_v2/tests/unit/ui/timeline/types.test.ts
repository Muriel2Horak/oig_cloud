import { describe, it, expect } from 'vitest';
import {
  TimelineTab,
  TimelineData,
  TIMELINE_TAB_LABELS,
  MODE_COLORS,
} from '@/ui/features/timeline/types';

describe('Timeline types', () => {
  describe('TIMELINE_TAB_LABELS', () => {
    it('should have labels for all tabs', () => {
      expect(TIMELINE_TAB_LABELS.yesterday).toBe('Včera');
      expect(TIMELINE_TAB_LABELS.today).toBe('Dnes');
      expect(TIMELINE_TAB_LABELS.tomorrow).toBe('Zítra');
      expect(TIMELINE_TAB_LABELS.history).toBe('Historie');
      expect(TIMELINE_TAB_LABELS.comparison).toBe('Srovnání');
    });

    it('should have 5 tabs', () => {
      expect(Object.keys(TIMELINE_TAB_LABELS)).toHaveLength(5);
    });
  });

  describe('MODE_COLORS', () => {
    it('should have colors for common modes', () => {
      expect(MODE_COLORS.home_1).toBeDefined();
      expect(MODE_COLORS.home_2).toBeDefined();
      expect(MODE_COLORS.feed_in).toBeDefined();
    });

    it('should use hex colors', () => {
      Object.values(MODE_COLORS).forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });
});
