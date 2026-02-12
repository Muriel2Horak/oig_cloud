import { describe, it, expect, vi } from 'vitest';

const createMockElement = (tagName: string, props: Record<string, any> = {}) => {
  const shadowRoot = {
    innerHTML: '',
    elements: [] as Element[],
    querySelector: vi.fn((sel: string) => null),
    querySelectorAll: vi.fn((sel: string) => []),
  };
  
  const element = {
    tagName: tagName.toUpperCase(),
    shadowRoot,
    ...props,
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    click: vi.fn(function(this: any) {
      this.dispatchEvent({ type: 'click' });
    }),
    getAttribute: vi.fn((name: string) => props[name] ?? null),
    hasAttribute: vi.fn((name: string) => name in props),
  };
  
  return element as any;
};

describe('OigHeader (unit)', () => {
  it('should have default title', () => {
    const el = createMockElement('oig-header', { title: 'Energetické Toky' });
    expect(el.title).toBe('Energetické Toky');
  });

  it('should accept custom title', () => {
    const el = createMockElement('oig-header', { title: 'Custom' });
    expect(el.title).toBe('Custom');
  });

  it('should have time property', () => {
    const el = createMockElement('oig-header', { time: '14:30' });
    expect(el.time).toBe('14:30');
  });

  it('should have showStatus property', () => {
    const el = createMockElement('oig-header', { showStatus: true });
    expect(el.showStatus).toBe(true);
  });

  it('should have alertCount property', () => {
    const el = createMockElement('oig-header', { alertCount: 5 });
    expect(el.alertCount).toBe(5);
  });

  it('should dispatch events', () => {
    const el = createMockElement('oig-header');
    el.click();
    expect(el.dispatchEvent).toHaveBeenCalled();
  });
});

describe('OigTabs (unit)', () => {
  const defaultTabs = [
    { id: 'flow', label: 'Toky', icon: '⚡' },
    { id: 'pricing', label: 'Ceny' },
    { id: 'boiler', label: 'Bojler' },
  ];

  it('should have tabs property', () => {
    const el = createMockElement('oig-tabs', { tabs: defaultTabs });
    expect(el.tabs).toHaveLength(3);
  });

  it('should have activeTab property', () => {
    const el = createMockElement('oig-tabs', { activeTab: 'flow' });
    expect(el.activeTab).toBe('flow');
  });

  it('should handle empty tabs', () => {
    const el = createMockElement('oig-tabs', { tabs: [] });
    expect(el.tabs).toHaveLength(0);
  });

  it('should dispatch tab-change event', () => {
    const el = createMockElement('oig-tabs', { activeTab: 'flow' });
    el.dispatchEvent({ type: 'tab-change', detail: { tabId: 'pricing' } });
    expect(el.dispatchEvent).toHaveBeenCalled();
  });
});

describe('OigStatusBadge (unit)', () => {
  it('should have default level', () => {
    const el = createMockElement('oig-status-badge', { level: 'ok' });
    expect(el.level).toBe('ok');
  });

  it('should accept level property', () => {
    const el = createMockElement('oig-status-badge', { level: 'warning' });
    expect(el.level).toBe('warning');
  });

  it('should have count property', () => {
    const el = createMockElement('oig-status-badge', { count: 5 });
    expect(el.count).toBe(5);
  });

  it('should have label property', () => {
    const el = createMockElement('oig-status-badge', { label: 'Výstrahy' });
    expect(el.label).toBe('Výstrahy');
  });

  it('should have compact property', () => {
    const el = createMockElement('oig-status-badge', { compact: true });
    expect(el.compact).toBe(true);
  });

  it('should dispatch status-click event', () => {
    const el = createMockElement('oig-status-badge', { level: 'warning', count: 3 });
    el.dispatchEvent({ type: 'status-click', detail: { level: 'warning', count: 3 } });
    expect(el.dispatchEvent).toHaveBeenCalled();
  });
});
