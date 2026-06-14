import { describe, it, expect, beforeEach } from 'vitest';
import '@/ui/features/boiler/boiler-model';
import type { OigBoilerModel } from '@/ui/features/boiler/boiler-model';

describe('OigBoilerModel render', () => {
  let el: OigBoilerModel;
  beforeEach(() => { el = document.createElement('oig-boiler-model') as OigBoilerModel; document.body.appendChild(el); });

  it('renders the tank svg with temps and ready litres', async () => {
    el.topTempC = 47; el.bottomTempC = 33; el.readyLiters = 83; el.readyFraction = 0.42;
    el.elementKwhToday = 1.6; el.altKwhToday = 5.4; el.altSourceType = 'gas';
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('<svg');
    expect(html).toContain('47');
    expect(html).toContain('33');
    expect(html).toContain('83 L');
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
