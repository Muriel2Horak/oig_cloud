import { beforeAll, afterAll, vi, expect } from 'vitest';

beforeAll(async () => {
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

  class MockShadowRoot {
    innerHTML = '';
    querySelector(selector: string) { return null; }
    querySelectorAll(selector: string) { return []; }
    getElementById(id: string) { return null; }
  }

  const OriginalHTMLElement = window.HTMLElement;
  
  class MockLitElement extends OriginalHTMLElement {
    static styles: any;
    static properties: any;
    
    shadowRoot = new MockShadowRoot() as any;
    
    connectedCallback() {}
    disconnectedCallback() {}
    requestUpdate() {}
    update() {}
    render() { return ''; }
  }

  (window as any).LitElement = MockLitElement;

  const { LitElement, html, css, unsafeCSS } = await import('lit');
  const { customElement, property, state } = await import('lit/decorators.js');
  
  (window as any).lit = { LitElement, html, css, unsafeCSS };
  (window as any).litDecorators = { customElement, property, state };
});

afterAll(() => {
  vi.restoreAllMocks();
});

expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be one of ${expected.join(', ')}`,
    };
  },
});
