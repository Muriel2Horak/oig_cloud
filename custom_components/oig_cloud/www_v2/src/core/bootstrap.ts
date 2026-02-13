import { setupErrorHandling } from './errors';
import { oigLog } from './logger';

interface BootstrapConfig {
  version: string;
  storagePrefix: string;
}

const STORAGE_PREFIX = 'oig_v2_';

export async function bootstrap(): Promise<HTMLElement> {
  oigLog.info('Bootstrap starting');

  setupErrorHandling();

  const config: BootstrapConfig = {
    version: import.meta.env.VITE_VERSION || '2.0.0',
    storagePrefix: STORAGE_PREFIX,
  };

  oigLog.info('Bootstrap complete', config);

  return document.createElement('oig-app');
}
