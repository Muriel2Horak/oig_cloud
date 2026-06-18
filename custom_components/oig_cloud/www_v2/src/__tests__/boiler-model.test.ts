import { describe, it, expect, beforeEach } from 'vitest';
import '@/ui/features/boiler/boiler-model';
import type { OigBoilerModel } from '@/ui/features/boiler/boiler-model';
import { usableLiters, tempColor } from '@/ui/features/boiler/boiler-model';

describe('usableLiters (38 °C mixed)', () => {
  it('is larger than the bare ≥40 °C volume (mixing with cold extends it)', () => {
    // top 48, bottom 16, cold 16, 200 L → top ~31% is ≥38 °C, mixed down gives ~77 L
    const u = usableLiters(48, 16, 16, 200)!;
    expect(u).toBeGreaterThan(60);
    expect(u).toBeLessThan(100);
  });
  it('returns 0 when the whole tank is below the usable temp', () => {
    expect(usableLiters(35, 16, 16, 200)).toBe(0);
  });
  it('a fully hot tank yields well over the nominal volume', () => {
    // uniform 60 °C: each litre mixes to >1 L of 38 °C water
    expect(usableLiters(60, 60, 16, 200)!).toBeGreaterThan(200);
  });
  it('returns null without a top temperature', () => {
    expect(usableLiters(null, 16, 16, 200)).toBeNull();
  });
});

describe('tempColor (M18)', () => {
  it('maps cold water to blue and hot water to red', () => {
    expect(tempColor(10).toLowerCase()).toBe('#1565c0');
    expect(tempColor(70).toLowerCase()).toBe('#e53935');
  });
  it('interpolates between anchors for mid temps', () => {
    const c = tempColor(36); // between cyan (30) and yellow (42)
    expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    expect(c.toLowerCase()).not.toBe('#1565c0');
    expect(c.toLowerCase()).not.toBe('#e53935');
  });
  it('returns a neutral grey when temperature is unknown', () => {
    expect(tempColor(null).toLowerCase()).toBe('#3b4654');
  });
});

describe('OigBoilerModel render', () => {
  let el: OigBoilerModel;
  beforeEach(() => { el = document.createElement('oig-boiler-model') as OigBoilerModel; document.body.appendChild(el); });

  it('renders the tank svg with temps and the usable-water readout', async () => {
    el.topTempC = 47; el.bottomTempC = 33; el.readyLiters = 83; el.readyFraction = 0.42;
    el.volumeL = 200; el.coldInletTempC = 16;
    el.elementKwhToday = 1.6; el.altKwhToday = 5.4; el.altSourceType = 'gas';
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('<svg');
    expect(html).toContain('47');
    expect(html).toContain('33');
    // usable-water readout with shower/bath equivalents
    expect(html).toMatch(/vlažné|usable/i);
    expect(html).toMatch(/sprcha|sprch|shower/i);
    expect(html).toMatch(/vana|bath/i);
  });

  it('drives the water gradient from the real top/bottom temps (M18)', async () => {
    el.topTempC = 70; el.bottomTempC = 10; el.readyFraction = 0.5;
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML.toLowerCase();
    // bottom stop = cold blue (≤16), top stop = hot red (≥62)
    expect(html).toContain('#1565c0');
    expect(html).toContain('#e53935');
  });

  it('shows a ready waterline + cooler reservoir when readyFraction < 1 (M18)', async () => {
    el.topTempC = 50; el.bottomTempC = 20; el.readyFraction = 0.4;
    await el.updateComplete;
    // cold reservoir rect uses the dim fill; waterline is the bottom boundary
    const rects = Array.from(el.shadowRoot!.querySelectorAll('rect'));
    const cold = rects.find((r) => r.getAttribute('fill') === '#0a0e13');
    expect(cold).toBeTruthy();
    // ready band is the top 40% → waterline at y = 64 + 0.4*172 = 132.8
    expect(Number(cold!.getAttribute('y'))).toBeCloseTo(132.8, 1);
  });

  it('renders a full tank with no waterline when readyFraction is null', async () => {
    el.topTempC = 50; el.bottomTempC = 40; el.readyFraction = null;
    await el.updateComplete;
    const rects = Array.from(el.shadowRoot!.querySelectorAll('rect'));
    expect(rects.find((r) => r.getAttribute('fill') === '#0a0e13')).toBeFalsy();
  });

  it('applies electric heating mode class + element glow when heatMode=ele', async () => {
    el.heatMode = 'ele'; el.electricSource = 'grid';
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.mode-ele')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.charge-in.active')).toBeTruthy();
  });

  it('applies alt mode + alt-type class', async () => {
    el.heatMode = 'alt'; el.altSourceType = 'heat_pump';
    await el.updateComplete;
    const w = el.shadowRoot!.querySelector('.wrap')!;
    expect(w.classList.contains('mode-alt')).toBe(true);
    expect(w.classList.contains('alt-heat_pump')).toBe(true);
  });

  it('shows circulation group only when enabled, animates when active', async () => {
    el.circulationEnabled = false;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.circ-shown')).toBeFalsy();
    el.circulationEnabled = true; el.circulationActive = true;
    await el.updateComplete;
    const w = el.shadowRoot!.querySelector('.wrap')!;
    expect(w.classList.contains('circ-shown')).toBe(true);
    expect(w.classList.contains('circ-on')).toBe(true);
  });
});
