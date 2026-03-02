/**
 * OIG Cloud V2 — Split-flap (flip) animation
 *
 * Character-by-character flip animation for value changes.
 * Respects prefers-reduced-motion.
 *
 * Port of V1 js/core/utils.js split-flap system.
 *
 * Usage in Lit:
 *   import { renderSplitFlap, SPLIT_FLAP_STYLES } from '@/utils/split-flap';
 *   // In render(): use renderSplitFlap(container, key, oldVal, newVal)
 *   // In static styles: include SPLIT_FLAP_STYLES
 */

import { css } from 'lit';

// ============================================================================
// Constants & caches
// ============================================================================

const flipPadLengths: Record<string, number> = {};
const flipElementTokens = new WeakMap<Element, number>();
let flipTokenCounter = 0;

const FLIP_ANIMATION_MIN_INTERVAL_MS = 250;
const flipLastUpdateAt: Record<string, number> = {};

// Previous value cache per key
const previousValues: Record<string, string> = {};

// ============================================================================
// Internal helpers
// ============================================================================

function prefersReducedMotion(): boolean {
  try {
    return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch {
    return false;
  }
}

function splitGraphemes(value: string | null | undefined): string[] {
  const str = value == null ? '' : String(value);
  try {
    if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
      const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' });
      return Array.from(segmenter.segment(str), (s: any) => s.segment);
    }
  } catch {
    // fallback
  }
  return Array.from(str);
}

function renderChar(char: string): string {
  return char === '' || char === ' ' ? '\u00A0' : char;
}

