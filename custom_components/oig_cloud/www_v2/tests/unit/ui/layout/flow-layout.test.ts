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
      expect(styleText).toContain('grid-template-columns: 212px 1fr 300px');
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

  describe('Tablet Layout (≤1023px)', () => {
    // theme.ts: BREAKPOINTS = { mobile: 768, tablet: 1024, desktop: 1280 }
    // → tablet override must cap at 1023px so desktop branch starts at 1024.
    // Several @media (max-width: 1023px) blocks exist (boiler stage also uses
    // this breakpoint); scope the match to the one targeting .flow-layout.
    const findFlowLayoutTablet = () => {
      const re = /@media \(max-width: 1023px\) \{([\s\S]*?)\n\s*\}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(styleText)) !== null) {
        if (m[1].includes('.flow-layout')) return m[1];
      }
      return null;
    };

    it('should keep 3 columns with narrower side panels on tablet', () => {
      const tabletStyles = findFlowLayoutTablet();
      expect(tabletStyles).toBeTruthy();
      expect(tabletStyles!).toContain('grid-template-columns: 168px 1fr 248px');
      expect(tabletStyles!).toContain('gap: 8px');
    });

    it('should not switch away from grid areas on tablet', () => {
      const tabletStyles = findFlowLayoutTablet();
      expect(tabletStyles).toBeTruthy();
      expect(tabletStyles!).not.toContain('grid-template-areas');
    });
  });

  describe('Overlap Fix (≥1024px viewport)', () => {
    // Regression for the 1600px screenshot: flow canvas (solar/house/battery
    // tiles + popovers with z-index up to 6) painted across the column
    // boundary onto the "Systém OIG" control panel. Fix = isolate the center
    // column so its absolutely-positioned children can't escape, and lift the
    // right panel into a higher stacking context so any bleed-through lands
    // underneath it.
    it('flow-center should be a stacking context (position relative + isolation isolate)', () => {
      const centerBlock = styleText.match(/\.flow-center\s*\{([\s\S]*?)\}/);
      expect(centerBlock).toBeTruthy();
      const centerStyles = centerBlock![1];
      expect(centerStyles).toMatch(/position:\s*relative/);
      expect(centerStyles).toMatch(/isolation:\s*isolate/);
    });

    it('flow-control should stack above flow-center (position relative + z-index)', () => {
      const controlBlock = styleText.match(/\.flow-control\s*\{([\s\S]*?)\}/);
      expect(controlBlock).toBeTruthy();
      const controlStyles = controlBlock![1];
      expect(controlStyles).toMatch(/position:\s*relative/);
      // z-index must be a positive integer (above the isolated center's auto layer).
      const zMatch = controlStyles.match(/z-index:\s*(\d+)/);
      expect(zMatch).toBeTruthy();
      expect(Number(zMatch![1])).toBeGreaterThanOrEqual(1);
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
      expect(styleText).toContain('grid-template-columns: 212px 1fr 300px');
    });

    it('should not require a dedicated desktop media query', () => {
      expect(styleText).not.toContain('@media (min-width: 1024px)');
    });
  });

  describe('Breakpoint Consistency', () => {
    it('should have consistent breakpoint definitions', () => {
      expect(styleText).toContain('@media (max-width: 768px)');
      expect(styleText).toContain('@media (max-width: 1023px)');
    });

    it('should not have overlapping breakpoints', () => {
      // The old tablet override at max-width:1200px was misaligned with V2
      // theme.ts (768/1024/1280). After the fix the tablet override lives at
      // 1023px, and the legacy 1200 breakpoint is gone.
      expect(styleText).not.toContain('@media (max-width: 1200px)');
      expect(styleText).toContain('@media (max-width: 1023px)');
    });
  });
});
