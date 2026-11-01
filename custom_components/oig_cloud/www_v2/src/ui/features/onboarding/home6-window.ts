/**
 * OIG Cloud V2 — Home 6 window picker: the same hour grid as the NT/VT schedule.
 *
 * The box stores one window as start and end hours and reads equal hours as no
 * window, so the grid accepts one contiguous block, which may cross midnight.
 */

import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

const HOURS = 24;

export type HourWindow = { start: number; end: number };

/** Which hours a window covers. The end hour is exclusive. */
export function windowToGrid(window: HourWindow): boolean[] {
  const grid = Array<boolean>(HOURS).fill(false);
  for (let h = window.start; h !== window.end; h = (h + 1) % HOURS) grid[h] = true;
  return grid;
}

/**
 * The window a painted grid describes, or `null` when the box cannot store it:
 * several blocks, or all 24 hours, which would read as no window at all.
 */
export function gridToWindow(grid: boolean[]): HourWindow | null {
  const starts: number[] = [];
  const ends: number[] = [];
  for (let h = 0; h < HOURS; h += 1) {
    const prev = grid[(h + HOURS - 1) % HOURS];
    if (grid[h] && !prev) starts.push(h);
    if (!grid[h] && prev) ends.push(h);
  }
  if (grid.every(Boolean)) return null;
  if (starts.length === 0) return { start: 0, end: 0 };
  if (starts.length > 1) return null;
  return { start: starts[0], end: ends[0] };
}

export function describeWindow(window: HourWindow): string {
  if (window.start === window.end) return 'Pásmo není nastavené, box se chová jako v Home 1';
  const fmt = (h: number) => `${String(h).padStart(2, '0')}:00`;
  return `Úsporný režim ${fmt(window.start)}–${fmt(window.end)}`;
}

@customElement('oig-home6-window')
export class OigHome6Window extends LitElement {
  @property({ type: Number }) start = 0;
  @property({ type: Number }) end = 0;
  /** A paint the box cannot store: kept on screen until the customer fixes it. */
  @state() private pendingGrid: boolean[] | null = null;
  private dragPaint: boolean | null = null;

  static styles = css`
    :host { display: block; }
    .legend { display: flex; align-items: center; gap: 6px; font-size: 11px; opacity: 0.8; margin-bottom: 8px; }
    .swatch { display: inline-block; width: 11px; height: 11px; border-radius: 2px; }
    .swatch.off { background: var(--card-bg, rgba(255, 255, 255, 0.12)); border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.2)); }
    .swatch.on { background: var(--primary-color, #4f7cff); }
    .hours, .cells { display: grid; grid-template-columns: repeat(24, 1fr); }
    .hours { gap: 1px; margin-bottom: 3px; }
    .hours i { font-style: normal; font-size: 9px; opacity: 0.6; text-align: center; }
    .cells { gap: 2px; }
    button {
      height: 26px; padding: 0; border: none; border-radius: 3px; cursor: pointer;
      background: var(--card-bg, rgba(255, 255, 255, 0.12)); transition: transform 0.1s;
    }
    button:hover { transform: scale(1.12); }
    button.on {
      background: var(--primary-color, #4f7cff);
      box-shadow: 0 0 6px color-mix(in srgb, var(--primary-color, #4f7cff) 50%, transparent);
    }
    .summary { font-size: 11px; opacity: 0.85; font-weight: 600; margin: 4px 0 0; }
    .error { font-size: 11px; color: var(--error-color, #ff8a80); margin: 4px 0 0; }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('mouseup', this.endDrag);
  }

  disconnectedCallback(): void {
    window.removeEventListener('mouseup', this.endDrag);
    super.disconnectedCallback();
  }

  private endDrag = (): void => {
    this.dragPaint = null;
  };

  private get grid(): boolean[] {
    return this.pendingGrid ?? windowToGrid({ start: this.start, end: this.end });
  }

  private paint(hour: number, value: boolean): void {
    const grid = this.grid;
    if (grid[hour] === value) return;
    const next = [...grid];
    next[hour] = value;
    const result = gridToWindow(next);
    if (!result) {
      this.pendingGrid = next;
      this.notify(true);
      return;
    }
    this.pendingGrid = null;
    this.start = result.start;
    this.end = result.end;
    this.notify(false);
  }

  private notify(invalid: boolean): void {
    this.dispatchEvent(new CustomEvent('window-change', {
      detail: { start: this.start, end: this.end, invalid },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    const grid = this.grid;
    return html`
      <div class="legend">
        <span class="swatch off"></span> Normální provoz
        <span class="swatch on"></span> Úsporný režim
      </div>
      <div class="hours" aria-hidden="true">
        ${Array.from({ length: HOURS }, (_, h) => html`<i>${h % 6 === 0 || h === 23 ? h : ''}</i>`)}
      </div>
      <div class="cells" data-testid="home6-cells">
        ${grid.map((on, hour) => html`
          <button
            type="button"
            class=${on ? 'on' : ''}
            data-testid="home6-cell-${hour}"
            title="${String(hour).padStart(2, '0')}:00"
            @mousedown=${(e: MouseEvent) => {
              e.preventDefault();
              this.dragPaint = !on;
              this.paint(hour, !on);
            }}
            @mouseenter=${(e: MouseEvent) => {
              if (e.buttons === 1 && this.dragPaint !== null) this.paint(hour, this.dragPaint);
            }}
          ></button>
        `)}
      </div>
      ${this.pendingGrid
        ? html`<p class="error" data-testid="home6-error">Box umí jen jedno souvislé pásmo, kratší než celý den.</p>`
        : html`<p class="summary" data-testid="home6-summary">${describeWindow({ start: this.start, end: this.end })}</p>`}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-home6-window': OigHome6Window;
  }
}
