import { oigLog } from './logger';

interface ErrorInfo {
  error: Error;
  component?: string;
  timestamp: number;
  recovered: boolean;
}

const errorHistory: ErrorInfo[] = [];
const MAX_ERRORS = 50;

export function setupErrorHandling(): void {
  window.addEventListener('error', handleGlobalError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  oigLog.debug('Error handling setup complete');
}

export function teardownErrorHandling(): void {
  window.removeEventListener('error', handleGlobalError);
  window.removeEventListener('unhandledrejection', handleUnhandledRejection);
}

function handleGlobalError(event: ErrorEvent): void {
  const error = event.error || new Error(event.message);
  recordError(error, 'global');
  
  oigLog.error('Uncaught error', error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
  
  event.preventDefault();
}

function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  const error = event.reason instanceof Error 
    ? event.reason 
    : new Error(String(event.reason));
  
  recordError(error, 'promise');
  oigLog.error('Unhandled promise rejection', error);
  event.preventDefault();
}

function recordError(error: Error, component: string): void {
  errorHistory.push({
    error,
    component,
    timestamp: Date.now(),
    recovered: false
  });
  
  while (errorHistory.length > MAX_ERRORS) {
    errorHistory.shift();
  }
}

export function getErrorHistory(): readonly ErrorInfo[] {
  return errorHistory;
}

export function clearErrorHistory(): void {
  errorHistory.length = 0;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ApiError extends AppError {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    cause?: Error
  ) {
    super(message, `API_${status}`, status < 500, cause);
    this.name = 'ApiError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', false);
    this.name = 'AuthError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network error', cause?: Error) {
    super(message, 'NETWORK_ERROR', true, cause);
    this.name = 'NetworkError';
  }
}

export function isRecoverable(error: Error): boolean {
  if (error instanceof AppError) {
    return error.recoverable;
  }
  return false;
}

export function formatError(error: Error): string {
  if (error instanceof ApiError) {
    return `API Error (${error.status}): ${error.message}`;
  }
  if (error instanceof AuthError) {
    return `Auth Error: ${error.message}`;
  }
  if (error instanceof NetworkError) {
    return `Network Error: ${error.message}`;
  }
  return error.message || 'Unknown error';
}
