import { describe, it, expect } from 'vitest';
import { DARK_THEME, LIGHT_THEME, applyTheme } from '@/ui/theme';
import { OigSettings } from '@/ui/features/settings';

describe('U4 — dropdown readability', () => {
  it('each theme declares an explicit color-scheme', () => {
    expect(DARK_THEME['color-scheme']).toBe('dark');
    expect(LIGHT_THEME['color-scheme']).toBe('light');
  });

  it('applyTheme exports color-scheme to the document root', () => {
    applyTheme(true);
    expect(document.documentElement.style.getPropertyValue('color-scheme')).toBe('dark');
    applyTheme(false);
    expect(document.documentElement.style.getPropertyValue('color-scheme')).toBe('light');
  });

  it('settings CSS gives select options a solid themed background', () => {
    const css = (OigSettings as any).styles.cssText as string;
    expect(css).toMatch(/select option\s*{/);
    expect(css).toMatch(/select option[^}]*background/);
  });
});
