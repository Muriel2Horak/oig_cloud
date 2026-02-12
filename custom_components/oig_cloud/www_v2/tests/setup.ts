import { beforeAll, afterAll, vi } from 'vitest';

beforeAll(() => {
  (global as any).OIG_DEBUG = false;
  
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (global as any).ResizeObserver = ResizeObserverMock;
  
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});
