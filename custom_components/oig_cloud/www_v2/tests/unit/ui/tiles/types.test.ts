import { describe, it, expect } from 'vitest';
import { DEFAULT_TILES_CONFIG, TileConfig } from '@/ui/features/tiles/types';

describe('Tiles types', () => {
  describe('DEFAULT_TILES_CONFIG', () => {
    it('should default to 4 visible tile slots per side', () => {
      expect(DEFAULT_TILES_CONFIG.left_count).toBe(4);
      expect(DEFAULT_TILES_CONFIG.right_count).toBe(4);
    });

    it('should allocate six tile placeholders per side', () => {
      expect(DEFAULT_TILES_CONFIG.tiles_left).toHaveLength(6);
      expect(DEFAULT_TILES_CONFIG.tiles_right).toHaveLength(6);
      expect(DEFAULT_TILES_CONFIG.tiles_left.every(tile => tile === null)).toBe(true);
      expect(DEFAULT_TILES_CONFIG.tiles_right.every(tile => tile === null)).toBe(true);
    });

    it('should expose config metadata', () => {
      expect(DEFAULT_TILES_CONFIG.visible).toBe(true);
      expect(DEFAULT_TILES_CONFIG.version).toBe(1);
    });
  });

  describe('TileConfig', () => {
    it('should support entity tiles with support entities', () => {
      const tile: TileConfig = {
        type: 'entity',
        entity_id: 'sensor.test_power',
        label: 'Test',
        icon: 'mdi:flash',
        support_entities: {
          top_right: 'sensor.test_top',
          bottom_right: 'sensor.test_bottom',
        },
      };

      expect(tile.entity_id).toBe('sensor.test_power');
      expect(tile.support_entities?.top_right).toBe('sensor.test_top');
    });
  });
});
