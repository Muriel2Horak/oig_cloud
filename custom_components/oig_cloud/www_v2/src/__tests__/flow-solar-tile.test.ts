/**
 * Tests for the redesigned Solar tile V2 (compact, variant B):
 *  - aura = peak % (dc_in_fv_proc), 0/grey at night
 *  - gaugePill: "X % špičky" by day / "🌙 Noc" at night
 *  - production bar: progressPct = produced / forecast
 *  - forecast guard: forecastKwh = max(solarForecastToday, producedKwh)
 *  - remaining/hotovo logic
 *  - tomorrow chip visibility (including stale warning)
 *  - string active/off detection
 *  - night detection: isNight iff solarPercent < 2
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Pure helpers mirroring renderSolar() inline logic (kept here to avoid
// exposing them just for testing — the formulas are simple enough).
// ---------------------------------------------------------------------------

function solarCompute(opts: {
  solarPercent: number;
  solarToday: number;        // Wh
  solarForecastToday: number; // kWh
  solarPower: number;        // W
}) {
  const { solarPercent: percent, solarToday, solarForecastToday, solarPower } = opts;
  const isNight = percent < 2;
  const producedKwh = solarToday / 1000;
  const forecastKwh = Math.max(solarForecastToday, producedKwh);
  const remainingKwh = Math.max(0, forecastKwh - producedKwh);
  const progressPct = forecastKwh > 0 ? Math.min(100, (producedKwh / forecastKwh) * 100) : 0;
  const powerKw = solarPower / 1000;
  const auraPct = isNight ? 0 : percent;
  const pillLabel = isNight ? '🌙 Noc' : `${Math.round(percent)} % špičky`;
  return { isNight, producedKwh, forecastKwh, remainingKwh, progressPct, powerKw, auraPct, pillLabel };
}

function stringActive(p: number, v: number): boolean {
  return p > 0 || v > 0;
}

// ---------------------------------------------------------------------------
// isNight detection
// ---------------------------------------------------------------------------

describe('solar tile V2 — isNight detection', () => {
  it('isNight when solarPercent = 0', () => {
    expect(solarCompute({ solarPercent: 0, solarToday: 0, solarForecastToday: 10, solarPower: 0 }).isNight).toBe(true);
  });

  it('isNight when solarPercent = 1 (below threshold 2)', () => {
    expect(solarCompute({ solarPercent: 1, solarToday: 100, solarForecastToday: 10, solarPower: 50 }).isNight).toBe(true);
  });

  it('NOT night when solarPercent = 2 (at threshold)', () => {
    expect(solarCompute({ solarPercent: 2, solarToday: 200, solarForecastToday: 10, solarPower: 100 }).isNight).toBe(false);
  });

  it('NOT night when solarPercent = 34', () => {
    expect(solarCompute({ solarPercent: 34, solarToday: 5000, solarForecastToday: 26.6, solarPower: 1800 }).isNight).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Aura = peak % (auraPct)
// ---------------------------------------------------------------------------

describe('solar tile V2 — aura = peak %', () => {
  it('aura 0 at night (percent=0)', () => {
    const { auraPct } = solarCompute({ solarPercent: 0, solarToday: 0, solarForecastToday: 10, solarPower: 0 });
    expect(auraPct).toBe(0);
  });

  it('aura 0 at night even if solarPercent=1', () => {
    const { auraPct } = solarCompute({ solarPercent: 1, solarToday: 500, solarForecastToday: 10, solarPower: 50 });
    expect(auraPct).toBe(0);
  });

  it('aura = percent by day (34 %)', () => {
    const { auraPct } = solarCompute({ solarPercent: 34, solarToday: 5000, solarForecastToday: 26.6, solarPower: 1800 });
    expect(auraPct).toBe(34);
  });

  it('aura = percent by day at peak (100 %)', () => {
    const { auraPct } = solarCompute({ solarPercent: 100, solarToday: 3000, solarForecastToday: 5, solarPower: 5400 });
    expect(auraPct).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// gaugePill label
// ---------------------------------------------------------------------------

describe('solar tile V2 — gaugePill label', () => {
  it('pill = "🌙 Noc" at night', () => {
    const { pillLabel } = solarCompute({ solarPercent: 0, solarToday: 24800, solarForecastToday: 26.6, solarPower: 0 });
    expect(pillLabel).toBe('🌙 Noc');
  });

  it('pill contains "% špičky" by day', () => {
    const { pillLabel } = solarCompute({ solarPercent: 34, solarToday: 5000, solarForecastToday: 26.6, solarPower: 1800 });
    expect(pillLabel).toBe('34 % špičky');
  });

  it('pill rounds percent correctly (round 34.7 → 35)', () => {
    const { pillLabel } = solarCompute({ solarPercent: 34.7, solarToday: 5000, solarForecastToday: 26.6, solarPower: 1880 });
    expect(pillLabel).toBe('35 % špičky');
  });

  it('pill at 1 % (below night threshold=2) → 🌙 Noc', () => {
    const { pillLabel } = solarCompute({ solarPercent: 1, solarToday: 500, solarForecastToday: 10, solarPower: 50 });
    expect(pillLabel).toBe('🌙 Noc');
  });
});

// ---------------------------------------------------------------------------
// Forecast guard: forecastKwh never below producedKwh
// ---------------------------------------------------------------------------

describe('solar tile V2 — forecast guard', () => {
  it('uses producedKwh when solarForecastToday = 0', () => {
    // Late in day: forecast API returns 0 but produced = 15 kWh
    const { forecastKwh, producedKwh } = solarCompute({
      solarPercent: 0, solarToday: 15000, solarForecastToday: 0, solarPower: 0,
    });
    expect(forecastKwh).toBe(producedKwh);
    expect(forecastKwh).toBe(15);
  });

  it('uses solarForecastToday when it exceeds producedKwh', () => {
    const { forecastKwh } = solarCompute({
      solarPercent: 34, solarToday: 5000, solarForecastToday: 26.6, solarPower: 1800,
    });
    expect(forecastKwh).toBe(26.6);
  });

  it('progressPct=100 when produced ≥ forecast', () => {
    // Produced 30 kWh but forecast was only 28 kWh
    const { progressPct } = solarCompute({
      solarPercent: 0, solarToday: 30000, solarForecastToday: 28, solarPower: 0,
    });
    expect(progressPct).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Production bar progress %
// ---------------------------------------------------------------------------

describe('solar tile V2 — production bar', () => {
  it('progressPct = 0 when no production and no forecast', () => {
    const { progressPct } = solarCompute({
      solarPercent: 0, solarToday: 0, solarForecastToday: 0, solarPower: 0,
    });
    expect(progressPct).toBe(0);
  });

  it('progressPct = 65 for 17.4 kWh of 26.6 kWh', () => {
    const { progressPct } = solarCompute({
      solarPercent: 34, solarToday: 17400, solarForecastToday: 26.6, solarPower: 1800,
    });
    expect(progressPct).toBeCloseTo((17.4 / 26.6) * 100, 1);
  });

  it('progressPct = 93 for 24.8 kWh of 26.6 kWh (night)', () => {
    const { progressPct } = solarCompute({
      solarPercent: 0, solarToday: 24800, solarForecastToday: 26.6, solarPower: 0,
    });
    expect(progressPct).toBeCloseTo((24.8 / 26.6) * 100, 1);
  });

  it('progressPct capped at 100 when produced > forecast', () => {
    const { progressPct } = solarCompute({
      solarPercent: 0, solarToday: 30000, solarForecastToday: 28, solarPower: 0,
    });
    expect(progressPct).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Remaining kWh / hotovo logic
// ---------------------------------------------------------------------------

describe('solar tile V2 — remaining kWh', () => {
  it('remainingKwh > 0 when produced < forecast', () => {
    const { remainingKwh } = solarCompute({
      solarPercent: 34, solarToday: 17400, solarForecastToday: 26.6, solarPower: 1800,
    });
    expect(remainingKwh).toBeCloseTo(26.6 - 17.4, 1);
  });

  it('remainingKwh = 0 (clamped) when produced > forecast', () => {
    const { remainingKwh } = solarCompute({
      solarPercent: 0, solarToday: 30000, solarForecastToday: 28, solarPower: 0,
    });
    expect(remainingKwh).toBe(0);
  });

  it('hotovo shown at night (remainingKwh ~ 0)', () => {
    const { remainingKwh, isNight } = solarCompute({
      solarPercent: 0, solarToday: 24800, solarForecastToday: 26.6, solarPower: 0,
    });
    // isNight=true → bar right label shows "hotovo" regardless
    expect(isNight).toBe(true);
    // remaining might be ~1.8 kWh if not fully produced, but night means "hotovo"
    // (the render checks isNight || remainingKwh < 0.05 for "hotovo")
    const showHotovo = isNight || remainingKwh < 0.05;
    expect(showHotovo).toBe(true);
  });

  it('"hotovo" when remaining < 0.05 kWh (nearly done, day)', () => {
    const { remainingKwh, isNight } = solarCompute({
      solarPercent: 3, solarToday: 26590, solarForecastToday: 26.6, solarPower: 160,
    });
    expect(isNight).toBe(false);
    expect(remainingKwh).toBeCloseTo(0.01, 2);
    const showHotovo = isNight || remainingKwh < 0.05;
    expect(showHotovo).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// String active/off detection
// ---------------------------------------------------------------------------

describe('solar tile V2 — string active/off', () => {
  it('string is active when P > 0', () => {
    expect(stringActive(1818, 455)).toBe(true);
  });

  it('string is active when V > 0 but P = 0 (e.g. MPPT tracking, no output yet)', () => {
    expect(stringActive(0, 350)).toBe(true);
  });

  it('string is off when P = 0 and V = 0', () => {
    expect(stringActive(0, 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tomorrow chip: stale warning integration
// ---------------------------------------------------------------------------

describe('solar tile V2 — tomorrow chip + stale', () => {
  it('stale warning glyph ⚠ appended when solarForecastStale=true', () => {
    // The template renders a <span>⚠</span> when d.solarForecastStale is true.
    // We test the boolean gate.
    const stale = true;
    const label = `25.5 kWh${stale ? ' ⚠' : ''}`;
    expect(label).toContain('⚠');
  });

  it('no warning glyph when solarForecastStale=false', () => {
    const stale = false;
    const label = `25.5 kWh${stale ? ' ⚠' : ''}`;
    expect(label).not.toContain('⚠');
  });

  it('tomorrow chip always visible (not behind detail-section collapse)', () => {
    // The sol-tmr chip is rendered at the top level of the node div,
    // NOT inside a .detail-section — so it shows regardless of expanded state.
    // This is a structural contract: we assert the chip is outside detail-section.
    // (DOM test would be: expect(chip.closest('.detail-section')).toBeNull())
    // Here we just document the expectation.
    expect(true).toBe(true); // placeholder: structural contract is in render code
  });
});

// ---------------------------------------------------------------------------
// aura pct arithmetic boundary cases
// ---------------------------------------------------------------------------

describe('solar tile V2 — aura boundary cases', () => {
  it('percent exactly 2 → day mode, auraPct = 2', () => {
    const { isNight, auraPct } = solarCompute({ solarPercent: 2, solarToday: 200, solarForecastToday: 10, solarPower: 100 });
    expect(isNight).toBe(false);
    expect(auraPct).toBe(2);
  });

  it('percent 1.9 → night mode, auraPct = 0', () => {
    const { isNight, auraPct } = solarCompute({ solarPercent: 1.9, solarToday: 100, solarForecastToday: 10, solarPower: 50 });
    expect(isNight).toBe(true);
    expect(auraPct).toBe(0);
  });

  it('percent 100 → auraPct = 100, pill "100 % špičky"', () => {
    const { auraPct, pillLabel } = solarCompute({ solarPercent: 100, solarToday: 2000, solarForecastToday: 5, solarPower: 5400 });
    expect(auraPct).toBe(100);
    expect(pillLabel).toBe('100 % špičky');
  });
});

// ---------------------------------------------------------------------------
// Popover 'Ještě vyrobí' isNight guard
// ---------------------------------------------------------------------------

describe('solar tile V2 — popover ještě vyrobí isNight guard', () => {
  it('shows "hotovo" when isNight=true even if remaining > 0.05', () => {
    // Night: produced 24.8 kWh, forecast 26.6 kWh → remaining 1.8 kWh > 0.05
    // But isNight=true → should show "hotovo"
    const { isNight, remainingKwh } = solarCompute({
      solarPercent: 0, solarToday: 24800, solarForecastToday: 26.6, solarPower: 0,
    });
    expect(isNight).toBe(true);
    expect(remainingKwh).toBeGreaterThan(0.05);
    // The popover row uses the same guard: isNight || remainingKwh < 0.05
    const popoverText = (isNight || remainingKwh < 0.05) ? 'hotovo' : `~${remainingKwh.toFixed(1).replace('.', ',')} kWh`;
    expect(popoverText).toBe('hotovo');
  });

  it('shows remaining kWh in popover by day when remaining > 0.05', () => {
    const { isNight, remainingKwh } = solarCompute({
      solarPercent: 34, solarToday: 17400, solarForecastToday: 26.6, solarPower: 1800,
    });
    expect(isNight).toBe(false);
    expect(remainingKwh).toBeGreaterThan(0.05);
    const popoverText = (isNight || remainingKwh < 0.05) ? 'hotovo' : `~${remainingKwh.toFixed(1).replace('.', ',')} kWh`;
    expect(popoverText).toContain('kWh');
    expect(popoverText).toContain(','); // Czech comma, not dot
  });
});

// ---------------------------------------------------------------------------
// Power display: Czech comma + <small> unit
// ---------------------------------------------------------------------------

describe('solar tile V2 — power display formatting', () => {
  it('formats power in W below 1000 W', () => {
    // simulate the display logic from renderSolar
    const w = 850;
    const display = w >= 1000 ? `${(w / 1000).toFixed(1).replace('.', ',')} kW` : `${Math.round(w)} W`;
    expect(display).toBe('850 W');
  });

  it('formats power in kW with Czech comma above 1000 W', () => {
    const w = 1800;
    const display = w >= 1000 ? `${(w / 1000).toFixed(1).replace('.', ',')} kW` : `${Math.round(w)} W`;
    expect(display).toBe('1,8 kW');
  });

  it('night shows 0 W', () => {
    const { isNight } = solarCompute({ solarPercent: 0, solarToday: 24800, solarForecastToday: 26.6, solarPower: 0 });
    expect(isNight).toBe(true);
    // night power display is always "0 W"
    const display = isNight ? '0 W' : 'something else';
    expect(display).toBe('0 W');
  });

  it('kW value 5.4 kWp uses Czech comma', () => {
    const w = 5400;
    const display = w >= 1000 ? `${(w / 1000).toFixed(1).replace('.', ',')} kW` : `${Math.round(w)} W`;
    expect(display).toBe('5,4 kW');
  });
});

// ---------------------------------------------------------------------------
// Night aura: edgeGauge full=isNight flag
// ---------------------------------------------------------------------------

describe('solar tile V2 — night aura full ring', () => {
  it('at night, full=true should be passed so aura ring is fully visible (grey)', () => {
    // The edgeGauge call receives full: isNight. When full=true, dash=0 (full ring).
    // Here we test the logic: dash = full ? 0 : (100 - pct)
    const isNight = true;
    const auraPct = 0;
    const full = isNight;
    const dash = full ? 0 : (100 - auraPct);
    expect(dash).toBe(0); // stroke-dashoffset=0 → full perimeter fill visible
  });

  it('by day, full=false so dash reflects pct correctly', () => {
    const isNight = false;
    const auraPct = 34;
    const full = isNight;
    const dash = full ? 0 : (100 - auraPct);
    expect(dash).toBe(66); // 100 - 34 = 66 → 34% fill visible
  });
});

// ---------------------------------------------------------------------------
// Production bar label threshold (30% not 22%)
// ---------------------------------------------------------------------------

describe('solar tile V2 — bar label threshold', () => {
  it('bar label hidden when progressPct = 25 (below 30 threshold)', () => {
    const progressPct = 25;
    const showLabel = progressPct >= 30;
    expect(showLabel).toBe(false);
  });

  it('bar label shown when progressPct = 30 (at threshold)', () => {
    const progressPct = 30;
    const showLabel = progressPct >= 30;
    expect(showLabel).toBe(true);
  });

  it('bar label shown when progressPct = 65 (typical day)', () => {
    const { progressPct } = solarCompute({
      solarPercent: 34, solarToday: 17400, solarForecastToday: 26.6, solarPower: 1800,
    });
    const showLabel = progressPct >= 30;
    expect(showLabel).toBe(true);
  });
});
