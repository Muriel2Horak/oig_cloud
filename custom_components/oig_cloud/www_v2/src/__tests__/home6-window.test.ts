import { describe, expect, it } from 'vitest';
import {
  OigHome6Window,
  describeWindow,
  gridToWindow,
  windowToGrid,
} from '@/ui/features/onboarding/home6-window';

const hoursOf = (grid: boolean[]) => grid.flatMap((on, h) => (on ? [h] : []));

describe('Home 6 window grid', () => {
  it('reads equal hours as no window', () => {
    expect(hoursOf(windowToGrid({ start: 0, end: 0 }))).toEqual([]);
    expect(gridToWindow(Array(24).fill(false))).toEqual({ start: 0, end: 0 });
  });

  it('round-trips a window crossing midnight', () => {
    const grid = windowToGrid({ start: 22, end: 6 });
    expect(hoursOf(grid)).toEqual([0, 1, 2, 3, 4, 5, 22, 23]);
    expect(gridToWindow(grid)).toEqual({ start: 22, end: 6 });
  });

  it('round-trips a daytime window', () => {
    expect(gridToWindow(windowToGrid({ start: 9, end: 12 }))).toEqual({ start: 9, end: 12 });
  });

  it('refuses two separate blocks', () => {
    const grid = Array(24).fill(false);
    grid[1] = true;
    grid[5] = true;
    expect(gridToWindow(grid)).toBeNull();
  });

  it('refuses the whole day, which the box would read as no window', () => {
    expect(gridToWindow(Array(24).fill(true))).toBeNull();
  });

  it('describes the window for the customer', () => {
    expect(describeWindow({ start: 22, end: 6 })).toContain('22:00–06:00');
    expect(describeWindow({ start: 0, end: 0 })).toContain('není nastavené');
  });
});

describe('oig-home6-window', () => {
  async function mount(start: number, end: number) {
    const el = new OigHome6Window();
    el.start = start;
    el.end = end;
    const events: Array<{ start: number; end: number; invalid: boolean }> = [];
    el.addEventListener('window-change', (e) => events.push((e as CustomEvent).detail));
    document.body.appendChild(el);
    await el.updateComplete;
    return { el, events };
  }

  const press = async (el: OigHome6Window, hour: number) => {
    el.shadowRoot!
      .querySelector(`[data-testid="home6-cell-${hour}"]`)!
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await el.updateComplete;
  };

  it('extends the window when a neighbouring hour is painted', async () => {
    const { el, events } = await mount(22, 6);
    await press(el, 6);
    expect(events.at(-1)).toEqual({ start: 22, end: 7, invalid: false });
    el.remove();
  });

  it('reports a paint the box cannot store and keeps the last valid window', async () => {
    const { el, events } = await mount(22, 6);
    await press(el, 12);
    expect(events.at(-1)).toEqual({ start: 22, end: 6, invalid: true });
    expect(el.shadowRoot!.querySelector('[data-testid="home6-error"]')).not.toBeNull();
    await press(el, 12);
    expect(events.at(-1)).toEqual({ start: 22, end: 6, invalid: false });
    el.remove();
  });
});
