// ============================================================================
// ⚡ Z čeho se bojler nabil — dnes  (F4 / Task C)
// ============================================================================
//
// Component: oig-boiler-energy-today
// Shows today's energy breakdown: source tiles, stacked proportion bar,
// benchmark line (cost_if_all_grid → savings).
// ============================================================================

import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import type { EnergyToday, PlanSummary } from './types';
import { t, type Lang } from '@/i18n/boiler';

const u = unsafeCSS;

// ============================================================================
// Pure helpers — exported for unit tests
// ============================================================================

/**
 * Returns the Czech/English label for the alternative source.
 * F5: maps alt_source_type values from config to human-readable labels (R12).
 * Labels are intentionally short for UI chips and plan-strip legends.
 */
export function altTypeLabel(altType: string | null | undefined, lang: Lang): string {
  const map: Record<string, Record<Lang, string>> = {
    gas:        { cs: '🔥 Plyn',              en: '🔥 Gas' },
    heat_pump:  { cs: '🔥 Tepelné čerpadlo',  en: '🔥 Heat pump' },
    fireplace:  { cs: '🔥 Krb',               en: '🔥 Fireplace' },
    other:      { cs: '🔥 Alternativní zdroj', en: '🔥 Alternative source' },
  };
  if (altType && map[altType]) return map[altType][lang];
  // Generic fallback per R12
  return lang === 'en' ? '🔥 Alternative source' : '🔥 Alternativní zdroj';
}

export interface EnergySourceTile {
  key: 'fve' | 'grid' | 'alt' | 'battery';
  label: string;
  kwh: number;
  color: string;
  /** Optional cost string — only present when derivable */
  costLabel: string | null;
}

/**
 * Build the list of source tiles to display.
 * Rules:
 * - FVE + Síť always shown (even at 0) for context.
 * - Alt shown only when altKwh > 0 (no capability flag available at FE yet).
 * - Battery shown only when batteryKwh > 0.05.
 * Order: FVE, Grid, Battery, Alt (matches mockup left-to-right order).
 */
export function buildSourceTiles(
  energy: EnergyToday,
  lang: Lang,
  altType?: string | null,
): EnergySourceTile[] {
  const tiles: EnergySourceTile[] = [];

  // FVE — always shown
  tiles.push({
    key: 'fve',
    label: t('boiler.energy_today.source_fve', lang),
    kwh: energy.fveKwh,
    color: '#ffa726',
    costLabel: energy.fveKwh > 0 ? '≈ 0 Kč' : null,
  });

  // Grid — always shown
  tiles.push({
    key: 'grid',
    label: t('boiler.energy_today.source_grid', lang),
    kwh: energy.gridKwh,
    color: '#2196f3',
    costLabel: null, // cost per kWh unknown at FE level
  });

  // Battery — only when > 0.05
  if (energy.batteryKwh > 0.05) {
    tiles.push({
      key: 'battery',
      label: t('boiler.energy_today.source_battery', lang),
      kwh: energy.batteryKwh,
      color: '#7e57c2',
      costLabel: null,
    });
  }

  // Alt — only when > 0
  if (energy.altKwh > 0) {
    tiles.push({
      key: 'alt',
      label: altTypeLabel(altType, lang),
      kwh: energy.altKwh,
      color: '#e64a19',
      costLabel: null,
    });
  }

  return tiles;
}

/**
 * Compute savings string: "→ plán šetří X Kč" when both cost fields present.
 * Returns null when data is insufficient.
 */
export function computeSavingsLabel(
  planSummary: PlanSummary | null,
  lang: Lang,
): string | null {
  if (!planSummary) return null;
  const { estimatedCostCzk, costIfAllGrid } = planSummary;
  if (estimatedCostCzk == null || costIfAllGrid == null) return null;
  // costIfAllGrid <= 0 means slots are unpriced (e.g. input_stale_price right
  // after a restart) — a "0.0 Kč" benchmark is noise, not information.
  if (costIfAllGrid <= 0) return null;
  const savings = costIfAllGrid - estimatedCostCzk;
  if (savings < 0) return null;
  const prefix = t('boiler.energy_today.benchmark_savings', lang);
  return `${prefix} ${savings.toFixed(1)} Kč`;
}

/**
 * Format kWh value with Czech locale comma: "2,1 kWh"
 */
export function formatKwhLocale(v: number): string {
  return `${v.toFixed(1).replace('.', ',')} kWh`;
}

// ============================================================================
// Component
// ============================================================================

