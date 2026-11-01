import { describe, expect, it } from 'vitest';
import { fieldHint, fieldLabel } from '@/i18n/fields';
import {
  renderBatteryModeBandSvg,
  renderBatteryPriceSvg,
  renderBatterySocSvg,
  renderBoilerDrawSvg,
  renderBoilerModeBandSvg,
  renderBoilerTempSvg,
} from './simulator-charts';
import type { BatteryInterval, BoilerInterval } from './simulator-fetcher';

function batteryIntervals(): BatteryInterval[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    t: `2099-06-14T${String(hour).padStart(2, '0')}:00:00Z`,
    mode: hour >= 1 && hour <= 5 ? 'ups' : 'home',
    soc: 42 + hour,
    cost: hour * 1.5,
  }));
}

function boilerIntervals(): BoilerInterval[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    t: `2099-06-14T${String(hour).padStart(2, '0')}:00:00Z`,
    heating: hour >= 10 && hour <= 14,
    source: hour >= 10 && hour <= 12 ? 'solar' : 'grid',
    temp: 43 + hour * 0.5,
  }));
}

describe('simulator i18n copy', () => {
  it('exposes the mock labels for the left card, KPI tiles and charts', () => {
    expect(fieldLabel('day_cost', 'simulator.kpi.day_cost.label')).toBe('Náklad dne');
    expect(fieldLabel('base_cost', 'simulator.kpi.base_cost.label')).toBe('Bez plánovače');
    expect(fieldLabel('savings', 'simulator.kpi.savings.label')).toBe('Úspora');
    expect(fieldLabel('ups_hours', 'simulator.kpi.ups_hours.label')).toBe('Hodin v UPS');
    expect(fieldLabel('energy_today', 'simulator.kpi.energy_today.label')).toBe('Energie dne');
    expect(fieldLabel('solar_share', 'simulator.kpi.solar_share.label')).toBe('Ze slunce');
    expect(fieldLabel('settings', 'simulator.card.settings.label')).toBe('Nastavení, které simulace používá');
    expect(fieldLabel('readonly', 'simulator.card.readonly.label')).toBe('Z boxu (jen pro čtení)');
    expect(fieldLabel('mode', 'simulator.chart.mode.label')).toBe('Plán režimů');
    expect(fieldLabel('soc', 'simulator.chart.soc.label')).toBe('Stav baterie');
    expect(fieldLabel('price', 'simulator.chart.price.label')).toBe('Spotová cena');
    expect(fieldLabel('heating', 'simulator.chart.heating_windows.label')).toBe('Okna ohřevu');
    expect(fieldLabel('water_temp', 'simulator.chart.water_temp.label')).toBe('Teplota vody');
    expect(fieldLabel('draw', 'simulator.chart.draw.label')).toBe('Odběr teplé vody');
    expect(fieldLabel('unavailable', 'simulator.common.unavailable.label')).toBe('nedostupné');
    expect(fieldLabel('retry', 'simulator.common.retry.label')).toBe('Zkusit znovu');
    expect(fieldLabel('charge_rate_kw', 'simulator.battery.charge_rate_kw.label')).toBe('Nabíjecí výkon ze sítě');
    expect(fieldLabel('target_temp_c', 'simulator.boiler.target_temp_c.label')).toBe('Cílová teplota');
    expect(fieldLabel('min_temp_c', 'simulator.boiler.min_temp_c.label')).toBe('Minimální teplota');
    expect(fieldLabel('capacity_kwh', 'simulator.box.capacity_kwh.label')).toBe('Kapacita baterie');
    expect(fieldLabel('hw_min_soc_percent', 'simulator.box.hw_min_soc_percent.label')).toBe('Minimální SoC (HW)');
    expect(fieldLabel('top_temp_c', 'simulator.box.top_temp_c.label')).toBe('Teplota nahoře');
    expect(fieldLabel('bottom_temp_c', 'simulator.box.bottom_temp_c.label')).toBe('Teplota dole');
    expect(fieldLabel('cold_inlet_c', 'simulator.box.cold_inlet_c.label')).toBe('Studená voda na vstupu');

    expect(fieldHint('charge_rate_kw', 'simulator.battery.charge_rate_kw.hint')).toContain('UPS');
    expect(fieldHint('target_temp_c', 'simulator.boiler.target_temp_c.hint')).toContain('levných/solárních');
  });
});

