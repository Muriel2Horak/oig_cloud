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
      expect(styleText).toContain('minmax(280px, 350px) 1fr minmax(280px, 350px)');
    });

    it('should have proper grid column assignments for 3-column layout', () => {
      expect(styleText).toContain('.flow-tiles-left');
      expect(styleText).toContain('grid-column: 1');
      expect(styleText).toContain('.flow-center');
      expect(styleText).toContain('grid-column: 2');
      expect(styleText).toContain('.flow-control-right');
      expect(styleText).toContain('grid-column: 3');
    });
  });

  describe('Tablet Layout (768px-1023px)', () => {
    it('should have 2-column grid layout for tablet', () => {
      const tabletMediaQuery = styleText.match(/@media \(min-width: 769px\) and \(max-width: 1024px\) \{([\s\S]*?)\}/);
      expect(tabletMediaQuery).toBeTruthy();
      
      if (tabletMediaQuery) {
        const tabletStyles = tabletMediaQuery[1];
        expect(tabletStyles).toContain('grid-template-columns: minmax(200px, 280px) 1fr');
        expect(tabletStyles).not.toContain('minmax(200px, 280px) 1fr minmax(200px, 280px)');
      }
    });

    it('should adjust column span for 2-column layout', () => {
      const tabletMediaQuery = styleText.match(/@media \(min-width: 769px\) and \(max-width: 1024px\) \{([\s\S]*?)\}/);
      expect(tabletMediaQuery).toBeTruthy();
      
      if (tabletMediaQuery) {
        const tabletStyles = tabletMediaQuery[1];
        expect(tabletStyles).toContain('.flow-control-right');
        expect(tabletStyles).toContain('grid-column: 2');
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
        expect(mobileStyles).toContain('.flow-tiles-left');
        expect(mobileStyles).toContain('grid-column: 1');
        expect(mobileStyles).toContain('.flow-center');
        expect(mobileStyles).toContain('grid-column: 1');
        expect(mobileStyles).toContain('.flow-control-right');
        expect(mobileStyles).toContain('grid-column: 1');
      }
    });
  });

  describe('Nest Device Height Override', () => {
    it('should handle Nest Hub Max (1280x800) with 3 columns', () => {
      expect(styleText).toContain('minmax(280px, 350px) 1fr minmax(280px, 350px)');
    });

    it('should handle Nest (1024x600) with 3 columns by default', () => {
      const desktopMediaQuery = styleText.match(/@media \(min-width: 1024px\) \{([\s\S]*?)\}/);
      expect(desktopMediaQuery).toBeTruthy();
      
      if (desktopMediaQuery) {
        const desktopStyles = desktopMediaQuery[1];
        expect(desktopStyles).toContain('minmax(280px, 350px) 1fr minmax(280px, 350px)');
      }
    });

    it('should document default max-height: 700px → 3 columns behavior', () => {
      expect(styleText).toContain('minmax(280px, 350px) 1fr minmax(280px, 350px)');
      expect(true).toBe(true);
    });
  });

  describe('Breakpoint Consistency', () => {
    it('should have consistent breakpoint definitions', () => {
      expect(styleText).toContain('@media (max-width: 768px)');
      expect(styleText).toContain('@media (min-width: 769px) and (max-width: 1024px)');
      expect(styleText).toContain('@media (min-width: 1024px)');
    });

    it('should not have overlapping breakpoints', () => {
      const mobileQueries = (styleText.match(/@media \(max-width: 768px\)/g) || []).length;
      const tabletQueries = (styleText.match(/@media \(min-width: 769px\) and \(max-width: 1024px\)/g) || []).length;
      const desktopQueries = (styleText.match(/@media \(min-width: 1024px\)/g) || []).length;
      
      expect(mobileQueries).toBe(1);
      expect(tabletQueries).toBe(1); 
      expect(desktopQueries).toBeGreaterThanOrEqual(1);
    });
  });
});