function animateFlipCell(
  cell: HTMLElement,
  fromChar: string,
  toChar: string,
  token: number,
  hostElement: Element
): void {
  const staticTop = cell.querySelector('.oig-flip-static-top') as HTMLElement;
  const staticBottom = cell.querySelector('.oig-flip-static-bottom') as HTMLElement;
  const size = cell.querySelector('.oig-flip-size') as HTMLElement;
  if (!staticTop || !staticBottom || !size) return;

  // Ensure width matches final character
  size.textContent = renderChar(toChar);

  const animTop = document.createElement('span');
  animTop.className = 'oig-flip-face oig-flip-anim-top';
  animTop.textContent = renderChar(fromChar);

  const animBottom = document.createElement('span');
  animBottom.className = 'oig-flip-face oig-flip-anim-bottom';
  animBottom.textContent = renderChar(toChar);

  cell.appendChild(animTop);
  cell.appendChild(animBottom);

  animTop.addEventListener(
    'animationend',
    () => {
      if (flipElementTokens.get(hostElement) !== token) return;
      staticTop.textContent = renderChar(toChar);
      animTop.remove();
    },
    { once: true }
  );

  animBottom.addEventListener(
    'animationend',
    () => {
      if (flipElementTokens.get(hostElement) !== token) return;
      staticBottom.textContent = renderChar(toChar);
      animBottom.remove();
    },
    { once: true }
  );
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Render a split-flap (flip board) animation on an element.
 * Call this from `updated()` lifecycle to animate value transitions.
 *
 * @param element  Target element (will be cleared and populated with flip cells)
 * @param cacheKey Unique key for this value slot (e.g. 'solar-power')
 * @param oldValue Previous display value (or empty for first render)
 * @param newValue New display value
 * @param forceFlip Force all chars to flip (e.g. on initial render)
 */
export function renderSplitFlap(
  element: HTMLElement,
  cacheKey: string,
  oldValue: string,
  newValue: string,
  forceFlip = false
): void {
  if (!element) return;

  if (prefersReducedMotion()) {
    element.textContent = newValue;
    return;
  }

  const disablePad = element.dataset?.flipPad === 'none';

  const oldChars = splitGraphemes(oldValue);
  const newChars = splitGraphemes(newValue);

  const targetLen = disablePad
    ? newChars.length
    : Math.max(flipPadLengths[cacheKey] || 0, oldChars.length, newChars.length);

  if (!disablePad) {
    flipPadLengths[cacheKey] = targetLen;
  }

  if (!disablePad) {
    while (oldChars.length < targetLen) oldChars.push(' ');
    while (newChars.length < targetLen) newChars.push(' ');
  }

  const token = ++flipTokenCounter;
  flipElementTokens.set(element, token);

  const board = document.createElement('span');
  board.className = 'oig-flipboard';

  for (let i = 0; i < targetLen; i++) {
    const fromChar = oldChars[i] ?? ' ';
    const toChar = newChars[i] ?? ' ';

    const cell = document.createElement('span');
    cell.className = 'oig-flip-cell';

    const size = document.createElement('span');
    size.className = 'oig-flip-size';
    size.textContent = renderChar(toChar);

    const staticTop = document.createElement('span');
    staticTop.className = 'oig-flip-face oig-flip-static-top';
    staticTop.textContent = renderChar(fromChar);

    const staticBottom = document.createElement('span');
    staticBottom.className = 'oig-flip-face oig-flip-static-bottom';
    staticBottom.textContent = renderChar(fromChar);

    cell.appendChild(size);
    cell.appendChild(staticTop);
    cell.appendChild(staticBottom);
    board.appendChild(cell);

    if (forceFlip || fromChar !== toChar) {
      animateFlipCell(cell, fromChar, toChar, token, element);
    } else {
      staticTop.textContent = renderChar(toChar);
      staticBottom.textContent = renderChar(toChar);
    }
  }

  element.textContent = '';
  element.appendChild(board);
}

/**
 * Higher-level: update an element with change detection and optional flip animation.
 * Returns true if value changed.
 */
export function updateWithFlip(
  element: HTMLElement,
  cacheKey: string,
  newValue: string,
  animate = true
): boolean {
  const hasPrev = previousValues[cacheKey] !== undefined;
  const prevValue = hasPrev ? previousValues[cacheKey] : undefined;
  const nextValue = newValue ?? '';

  if (hasPrev && prevValue === nextValue) {
    return false; // no change
  }

  previousValues[cacheKey] = nextValue;

  // Determine if we should animate
  const wantsFlip =
    animate &&
    (element.dataset?.flip === 'true' || element.classList.contains('flip-value'));

  let shouldAnimate = false;
  if (wantsFlip) {
    const now = Date.now();
    const last = flipLastUpdateAt[cacheKey] || 0;
    flipLastUpdateAt[cacheKey] = now;
    shouldAnimate = now - last >= FLIP_ANIMATION_MIN_INTERVAL_MS;
  }

  if (shouldAnimate) {
    const fromValue = hasPrev ? prevValue! : element.textContent || '';
    renderSplitFlap(element, cacheKey, fromValue, nextValue, !hasPrev);
  } else {
    element.textContent = nextValue;
  }

  return true;
}

/**
 * Clear cached value for a key (useful when component is reset).
 */
export function clearFlipCache(cacheKey: string): void {
  delete previousValues[cacheKey];
  delete flipPadLengths[cacheKey];
  delete flipLastUpdateAt[cacheKey];
}

// ============================================================================
// CSS for split-flap animation — include in component static styles
// ============================================================================

export const SPLIT_FLAP_STYLES = css`
  .oig-flipboard {
    display: inline-flex;
    gap: 0;
    vertical-align: baseline;
    line-height: 1;
  }

  .oig-flip-cell {
    display: inline-block;
    position: relative;
    overflow: hidden;
    vertical-align: top;
  }

  .oig-flip-size {
    visibility: hidden;
    display: inline-block;
    white-space: pre;
  }

  .oig-flip-face {
    position: absolute;
    left: 0;
    right: 0;
    display: inline-block;
    text-align: center;
    white-space: pre;
    backface-visibility: hidden;
  }

  .oig-flip-static-top,
  .oig-flip-static-bottom {
    position: absolute;
    left: 0;
    right: 0;
    text-align: center;
  }

  .oig-flip-static-top {
    top: 0;
  }

  .oig-flip-static-bottom {
    top: 0;
  }

  .oig-flip-anim-top {
    top: 0;
    animation: oig-flip-down 0.3s ease-in forwards;
    transform-origin: bottom center;
  }

  .oig-flip-anim-bottom {
    top: 0;
    animation: oig-flip-up 0.3s ease-out 0.15s forwards;
    transform-origin: top center;
    opacity: 0;
  }

  @keyframes oig-flip-down {
    0% {
      transform: rotateX(0deg);
      opacity: 1;
    }
    100% {
      transform: rotateX(-90deg);
      opacity: 0;
    }
  }

  @keyframes oig-flip-up {
    0% {
      transform: rotateX(90deg);
      opacity: 0;
    }
    100% {
      transform: rotateX(0deg);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .oig-flip-anim-top,
    .oig-flip-anim-bottom {
      animation: none !important;
    }
  }
`;
