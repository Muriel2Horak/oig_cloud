export const CSS_VARS = {
  bgPrimary: 'var(--primary-background-color, #ffffff)',
  bgSecondary: 'var(--secondary-background-color, #f5f5f5)',
  textPrimary: 'var(--primary-text-color, #212121)',
  textSecondary: 'var(--secondary-text-color, #757575)',
  accent: 'var(--accent-color, #03a9f4)',
  divider: 'var(--divider-color, #e0e0e0)',
  error: 'var(--error-color, #db4437)',
  success: 'var(--success-color, #0f9d58)',
  warning: 'var(--warning-color, #f4b400)',
  
  cardBg: 'var(--card-background-color, #ffffff)',
  cardShadow: 'var(--shadow-elevation-2dp_-_box-shadow, 0 2px 2px 0 rgba(0,0,0,0.14))',
  
  fontFamily: 'var(--primary-font-family, system-ui, sans-serif)',
  
  solar: '#ff9800',
  battery: '#4caf50',
  grid: '#2196f3',
  consumption: '#9c27b0',
};

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
};

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function getCurrentBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
}

export function isMobile(width: number): boolean {
  return width < BREAKPOINTS.mobile;
}

export function isTablet(width: number): boolean {
  return width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
}

export function isDesktop(width: number): boolean {
  return width >= BREAKPOINTS.tablet;
}
