/**
 * OIG Cloud V2 — NT/VT schedule grid: pure hour-map <-> start-string logic.
 *
 * Port of `custom_components/oig_cloud/config/schema.py`'s
 * `_parse_hour_starts` / `_next_tariff_start` / `_fill_tariff_hours` /
 * `validate_tariff_hours` (schema.py:116-186) — the wizard grid must produce
 * exactly the hour_map the BE would compute from the same start strings, so
 * BE consumers (battery_forecast/utils_common.py `parse_tariff_times`,
 * analytics_sensor.py) see exactly what the user painted. NO Python change;
 * this module is read-only with respect to the BE contract.
 *
 * Grid <-> starts is an exact inverse of the BE algorithm for the general
 * (non-monochrome) case: every hour where the color differs from its
 * predecessor is, by construction, a "start" of the color it changes to —
 * `_fill_tariff_hours` fills forward from each start to the next start in
 * the combined sorted list, i.e. exactly one maximal same-color run. The one
 * case the transition scan cannot express is a monochrome day (zero
 * transitions) — that maps to the BE's own `allow_single_tariff` shortcut
 * (schema.py:130-131), used today for a weekend that is 100% one tariff
 * (registry default `tariff_nt_start_weekend="0"`,
 * `tariff_vt_start_weekend=""` — config_registry.py:544-549).
 */

export type Paint = 'VT' | 'NT';
export type DayGroup = 'weekday' | 'weekend';

const HOURS = 24;

/** Mirrors schema.py `_parse_hour_starts` — `null` signals a parse error. */
export function parseHourStarts(value: string): number[] | null {
  const trimmed = value.trim();
  if (trimmed === '') return [];
  const parts = trimmed.split(',').map((p) => p.trim()).filter((p) => p !== '');
  const hours: number[] = [];
  for (const p of parts) {
    if (!/^-?\d+$/.test(p)) return null;
    hours.push(Number(p));
  }
  if (hours.some((h) => h < 0 || h > 23)) return null;
  return hours;
}

/** Mirrors schema.py `_next_tariff_start`. */
function nextTariffStart(allStarts: number[], start: number): number {
  const idx = allStarts.indexOf(start);
  if (idx === -1) return (start + 1) % HOURS;
  const nextIdx = idx + 1;
  return nextIdx < allStarts.length ? allStarts[nextIdx] : allStarts[0];
}

/** Mirrors schema.py `_fill_tariff_hours`. Returns false on overlap. */
function fillTariffHours(
  hourMap: Map<number, Paint>,
  starts: number[],
  allStarts: number[],
  label: Paint,
): boolean {
  for (const start of [...starts].sort((a, b) => a - b)) {
    const next = nextTariffStart(allStarts, start);
    let h = start;
    let guard = 0;
    while (h !== next) {
      if (hourMap.has(h)) return false;
      hourMap.set(h, label);
      h = (h + 1) % HOURS;
      guard += 1;
      if (guard > HOURS) break;
    }
  }
  return true;
}

/**
 * Mirrors schema.py `validate_tariff_hours`'s hour_map construction for the
 * two-sided (non-single-tariff) case: both `vtStarts` and `ntStarts` must be
 * non-empty and must jointly cover all 24 hours with no overlap. Returns
 * `null` on any BE-equivalent failure (`tariff_gaps` / `overlapping_tariffs`).
 */
function buildHourMapTwoSided(vtStarts: number[], ntStarts: number[]): Paint[] | null {
  if (vtStarts.length === 0 || ntStarts.length === 0) return null;
  const all = [...vtStarts, ...ntStarts].sort((a, b) => a - b);
  const hourMap = new Map<number, Paint>();
  if (!fillTariffHours(hourMap, vtStarts, all, 'VT')) return null;
  if (!fillTariffHours(hourMap, ntStarts, all, 'NT')) return null;
  if (hourMap.size !== HOURS) return null;
  const grid: Paint[] = [];
  for (let h = 0; h < HOURS; h += 1) {
    const p = hourMap.get(h);
    if (!p) return null;
    grid.push(p);
  }
  return grid;
}

/**
 * strings -> grid (seed direction). Permissive: used to display whatever the
 * BE already has stored, which — having passed BE validation at save time —
 * is assumed well-formed. `allowSingleTariff=true` additionally accepts one
 * side being empty as "the whole day is the other tariff" (the weekend
 * single-tariff shortcut, schema.py:130-131); `false` requires both starts
 * non-empty (weekday, schema.py:2325 calls `validate_tariff_hours` with the
 * default `allow_single_tariff=False`).
 */