@customElement('oig-boiler-energy-today')
export class OigBoilerEnergyToday extends LitElement {
  @property({ type: Object }) energy: EnergyToday | null = null;
  @property({ type: Object }) planSummary: PlanSummary | null = null;
  @property({ type: String }) lang: Lang = 'cs';
  /** F5: alt type string (e.g. 'gas'). Undefined = generic label. */
  @property({ type: String }) altType: string | null = null;

  static styles = css`
    :host {
      display: block;
    }

    .card {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: 0 6px 18px rgba(0,0,0,.35);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 0 0 10px;
      font-size: 13px;
    }

    .card-header-meta {
      font-size: 10.5px;
      opacity: 0.55;
      font-weight: 400;
    }

    /* Source tiles grid */
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 10px;
      margin-bottom: 8px;
    }

    .tile {
      background: rgba(255,255,255,.05);
      border-radius: 9px;
      padding: 8px 10px;
      text-align: center;
    }

    .tile-label {
      font-size: 10px;
      opacity: 0.65;
      display: block;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tile-kwh {
      display: block;
      font-size: 16px;
      font-weight: 800;
    }

    .tile-czk {
      font-size: 10.5px;
      font-weight: 600;
      margin-top: 2px;
      display: block;
    }

    /* Proportion bar */
    .prop-bar {
      display: flex;
      height: 9px;
      border-radius: 5px;
      overflow: hidden;
      margin-bottom: 6px;
    }

    /* Benchmark legend */
    .benchmark {
      display: flex;
      gap: 12px;
      font-size: 10px;
      opacity: 0.85;
      flex-wrap: wrap;
    }

    .benchmark-text {
      opacity: 0.6;
    }

    /* Empty state */
    .empty {
      font-size: 12px;
      opacity: 0.55;
      text-align: center;
      padding: 12px 0 4px;
    }
  `;

  render() {
    const lang = this.lang;
    const heading = t('boiler.energy_today.heading', lang);
    const meta = t('boiler.energy_today.meta', lang);

    const energy = this.energy;
    const planSummary = this.planSummary;

    // Compute tiles
    const tiles = energy ? buildSourceTiles(energy, lang, this.altType) : [];
    const total = energy?.totalKwh ?? 0;
    const isEmpty = total < 0.1;

    // Proportion bar segments
    const barSegments = isEmpty ? [] : tiles
      .filter(tile => tile.kwh > 0)
      .map(tile => ({
        pct: (tile.kwh / total) * 100,
        color: tile.color,
        key: tile.key,
      }));

    // Benchmark
    const benchmarkCostGridRaw = planSummary?.costIfAllGrid ?? null;
    // Hide the benchmark entirely when slots are unpriced (0/negative).
    const benchmarkCostGrid =
      benchmarkCostGridRaw != null && benchmarkCostGridRaw > 0 ? benchmarkCostGridRaw : null;
    const savingsLabel = computeSavingsLabel(planSummary, lang);

    return html`
      <div class="card">
        <h2 class="card-header">
          ${heading}
          <span class="card-header-meta">${meta}</span>
        </h2>

        ${isEmpty ? html`
          <div class="empty">${t('boiler.energy_today.empty', lang)}</div>
        ` : html`
          <div class="tiles" data-testid="energy-tiles">
            ${tiles.map(tile => html`
              <div class="tile" data-source="${tile.key}" data-testid="energy-tile-${tile.key}">
                <span class="tile-label">${tile.label}</span>
                <b class="tile-kwh">${formatKwhLocale(tile.kwh)}</b>
                ${tile.costLabel ? html`<span class="tile-czk" style="color:#9fe6a8">${tile.costLabel}</span>` : nothing}
              </div>
            `)}
          </div>
        `}

        ${barSegments.length > 0 ? html`
          <div class="prop-bar" data-testid="prop-bar">
            ${barSegments.map(seg => html`
              <span
                style="width:${seg.pct.toFixed(1)}%;background:${seg.color}"
                data-source="${seg.key}"
              ></span>
            `)}
          </div>
        ` : nothing}

        ${benchmarkCostGrid != null || savingsLabel ? html`
          <div class="benchmark" data-testid="benchmark">
            ${benchmarkCostGrid != null ? html`
              <span class="benchmark-text">
                ${t('boiler.energy_today.benchmark_prefix', lang)} ${benchmarkCostGrid.toFixed(1)} Kč
                ${savingsLabel ? html`<strong> ${savingsLabel}</strong>` : nothing}
              </span>
            ` : nothing}
          </div>
        ` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-energy-today': OigBoilerEnergyToday;
  }
}
