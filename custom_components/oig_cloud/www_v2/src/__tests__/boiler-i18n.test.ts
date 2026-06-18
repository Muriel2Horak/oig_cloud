import { describe, it, expect } from 'vitest';
import { resolveLang, t } from '@/i18n/boiler';

describe('boiler i18n', () => {
  it('resolves cs by default', () => {
    expect(resolveLang(undefined as any)).toBe('cs');
    expect(resolveLang({ locale: { language: 'cs' } } as any)).toBe('cs');
  });
  it('resolves en when hass language starts with en', () => {
    expect(resolveLang({ language: 'en' } as any)).toBe('en');
    expect(resolveLang({ locale: { language: 'en-US' } } as any)).toBe('en');
  });
  it('returns cs string for known key', () => {
    expect(t('boiler.status.heating', 'cs')).toBe('Ohřev');
  });
  it('returns en string for known key', () => {
    expect(t('boiler.status.heating', 'en')).toBe('Heating');
  });
  it('returns key when missing', () => {
    expect(t('boiler.unknown.key' as any, 'cs')).toBe('boiler.unknown.key');
  });
  it('translates known reason codes', () => {
    expect(t('boiler.reason.comfort_satisfied', 'cs')).toContain('Komfort splněn');
    expect(t('boiler.reason.comfort_satisfied', 'en')).toContain('Comfort satisfied');
  });
});
