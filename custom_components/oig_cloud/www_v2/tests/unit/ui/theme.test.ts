import { describe, it, expect } from 'vitest';
import { CSS_VARS, BREAKPOINTS, getCurrentBreakpoint, isMobile, isTablet, isDesktop } from '@/ui/theme';

describe('theme', () => {
  describe('CSS_VARS', () => {
    it('should have all required CSS variables', () => {
      expect(CSS_VARS.bgPrimary).toBeDefined();
      expect(CSS_VARS.bgSecondary).toBeDefined();
      expect(CSS_VARS.textPrimary).toBeDefined();
      expect(CSS_VARS.textSecondary).toBeDefined();
      expect(CSS_VARS.accent).toBeDefined();
      expect(CSS_VARS.divider).toBeDefined();
    });

    it('should have fallback values', () => {
      expect(CSS_VARS.bgPrimary).toContain('#');
      expect(CSS_VARS.textPrimary).toContain('#');
    });

    it('should have energy colors', () => {
      expect(CSS_VARS.solar).toBeDefined();
      expect(CSS_VARS.battery).toBeDefined();
      expect(CSS_VARS.grid).toBeDefined();
      expect(CSS_VARS.consumption).toBeDefined();
    });
  });

  describe('BREAKPOINTS', () => {
    it('should have mobile breakpoint', () => {
      expect(BREAKPOINTS.mobile).toBe(768);
    });

    it('should have tablet breakpoint', () => {
      expect(BREAKPOINTS.tablet).toBe(1024);
    });

    it('should have desktop breakpoint', () => {
      expect(BREAKPOINTS.desktop).toBe(1280);
    });

    it('should have ascending order', () => {
      expect(BREAKPOINTS.mobile).toBeLessThan(BREAKPOINTS.tablet);
      expect(BREAKPOINTS.tablet).toBeLessThan(BREAKPOINTS.desktop);
    });
  });

  describe('getCurrentBreakpoint', () => {
    it('should return mobile for small width', () => {
      expect(getCurrentBreakpoint(320)).toBe('mobile');
      expect(getCurrentBreakpoint(767)).toBe('mobile');
    });

    it('should return tablet for medium width', () => {
      expect(getCurrentBreakpoint(768)).toBe('tablet');
      expect(getCurrentBreakpoint(1023)).toBe('tablet');
    });

    it('should return desktop for large width', () => {
      expect(getCurrentBreakpoint(1024)).toBe('desktop');
      expect(getCurrentBreakpoint(1920)).toBe('desktop');
    });
  });

  describe('isMobile', () => {
    it('should return true for mobile width', () => {
      expect(isMobile(320)).toBe(true);
      expect(isMobile(767)).toBe(true);
    });

    it('should return false for tablet/desktop width', () => {
      expect(isMobile(768)).toBe(false);
      expect(isMobile(1024)).toBe(false);
    });
  });

  describe('isTablet', () => {
    it('should return true for tablet width', () => {
      expect(isTablet(768)).toBe(true);
      expect(isTablet(1023)).toBe(true);
    });

    it('should return false for mobile/desktop width', () => {
      expect(isTablet(767)).toBe(false);
      expect(isTablet(1024)).toBe(false);
    });
  });

  describe('isDesktop', () => {
    it('should return true for desktop width', () => {
      expect(isDesktop(1024)).toBe(true);
      expect(isDesktop(1920)).toBe(true);
    });

    it('should return false for mobile/tablet width', () => {
      expect(isDesktop(767)).toBe(false);
      expect(isDesktop(1023)).toBe(false);
    });
  });
});
