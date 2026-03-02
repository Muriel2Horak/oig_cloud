import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('errors', () => {
  beforeEach(() => {
    clearErrorHistory();
    teardownErrorHandling();
  });

  describe('setupErrorHandling', () => {
    it('should capture global errors', () => {
      setupErrorHandling();
      
      window.dispatchEvent(new ErrorEvent('error', {
        error: new Error('Test error'),
        message: 'Test error',
      }));

      const history = getErrorHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should capture unhandled rejections', async () => {
      if (typeof PromiseRejectionEvent === 'undefined') {
        return;
      }
      
      setupErrorHandling();
      
      window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {
        reason: new Error('Promise error'),
      }));

      const history = getErrorHistory();
      expect(history.length).toBeGreaterThan(0);
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
      for (let i = 0; i < 55; i++) {
        window.dispatchEvent(new ErrorEvent('error', {
          error: new Error(`Error ${i}`),
          message: `Error ${i}`,
        }));
      }

      const history = getErrorHistory();
      expect(history.length).toBeLessThanOrEqual(50);
    });

    it('clearErrorHistory should clear all errors', () => {
      setupErrorHandling();
      window.dispatchEvent(new ErrorEvent('error', {
        error: new Error('Test'),
        message: 'Test',
      }));
      
      expect(getErrorHistory().length).toBeGreaterThan(0);
      
      clearErrorHistory();
      
      expect(getErrorHistory().length).toBe(0);
    });
  });
});
