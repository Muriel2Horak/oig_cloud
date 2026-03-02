import { describe, it, expect } from 'vitest';
import { TileConfig, TileData, DEFAULT_TILES } from '@/ui/features/tiles/types';

describe('Tiles types', () => {
  describe('DEFAULT_TILES', () => {
    it('should have 4 default tiles', () => {
      expect(DEFAULT_TILES).toHaveLength(4);
    });

    it('should have required properties', () => {
      DEFAULT_TILES.forEach(tile => {
        expect(tile).toHaveProperty('id');
        expect(tile).toHaveProperty('entityId');
        expect(tile).toHaveProperty('label');
        expect(tile).toHaveProperty('icon');
        expect(tile).toHaveProperty('position');
        expect(tile).toHaveProperty('order');
      });
    });

    it('should have left and right positions', () => {
      const leftTiles = DEFAULT_TILES.filter(t => t.position === 'left');
      const rightTiles = DEFAULT_TILES.filter(t => t.position === 'right');
      
      expect(leftTiles.length).toBeGreaterThan(0);
      expect(rightTiles.length).toBeGreaterThan(0);
    });
  });
});
