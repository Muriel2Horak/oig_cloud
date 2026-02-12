type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogData {
  [key: string]: any;
}

const LOG_PREFIX = '[V2]';

function getTimestamp(): string {
  return new Date().toISOString().substr(11, 12);
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = getTimestamp();
  const levelStr = level.toUpperCase().padEnd(5);
  return `${timestamp} ${levelStr} ${message}`;
}

export const oigLog = {
  debug(message: string, data?: LogData): void {
    if (typeof window !== 'undefined' && (window as any).OIG_DEBUG) {
      console.debug(LOG_PREFIX, formatMessage('debug', message), data ?? '');
    }
  },

  info(message: string, data?: LogData): void {
    console.info(LOG_PREFIX, formatMessage('info', message), data ?? '');
  },

  warn(message: string, data?: LogData): void {
    console.warn(LOG_PREFIX, formatMessage('warn', message), data ?? '');
  },

  error(message: string, error?: Error, data?: LogData): void {
    const errorData = error ? { 
      error: error.message, 
      stack: error.stack,
      ...data 
    } : data;
    console.error(LOG_PREFIX, formatMessage('error', message), errorData ?? '');
  },

  time(label: string): void {
    console.time(`${LOG_PREFIX} ${label}`);
  },

  timeEnd(label: string): void {
    console.timeEnd(`${LOG_PREFIX} ${label}`);
  },

  group(label: string): void {
    console.group(`${LOG_PREFIX} ${label}`);
  },

  groupEnd(): void {
    console.groupEnd();
  }
};

export function enableDebug(): void {
  (window as any).OIG_DEBUG = true;
  oigLog.info('Debug mode enabled');
}

export function disableDebug(): void {
  (window as any).OIG_DEBUG = false;
  oigLog.info('Debug mode disabled');
}

export function isDebugEnabled(): boolean {
  return !!(window as any).OIG_DEBUG;
}
