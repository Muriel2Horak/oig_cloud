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

/**
 * Dark mode CSS overrides.
 * These get applied as CSS custom properties on :root when dark mode is active.
 * They override the HA variables that CSS_VARS reference.
 */
export const DARK_THEME: Record<string, string> = {
  '--primary-background-color': '#111936',
  '--secondary-background-color': '#1a2044',
  '--primary-text-color': '#e1e1e1',
  '--secondary-text-color': 'rgba(255,255,255,0.7)',
  '--accent-color': '#03a9f4',
  '--divider-color': 'rgba(255,255,255,0.12)',
  '--error-color': '#ef5350',
  '--success-color': '#66bb6a',
  '--warning-color': '#ffa726',
  '--card-background-color': 'rgba(255,255,255,0.06)',
  '--shadow-elevation-2dp_-_box-shadow': '0 2px 4px 0 rgba(0,0,0,0.4)',
};

export const LIGHT_THEME: Record<string, string> = {
  '--primary-background-color': '#ffffff',
  '--secondary-background-color': '#f5f5f5',
  '--primary-text-color': '#212121',
  '--secondary-text-color': '#757575',
  '--accent-color': '#03a9f4',
  '--divider-color': '#e0e0e0',
  '--error-color': '#db4437',
  '--success-color': '#0f9d58',
  '--warning-color': '#f4b400',
  '--card-background-color': '#ffffff',
  '--shadow-elevation-2dp_-_box-shadow': '0 2px 2px 0 rgba(0,0,0,0.14)',
};

/**
 * Detect dark mode from multiple sources (in priority order):
 * 1. HA hass.themes.darkMode (if available from parent)
 * 2. HA theme name containing 'dark'
 * 3. prefers-color-scheme: dark media query
 */
export function detectDarkMode(): boolean {
  // 1. Try HA hass object
  try {
    if (window.parent && window.parent !== window) {
      const hass = (window.parent as any).document
        ?.querySelector('home-assistant')?.hass;
      if (hass?.themes) {
        if (typeof hass.themes.darkMode === 'boolean') {
          return hass.themes.darkMode;
        }
        // Check theme name
        const themeName = (hass.themes.theme || '').toLowerCase();
        if (themeName.includes('dark')) return true;
        if (themeName.includes('light')) return false;
      }
    }
  } catch {
    // Cross-origin or unavailable — fall through
  }

  // 2. System preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Apply theme CSS variables to the document root.
 * Also adds/removes `dark` class on <html> for CSS selectors.
 */
export function applyTheme(isDark: boolean): void {
  const vars = isDark ? DARK_THEME : LIGHT_THEME;
  const root = document.documentElement;

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }

  root.classList.toggle('dark', isDark);
  // Update body background for the iframe
  document.body.style.background = isDark
    ? DARK_THEME['--secondary-background-color']
    : LIGHT_THEME['--secondary-background-color'];
}

/**
 * Initialize theme detection and set up listeners for changes.
 * Call once at app startup.
 */
export function initTheme(): void {
  const isDark = detectDarkMode();
  applyTheme(isDark);

  // Listen for system preference changes
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    const dark = detectDarkMode();
    applyTheme(dark);
  });

  // Re-check periodically (HA theme can change at runtime)
  setInterval(() => {
    const dark = detectDarkMode();
    const currentlyDark = document.documentElement.classList.contains('dark');
    if (dark !== currentlyDark) {
      applyTheme(dark);
    }
  }, 5000);
}

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
