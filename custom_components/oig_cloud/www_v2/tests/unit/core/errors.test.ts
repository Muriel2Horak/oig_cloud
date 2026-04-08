import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setupErrorHandling,
  teardownErrorHandling,
  getErrorHistory,
  clearErrorHistory,
  AppError,
  ApiError,
  AuthError,
  NetworkError,
  isRecoverable,
  formatError,
} from '@/core/errors';
import { oigLog } from '@/core/logger';

describe('errors', () => {
  let windowErrorListeners: Array<(event: ErrorEvent) => void>;
  let rejectionListeners: Array<(event: PromiseRejectionEvent) => void>;
  let errorLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearErrorHistory();
    teardownErrorHandling();
    windowErrorListeners = [];
    rejectionListeners = [];
    errorLogSpy = vi.spyOn(oigLog, 'error').mockImplementation(() => {});

    vi.spyOn(window, 'addEventListener').mockImplementation(((type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'error') {
        windowErrorListeners.push(listener as (event: ErrorEvent) => void);
      }
      if (type === 'unhandledrejection') {
        rejectionListeners.push(listener as (event: PromiseRejectionEvent) => void);
      }
    }) as typeof window.addEventListener);

    vi.spyOn(window, 'removeEventListener').mockImplementation(((type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'error') {
        windowErrorListeners = windowErrorListeners.filter((fn) => fn !== listener);
      }
      if (type === 'unhandledrejection') {
        rejectionListeners = rejectionListeners.filter((fn) => fn !== listener);
      }
    }) as typeof window.removeEventListener);
  });

  afterEach(() => {
    teardownErrorHandling();
    vi.restoreAllMocks();
  });

  describe('setupErrorHandling', () => {
    it('should capture global errors', () => {
      setupErrorHandling();

      expect(windowErrorListeners).toHaveLength(1);

      const preventDefault = vi.fn();
      windowErrorListeners[0]({
        error: new Error('Test error'),
        message: 'Test error',
        filename: '',
        lineno: 0,
        colno: 0,
        preventDefault,
      } as unknown as ErrorEvent);

      const history = getErrorHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(errorLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should capture unhandled rejections', async () => {
      if (typeof PromiseRejectionEvent === 'undefined') {
        return;
      }

      setupErrorHandling();

      expect(rejectionListeners).toHaveLength(1);

      const preventDefault = vi.fn();
      rejectionListeners[0]({
        reason: new Error('Promise error'),
        preventDefault,
      } as unknown as PromiseRejectionEvent);

      const history = getErrorHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(errorLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('error classes', () => {
    it('AppError should have code and recoverable', () => {
      const error = new AppError('Test', 'TEST_CODE', true);
      expect(error.code).toBe('TEST_CODE');
      expect(error.recoverable).toBe(true);
    });

    it('ApiError should extract status code', () => {
      const error = new ApiError('Not found', 404, 'Not Found');
      expect(error.status).toBe(404);
      expect(error.code).toBe('API_404');
      expect(error.recoverable).toBe(true);
    });

    it('ApiError 5xx should not be recoverable', () => {
      const error = new ApiError('Server error', 500, 'Internal Server Error');
      expect(error.recoverable).toBe(false);
    });

    it('AuthError should not be recoverable', () => {
      const error = new AuthError('Invalid token');
      expect(error.recoverable).toBe(false);
      expect(error.code).toBe('AUTH_ERROR');
    });

    it('NetworkError should be recoverable', () => {
      const error = new NetworkError('Connection failed');
      expect(error.recoverable).toBe(true);
      expect(error.code).toBe('NETWORK_ERROR');
    });
  });

  describe('isRecoverable', () => {
    it('should return true for recoverable AppError', () => {
      expect(isRecoverable(new NetworkError('Test'))).toBe(true);
    });

    it('should return false for non-recoverable AppError', () => {
      expect(isRecoverable(new AuthError('Test'))).toBe(false);
    });

    it('should return false for regular Error', () => {
      expect(isRecoverable(new Error('Test'))).toBe(false);
    });
  });

  describe('formatError', () => {
    it('should format ApiError', () => {
      const error = new ApiError('Not found', 404, 'Not Found');
      expect(formatError(error)).toBe('API Error (404): Not found');
    });

    it('should format AuthError', () => {
      const error = new AuthError('Invalid token');
      expect(formatError(error)).toBe('Auth Error: Invalid token');
    });

    it('should format NetworkError', () => {
      const error = new NetworkError('Connection failed');
      expect(formatError(error)).toBe('Network Error: Connection failed');
    });

    it('should format regular Error', () => {
      const error = new Error('Something went wrong');
      expect(formatError(error)).toBe('Something went wrong');
    });
  });

  describe('error history', () => {
    it('should limit history to MAX_ERRORS', () => {
      setupErrorHandling();

      for (let i = 0; i < 55; i++) {
        windowErrorListeners[0]({
          error: new Error(`Error ${i}`),
          message: `Error ${i}`,
          filename: '',
          lineno: 0,
          colno: 0,
          preventDefault: vi.fn(),
        } as unknown as ErrorEvent);
      }

      const history = getErrorHistory();
      expect(history.length).toBeLessThanOrEqual(50);
      expect(errorLogSpy).toHaveBeenCalledTimes(55);
    });

    it('clearErrorHistory should clear all errors', () => {
      setupErrorHandling();
      windowErrorListeners[0]({
        error: new Error('Test'),
        message: 'Test',
        filename: '',
        lineno: 0,
        colno: 0,
        preventDefault: vi.fn(),
      } as unknown as ErrorEvent);
      
      expect(getErrorHistory().length).toBeGreaterThan(0);
      
      clearErrorHistory();
      
      expect(getErrorHistory().length).toBe(0);
    });
  });
});
