import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearFlipCache,
  renderSplitFlap,
  SPLIT_FLAP_STYLES,
  updateWithFlip,
} from '@/utils/split-flap';

const nbsp = '\u00A0';

function mediaQueryList(matches: boolean): MediaQueryList {
  return {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;
}

describe('split-flap utils', () => {
  let container: HTMLElement;
  let cacheKey: string;
  let matchMediaMock: ReturnType<typeof vi.fn>;
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    cacheKey = `split-flap-${expect.getState().currentTestName}`;

    originalMatchMedia = window.matchMedia;
    matchMediaMock = vi.fn().mockReturnValue(mediaQueryList(false));
    window.matchMedia = matchMediaMock as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    clearFlipCache(cacheKey);
    container.remove();
    vi.useRealTimers();
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    } else {
      Reflect.deleteProperty(window, 'matchMedia');
    }
  });

  it('exports flip-board CSS with the paired animation faces', () => {
    expect(SPLIT_FLAP_STYLES.cssText).toMatch(/\.oig-flipboard\s*\{[^}]*display:\s*inline-flex/);
    expect(SPLIT_FLAP_STYLES.cssText).toMatch(/\.oig-flip-anim-top\s*\{[^}]*animation:\s*oig-flip-down/);
    expect(SPLIT_FLAP_STYLES.cssText).toMatch(/\.oig-flip-anim-bottom\s*\{[^}]*animation:\s*oig-flip-up/);
  });

  it('short-circuits to plain text when reduced motion is preferred', () => {
    matchMediaMock.mockReturnValue(mediaQueryList(true));

    renderSplitFlap(container, cacheKey, 'old', 'new');

    expect(container.textContent).toBe('new');
    expect(container.querySelector('.oig-flipboard')).toBeNull();
    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('renders the flip board when reduced motion is NOT preferred', () => {
    matchMediaMock.mockReturnValue(mediaQueryList(false));

    renderSplitFlap(container, cacheKey, 'A', 'B');

    expect(container.querySelector('.oig-flipboard')).not.toBeNull();
    expect(container.querySelectorAll('.oig-flip-cell')).toHaveLength(1);
    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('falls back to flip rendering when matchMedia throws', () => {
    matchMediaMock.mockImplementation(() => {
      throw new Error('unavailable');
    });

    renderSplitFlap(container, cacheKey, 'A', 'B');

    expect(container.querySelector('.oig-flipboard')).not.toBeNull();
    expect(container.querySelector('.oig-flip-anim-top')).not.toBeNull();
  });

  it('does nothing when no target element is provided', () => {
    expect(() => renderSplitFlap(null as unknown as HTMLElement, cacheKey, 'A', 'B')).not.toThrow();
  });

  it('renders grapheme clusters as one cell when Segmenter is available', () => {
    renderSplitFlap(container, cacheKey, '', 'e\u0301');

    expect(container.querySelectorAll('.oig-flip-cell')).toHaveLength(1);
    expect(container.querySelector('.oig-flip-size')?.textContent).toBe('e\u0301');
  });

  it('falls back to code-point splitting when Segmenter is unavailable', () => {
    const segmenterDescriptor = Object.getOwnPropertyDescriptor(Intl, 'Segmenter');
    Object.defineProperty(Intl, 'Segmenter', { configurable: true, value: undefined });

    try {
      renderSplitFlap(container, cacheKey, '', 'e\u0301');
    } finally {
      if (segmenterDescriptor) Object.defineProperty(Intl, 'Segmenter', segmenterDescriptor);
    }

    expect(container.querySelectorAll('.oig-flip-cell')).toHaveLength(2);
  });

  it('falls back to code-point splitting when Segmenter rejects a value', () => {
    const segmenterDescriptor = Object.getOwnPropertyDescriptor(Intl, 'Segmenter');
    Object.defineProperty(Intl, 'Segmenter', {
      configurable: true,
      value: class {
        segment(): never {
          throw new Error('segmentation failed');
        }
      },
    });

    try {
      renderSplitFlap(container, cacheKey, '', 'e\u0301');
    } finally {
      if (segmenterDescriptor) Object.defineProperty(Intl, 'Segmenter', segmenterDescriptor);
    }

    expect(container.querySelectorAll('.oig-flip-cell')).toHaveLength(2);
  });

  it('renders spaces as non-breaking sizes while the initial faces retain blank values', () => {
    renderSplitFlap(container, cacheKey, '', 'A B');

    const sizes = container.querySelectorAll('.oig-flip-size');
    const staticTops = container.querySelectorAll('.oig-flip-static-top');
    expect([...sizes].map(size => size.textContent)).toEqual(['A', nbsp, 'B']);
    expect([...staticTops].map(face => face.textContent)).toEqual([nbsp, nbsp, nbsp]);
  });

  it('pads future renders to the widest value retained for the key', () => {
    renderSplitFlap(container, cacheKey, '12345', 'ABC');
    expect(container.querySelectorAll('.oig-flip-cell')).toHaveLength(5);
    expect([...container.querySelectorAll('.oig-flip-size')].map(size => size.textContent))
      .toEqual(['A', 'B', 'C', nbsp, nbsp]);

    renderSplitFlap(container, cacheKey, '', 'Z');

    expect(container.querySelectorAll('.oig-flip-cell')).toHaveLength(5);
  });

  it('does not pad values when flipPad is disabled on the host', () => {
    container.dataset.flipPad = 'none';

    renderSplitFlap(container, cacheKey, '12345', 'ABC');

    expect(container.querySelectorAll('.oig-flip-cell')).toHaveLength(3);
  });

  it('keeps matching character faces static unless a flip is forced', () => {
    renderSplitFlap(container, cacheKey, 'A', 'A');
    expect(container.querySelector('.oig-flip-anim-top')).toBeNull();
    expect(container.querySelector('.oig-flip-static-top')?.textContent).toBe('A');

    renderSplitFlap(container, cacheKey, 'AB', 'AB', true);

    expect(container.querySelectorAll('.oig-flip-anim-top')).toHaveLength(2);
    expect(container.querySelectorAll('.oig-flip-anim-bottom')).toHaveLength(2);
  });

  it('commits each new face only after its animation-end event', () => {
    renderSplitFlap(container, cacheKey, 'A', 'B');

    const cell = container.querySelector('.oig-flip-cell') as HTMLElement;
    const staticTop = cell.querySelector('.oig-flip-static-top') as HTMLElement;
    const staticBottom = cell.querySelector('.oig-flip-static-bottom') as HTMLElement;
    const animTop = cell.querySelector('.oig-flip-anim-top') as HTMLElement;
    const animBottom = cell.querySelector('.oig-flip-anim-bottom') as HTMLElement;

    animBottom.dispatchEvent(new Event('animationend'));
    expect(staticBottom.textContent).toBe('B');
    expect(animBottom.isConnected).toBe(false);
    expect(staticTop.textContent).toBe('A');

    animTop.dispatchEvent(new Event('animationend'));
    expect(staticTop.textContent).toBe('B');
    expect(animTop.isConnected).toBe(false);
  });

  it('ignores animation events from an invalidated flip token', () => {
    renderSplitFlap(container, cacheKey, 'A', 'B');
    const oldCell = container.querySelector('.oig-flip-cell') as HTMLElement;
    const oldTop = oldCell.querySelector('.oig-flip-anim-top') as HTMLElement;
    const oldStaticTop = oldCell.querySelector('.oig-flip-static-top') as HTMLElement;

    renderSplitFlap(container, cacheKey, 'C', 'D');
    oldTop.dispatchEvent(new Event('animationend'));

    expect(oldStaticTop.textContent).toBe('A');
    expect(oldTop.isConnected).toBe(false);
  });

  it('writes plain text once and reports false for an unchanged value', () => {
    expect(updateWithFlip(container, cacheKey, 'ABC')).toBe(true);
    expect(container.textContent).toBe('ABC');
    expect(updateWithFlip(container, cacheKey, 'ABC')).toBe(false);
  });

  it('animates again at the exact 250ms rate-limit boundary', () => {
    container.classList.add('flip-value');
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    updateWithFlip(container, cacheKey, 'A');
    vi.advanceTimersByTime(250);
    updateWithFlip(container, cacheKey, 'B');

    expect(container.querySelector('.oig-flipboard')).not.toBeNull();
    expect(container.querySelector('.oig-flip-size')?.textContent).toBe('B');
  });

  it('suppresses a flip within the rate-limit interval', () => {
    container.dataset.flip = 'true';
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    updateWithFlip(container, cacheKey, 'A');
    vi.advanceTimersByTime(249);
    updateWithFlip(container, cacheKey, 'B');

    expect(container.querySelector('.oig-flipboard')).toBeNull();
    expect(container.textContent).toBe('B');
  });

  it('uses the host text as the forced first-flip source value', () => {
    container.classList.add('flip-value');
    container.textContent = 'PREV';
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    updateWithFlip(container, cacheKey, 'NEXT');

    expect(container.querySelector('.oig-flip-static-top')?.textContent).toBe('P');
    expect(container.querySelectorAll('.oig-flip-anim-top')).toHaveLength(4);
  });

  it('skips flip rendering when animation is disabled or no flip opt-in is present', () => {
    container.classList.add('flip-value');
    expect(updateWithFlip(container, cacheKey, 'A', false)).toBe(true);
    expect(container.querySelector('.oig-flipboard')).toBeNull();

    clearFlipCache(cacheKey);
    container.classList.remove('flip-value');
    expect(updateWithFlip(container, cacheKey, 'B')).toBe(true);
    expect(container.querySelector('.oig-flipboard')).toBeNull();
  });

  it('clears value and timing state so the same value is accepted again', () => {
    updateWithFlip(container, cacheKey, 'A');
    expect(updateWithFlip(container, cacheKey, 'A')).toBe(false);

    clearFlipCache(cacheKey);

    expect(updateWithFlip(container, cacheKey, null as unknown as string)).toBe(true);
    expect(container.textContent).toBe('');
  });
});