export function stringsToGrid(
  vtStartsStr: string,
  ntStartsStr: string,
  allowSingleTariff: boolean,
): Paint[] | null {
  const vtStarts = parseHourStarts(vtStartsStr);
  const ntStarts = parseHourStarts(ntStartsStr);
  if (vtStarts === null || ntStarts === null) return null;
  if (vtStarts.length === 0 && ntStarts.length === 0) return null;
  if (allowSingleTariff) {
    if (vtStarts.length === 0) return Array<Paint>(HOURS).fill('NT');
    if (ntStarts.length === 0) return Array<Paint>(HOURS).fill('VT');
  } else if (vtStarts.length === 0 || ntStarts.length === 0) {
    return null;
  }
  return buildHourMapTwoSided(vtStarts, ntStarts);
}

/** grid -> starts. A monochrome grid maps to the single-tariff-shortcut
 * convention (`["0"]` for the present color, `[]` for the absent one) — same
 * shape as the registry default for a 100%-NT weekend. */
function gridToStarts(grid: readonly Paint[]): { vt: number[]; nt: number[] } {
  if (grid.every((p) => p === 'VT')) return { vt: [0], nt: [] };
  if (grid.every((p) => p === 'NT')) return { vt: [], nt: [0] };
  const vt: number[] = [];
  const nt: number[] = [];
  for (let h = 0; h < HOURS; h += 1) {
    const prev = grid[(h + HOURS - 1) % HOURS];
    if (grid[h] !== prev) (grid[h] === 'VT' ? vt : nt).push(h);
  }
  return { vt, nt };
}

function gridsEqual(a: readonly Paint[], b: readonly Paint[]): boolean {
  return a.length === b.length && a.every((p, i) => p === b[i]);
}

/**
 * grid -> strings (persist direction). Validates on save: reconstructs the
 * grid from the derived starts via the same BE-equivalent algorithm and
 * requires identity — this is the "is the painted pattern expressible"
 * check the wizard blocks save on (owner brief §4). `allowSingleTariff=false`
 * additionally rejects a monochrome result outright (weekday must keep both
 * tariffs, matching schema.py's non-single validation path). Returns `null`
 * when the pattern cannot be saved.
 */
export function gridToStrings(
  grid: readonly Paint[],
  allowSingleTariff: boolean,
): { vt: string; nt: string } | null {
  if (grid.length !== HOURS) return null;
  const { vt, nt } = gridToStarts(grid);
  if (!allowSingleTariff && (vt.length === 0 || nt.length === 0)) return null;
  const vtStr = vt.join(',');
  const ntStr = nt.join(',');
  const reconstructed = stringsToGrid(vtStr, ntStr, allowSingleTariff);
  if (!reconstructed || !gridsEqual(reconstructed, grid)) return null;
  return { vt: vtStr, nt: ntStr };
}

/** CZ interval summary, e.g. "NT: 22:00-06:00, 13:00-15:00" — the live
 * summary line + diff-hint text (owner brief §4). Reports NT intervals only
 * (unpainted = VT, per the grid's own legend). */
export function summarizeNtIntervals(grid: readonly Paint[]): string {
  const fmt = (h: number): string => `${String(h % 24).padStart(2, '0')}:00`;
  if (grid.every((p) => p === 'NT')) return 'NT: 00:00-24:00 (celý den)';
  if (grid.every((p) => p === 'VT')) return 'NT: žádné (celý den VT)';
  const { nt } = gridToStarts(grid);
  const blocks = [...nt].sort((a, b) => a - b).map((start) => {
    let end = (start + 1) % HOURS;
    while (grid[end] === 'NT' && end !== start) end = (end + 1) % HOURS;
    return { start, end };
  });
  // Midnight-wrapping block (end <= start) reads first — matches how an
  // overnight NT window is naturally described ("22:00-06:00" before a
  // same-day "13:00-15:00"), per the owner brief's own example.
  blocks.sort((a, b) => {
    const aWraps = a.end <= a.start ? 0 : 1;
    const bWraps = b.end <= b.start ? 0 : 1;
    return aWraps !== bWraps ? aWraps - bWraps : a.start - b.start;
  });
  return `NT: ${blocks.map((b) => `${fmt(b.start)}-${fmt(b.end)}`).join(', ')}`;
}
