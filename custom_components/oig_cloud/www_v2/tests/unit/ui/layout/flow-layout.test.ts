import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const getAppStyles = () => {
  const appPath = join(__dirname, '../../../../src/ui/app.ts');
  const appContent = readFileSync(appPath, 'utf-8');
  
  const stylesMatch = appContent.match(/static styles = css`([\s\S]*?)`;/);
  if (!stylesMatch) {
    throw new Error('Could not extract styles from app.ts');
  }
  
  return stylesMatch[1];
};

describe('FlowLayout', () => {
  let styleText: string;

  beforeEach(() => {
    styleText = getAppStyles();
  });

  describe('Desktop Layout (≥1024px)', () => {
    it('should have 3-column grid layout for desktop', () => {
      expect(styleText).toContain('grid-template-columns: 200px 1fr 300px');
      expect(styleText).toContain("grid-template-areas: 'tiles canvas control'");
    });

    it('should have proper grid column assignments for 3-column layout', () => {
      expect(styleText).toContain('.flow-tiles-stack');
      expect(styleText).toContain('grid-area: tiles');
      expect(styleText).toContain('.flow-center');
      expect(styleText).toContain('grid-area: canvas');
      expect(styleText).toContain('.flow-control');
      expect(styleText).toContain('grid-area: control');
    });
  });

  describe('Tablet Layout (≤1200px)', () => {
    it('should keep 3 columns with narrower side panels on tablet', () => {
      const tabletMediaQuery = styleText.match(/@media \(max-width: 1200px\) \{([\s\S]*?)\}/);
      expect(tabletMediaQuery).toBeTruthy();
      
      if (tabletMediaQuery) {
        const tabletStyles = tabletMediaQuery[1];
        expect(tabletStyles).toContain('grid-template-columns: 160px 1fr 260px');
        expect(tabletStyles).toContain('gap: 8px');
      }
    });

    it('should not switch away from grid areas on tablet', () => {
      const tabletMediaQuery = styleText.match(/@media \(max-width: 1200px\) \{([\s\S]*?)\}/);
      expect(tabletMediaQuery).toBeTruthy();
      
      if (tabletMediaQuery) {
        const tabletStyles = tabletMediaQuery[1];
        expect(tabletStyles).not.toContain('grid-template-areas');
      }
    });
  });

  describe('Mobile Layout (<768px)', () => {
    it('should have 1-column grid layout for mobile', () => {
      const mobileMediaQuery = styleText.match(/@media \(max-width: 768px\) \{([\s\S]*?)\}/);
      expect(mobileMediaQuery).toBeTruthy();
      
      if (mobileMediaQuery) {
        const mobileStyles = mobileMediaQuery[1];
        expect(mobileStyles).toContain('grid-template-columns: 1fr');
      }
    });

    it('should stack all elements in single column for mobile', () => {
      const mobileMediaQuery = styleText.match(/@media \(max-width: 768px\) \{([\s\S]*?)\}/);
      expect(mobileMediaQuery).toBeTruthy();
      
      if (mobileMediaQuery) {
        const mobileStyles = mobileMediaQuery[1];
        expect(mobileStyles).toContain("'canvas'");
        expect(mobileStyles).toContain("'control'");
        expect(mobileStyles).toContain("'tiles'");
      }
    });
  });

  describe('Desktop Defaults', () => {
    it('should use desktop columns by default', () => {
      expect(styleText).toContain('grid-template-columns: 200px 1fr 300px');
    });

    it('should not require a dedicated desktop media query', () => {
      expect(styleText).not.toContain('@media (min-width: 1024px)');
    });
  });

  describe('Breakpoint Consistency', () => {
    it('should have consistent breakpoint definitions', () => {
      expect(styleText).toContain('@media (max-width: 768px)');
      expect(styleText).toContain('@media (max-width: 1200px)');
    });

    it('should not have overlapping breakpoints', () => {
      const mobileQueries = (styleText.match(/@media \(max-width: 768px\)/g) || []).length;
      const tabletQueries = (styleText.match(/@media \(max-width: 1200px\)/g) || []).length;
      
      expect(mobileQueries).toBe(1);
      expect(tabletQueries).toBe(1); 
    });
  });
});
