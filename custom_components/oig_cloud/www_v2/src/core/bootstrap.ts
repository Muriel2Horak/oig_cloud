import { setupErrorHandling } from './errors';
import { oigLog } from './logger';

interface BootstrapConfig {
  version: string;
  storagePrefix: string;
}

const STORAGE_PREFIX = 'oig_v2_';

/** Detect Home Assistant companion app (iOS/Android) */
function detectHaApp(): boolean {
  try {
    const ua = globalThis.navigator?.userAgent || '';
    return /Home Assistant|HomeAssistant|HAcompanion/i.test(ua);
  } catch {
    return false;
  }
}

/** Detect mobile device */
function detectMobile(): boolean {
  try {
    const ua = globalThis.navigator?.userAgent || '';
    const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const smallViewport = globalThis.innerWidth <= 768;
    return mobileUA || smallViewport;
  } catch {
    return false;
  }
}

/** Runtime flags (available globally) */
export const OIG_RUNTIME = {
  isHaApp: false,
  isMobile: false,
  reduceMotion: false,
};

export async function bootstrap(): Promise<HTMLElement> {
  oigLog.info('Bootstrap starting');

  setupErrorHandling();

  // Detect runtime environment
  OIG_RUNTIME.isHaApp = detectHaApp();
  OIG_RUNTIME.isMobile = detectMobile();
  OIG_RUNTIME.reduceMotion = OIG_RUNTIME.isHaApp || OIG_RUNTIME.isMobile ||
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;

  // Apply CSS classes for runtime-conditional styling
  const root = document.documentElement;
  if (OIG_RUNTIME.isHaApp) root.classList.add('oig-ha-app');
  if (OIG_RUNTIME.isMobile) root.classList.add('oig-mobile');
  if (OIG_RUNTIME.reduceMotion) root.classList.add('oig-reduce-motion');

  const config: BootstrapConfig = {
    version: import.meta.env.VITE_VERSION || '2.0.0',
    storagePrefix: STORAGE_PREFIX,
  };

  oigLog.info('Bootstrap complete', {
    ...config,
    isHaApp: OIG_RUNTIME.isHaApp,
    isMobile: OIG_RUNTIME.isMobile,
    reduceMotion: OIG_RUNTIME.reduceMotion,
  });

  return document.createElement('oig-app');
}