describe('battery simulator chart helpers', () => {
  it('renders 24 hourly mode rects with titles and aria labels', () => {
    const svg = renderBatteryModeBandSvg(batteryIntervals());
    expect(svg.match(/<rect\b/g)).toHaveLength(24);
    expect(svg).toContain('aria-label="0:00');
    expect(svg).toContain('<title>0:00');
    expect(svg).toContain('var(--ups)');
    expect(svg).toContain('var(--home)');
  });

  it('renders the SoC chart with one axis, no threshold line, and focusable points', () => {
    const svg = renderBatterySocSvg(batteryIntervals());
    expect(svg).toContain('100 %');
    expect(svg).toContain('0 %');
    expect(svg).not.toContain('stroke-dasharray="3 4"');
    expect(svg).toContain('fill-opacity=".14"');
    expect(svg.match(/data-sim-point="/g)).toHaveLength(24);
    expect(svg).not.toContain('right-axis');
  });

  it('renders 24 price bars with the expected palette', () => {
    const prices = Array.from({ length: 24 }, (_, hour) => (hour < 3 ? -0.3 : 2.4 + hour * 0.1));
    const svg = renderBatteryPriceSvg(prices);
    expect(svg.match(/<rect\b/g)).toHaveLength(24);
    expect(svg).toContain('var(--price)');
    expect(svg).toContain('#31406b');
    expect(svg).toContain('0');
    expect(svg).toContain('24');
  });
});

describe('battery price chart with real presets', () => {
  const bars = (svg: string) => {
    const host = document.createElement('div');
    host.innerHTML = svg;
    return [...host.querySelectorAll('rect')];
  };

  it('labels quarter-hour bars with the time of day', () => {
    const labels = bars(renderBatteryPriceSvg(Array.from({ length: 96 }, () => 1))).map((bar) =>
      bar.getAttribute('aria-label'),
    );

    expect(labels[0]).toBe('0:00 — 1.00 Kč/kWh');
    expect(labels[1]).toBe('0:15 — 1.00 Kč/kWh');
    expect(labels[25]).toBe('6:15 — 1.00 Kč/kWh');
    expect(labels[95]).toBe('23:45 — 1.00 Kč/kWh');
  });

  it('keeps hourly bars on the hour', () => {
    const labels = bars(renderBatteryPriceSvg(Array.from({ length: 24 }, () => 1))).map((bar) =>
      bar.getAttribute('aria-label'),
    );

    expect(labels[6]).toBe('6:00 — 1.00 Kč/kWh');
  });

  // The negative_price preset spans -2 to +1 Kč/kWh.
  it('fits negative and positive bars inside the chart, sized in proportion', () => {
    const [negative, positive] = bars(renderBatteryPriceSvg([-2, 1]));
    const top = (bar: Element) => Number(bar.getAttribute('y'));
    const height = (bar: Element) => Number(bar.getAttribute('height'));

    expect(top(negative) + height(negative)).toBeLessThanOrEqual(62);
    expect(top(positive)).toBeGreaterThanOrEqual(0);
    expect(height(negative) / height(positive)).toBeCloseTo(2, 1);
    // Both grow away from the same zero line.
    expect(top(positive) + height(positive)).toBeCloseTo(top(negative), 1);
  });

  it('keeps an all-zero day on the bottom line', () => {
    const [bar] = bars(renderBoilerDrawSvg(Array.from({ length: 24 }, () => 0)));

    expect(Number(bar.getAttribute('y')) + Number(bar.getAttribute('height'))).toBeCloseTo(46, 1);
  });
});

describe('boiler simulator chart helpers', () => {
  it('renders 24 hourly heating rects with titles and aria labels', () => {
    const svg = renderBoilerModeBandSvg(boilerIntervals());
    expect(svg.match(/<rect\b/g)).toHaveLength(24);
    expect(svg).toContain('aria-label="0:00');
    expect(svg).toContain('var(--ups)');
    expect(svg).toContain('var(--boil)');
  });

  it('renders the temperature chart with a single axis and threshold line', () => {
    const svg = renderBoilerTempSvg(boilerIntervals(), 45);
    expect(svg).toContain('75 °C');
    expect(svg).toContain('30 °C');
    expect(svg).toContain('minimum');
    expect(svg.match(/data-sim-point="/g)).toHaveLength(24);
  });

  it('renders the draw bars and hour axis', () => {
    const draws = Array.from({ length: 24 }, (_, hour) => (hour >= 6 && hour <= 8 ? 60 : 0));
    const svg = renderBoilerDrawSvg(draws);
    expect(svg.match(/<rect\b/g)).toHaveLength(24);
    expect(svg).toContain('0');
    expect(svg).toContain('24');
    expect(svg).toContain('#31406b');
  });
});
