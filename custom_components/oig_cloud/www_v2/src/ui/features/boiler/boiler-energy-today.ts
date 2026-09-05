import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import type { EnergyToday, PlanSummary } from './types';
import { t, type Lang } from '@/i18n/boiler';

const u = unsafeCSS;

// Mock rev3 palette
const MOCK = {
  water: '#4dd0e1', grid: '#3b82f6', fve: '#f0b429',
  battery: '#a78bfa', alt: '#ff8a50', idle: '#39415f',
  card: '#1b2340', card2: '#1f2848', line: '#2a3355',
  muted: '#8b93ad', dim: '#5c6480', text: '#e8ecf7',
} as const;

// ============================================================================
// Pure helpers — exported for unit tests
// ============================================================================

/**
 * Returns the Czech/English label for the alternative source.
 * F5: maps alt_source_type values from config to human-readable labels (R12).
 * Labels include an emoji for legacy callers.
 */
export function altTypeLabel(altType: string | null | undefined, lang: Lang): string {
  const map: Record<string, Record<Lang, string>> = {
    gas:        { cs: '🔥 Plyn',              en: '🔥 Gas' },
    heat_pump:  { cs: '🔥 Tepelné čerpadlo',  en: '🔥 Heat pump' },
    fireplace:  { cs: '🔥 Krb',               en: '🔥 Fireplace' },
    other:      { cs: '🔥 Alternativní zdroj', en: '🔥 Alternative source' },
  };
  if (altType && map[altType]) return map[altType][lang];
  return lang === 'en' ? '🔥 Alternative source' : '🔥 Alternativní zdroj';
}

export function altTypeLabelPlain(altType: string | null | undefined, lang: Lang): string {
  const map: Record<string, Record<Lang, string>> = {
    gas:        { cs: 'Plyn',              en: 'Gas' },
    heat_pump:  { cs: 'Tepelné čerpadlo',  en: 'Heat pump' },
    fireplace:  { cs: 'Krb',               en: 'Fireplace' },
    other:      { cs: 'Alternativní zdroj', en: 'Alternative source' },
  };
  if (altType && map[altType]) return map[altType][lang];
  return lang === 'en' ? 'Alternative source' : 'Alternativní zdroj';
}

export interface EnergySourceTile {
  key: 'fve' | 'grid' | 'alt' | 'battery';
  label: string;
  kwh: number;
  color: string;
  costLabel: string | null;
}

export function buildSourceTiles(
  energy: EnergyToday,
  lang: Lang,
  altType?: string | null,
): EnergySourceTile[] {
  const tiles: EnergySourceTile[] = [];

  tiles.push({
    key: 'fve',
    label: t('boiler.energy_today.source_fve_plain', lang),
    kwh: energy.fveKwh,
    color: MOCK.fve,
    costLabel: energy.fveKwh > 0 ? '≈ 0 Kč' : null,
  });

  tiles.push({
    key: 'grid',
    label: t('boiler.energy_today.source_grid_plain', lang),
    kwh: energy.gridKwh,
    color: MOCK.grid,
    costLabel: null,
  });

  if (energy.batteryKwh > 0.05) {
    tiles.push({
      key: 'battery',
      label: t('boiler.energy_today.source_battery_plain', lang),
      kwh: energy.batteryKwh,
      color: MOCK.battery,
      costLabel: null,
    });
  }

  if (energy.altKwh > 0) {
    tiles.push({
      key: 'alt',
      label: altTypeLabelPlain(altType, lang),
      kwh: energy.altKwh,
      color: MOCK.alt,
      costLabel: null,
    });
  }

  return tiles;
}

export interface PropBarSegment {
  pct: number;
  color: string;
  key: string;
}

export function buildPropBarSegments(
  energy: EnergyToday,
  tiles: EnergySourceTile[],
): PropBarSegment[] {
  const total = energy.totalKwh;
  if (!(total >= 0.1)) return [];
  const segments: PropBarSegment[] = tiles
    .filter(tile => tile.kwh > 0)
    .map(tile => ({
      pct: (tile.kwh / total) * 100,
      color: tile.color,
      key: tile.key,
    }));
  if (energy.unattributedKwh > 0.05) {
    segments.push({
      pct: (energy.unattributedKwh / total) * 100,
      color: MOCK.muted,
      key: 'unattributed',
    });
  }
  return segments;
}

export function computeSavingsLabel(
  planSummary: PlanSummary | null,
  lang: Lang,
): string | null {
  if (!planSummary) return null;
  const { estimatedCostCzk, costIfAllGrid } = planSummary;
  if (estimatedCostCzk == null || costIfAllGrid == null) return null;
  if (costIfAllGrid <= 0) return null;
  const savings = costIfAllGrid - estimatedCostCzk;
  if (savings < 0) return null;
  const prefix = t('boiler.energy_today.benchmark_savings', lang);
  return `${prefix} ${savings.toFixed(1).replace('.', ',')} Kč`;
}

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
  @property({ type: String }) altType: string | null = null;

  static styles = css`
    :host {
      display: block;
      font-family: ${u(CSS_VARS.fontFamily)};
    }

    .card {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 12px 14px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 0 0 10px;
      font-size: 13px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .card-header-meta {
      font-size: 10px;
      color: ${u(MOCK.muted)};
      font-weight: 400;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: ${u(MOCK.card2)};
      border-radius: 8px;
      padding: 5px 9px;
      min-width: 0;
    }

    .chip-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .chip-body {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .chip-label {
      font-size: 9px;
      color: ${u(MOCK.muted)};
      white-space: nowrap;
    }

    .chip-value {
      font-size: 12px;
      font-weight: 700;
      color: ${u(MOCK.text)};
    }

    .chip-cost {
      font-size: 9px;
      color: #4ade80;
      margin-left: 4px;
    }

    .prop-bar {
      display: flex;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 10px;
    }

    .benchmark {
      display: flex;
      gap: 10px;
      font-size: 10px;
      color: ${u(MOCK.muted)};
      flex-wrap: wrap;
      margin-top: 8px;
    }

    .benchmark strong { color: #4ade80; }

    .empty {
      font-size: 12px;
      color: ${u(MOCK.muted)};
      text-align: center;
      padding: 10px 0 2px;
    }
  `;

  render() {
    const lang = this.lang;
    const heading = t('boiler.energy_today.heading_plain', lang);
    const meta = t('boiler.energy_today.meta', lang);

    const energy = this.energy;
    const planSummary = this.planSummary;

    const tiles = energy ? buildSourceTiles(energy, lang, this.altType) : [];
    const total = energy?.totalKwh ?? 0;
    const isEmpty = total < 0.1;
    const barSegments = energy && !isEmpty ? buildPropBarSegments(energy, tiles) : [];

    const benchmarkCostGridRaw = planSummary?.costIfAllGrid ?? null;
    const benchmarkCostGrid =
      benchmarkCostGridRaw != null && benchmarkCostGridRaw > 0 ? benchmarkCostGridRaw : null;
    const savingsLabel = computeSavingsLabel(planSummary, lang);

    return html`
      <div class="card" data-testid="boiler-energy-today">
        <h2 class="card-header">
          ${heading}
          <span class="card-header-meta">${meta}</span>
        </h2>

        ${isEmpty ? html`
          <div class="empty">${t('boiler.energy_today.empty', lang)}</div>
        ` : html`
          <div class="chips" data-testid="energy-tiles">
            ${tiles.map(tile => html`
              <div class="chip" data-source="${tile.key}" data-testid="energy-tile-${tile.key}">
                <span class="chip-dot" style="background:${tile.color}"></span>
                <span class="chip-body">
                  <span class="chip-label">${tile.label}</span>
                  <span class="chip-value">${formatKwhLocale(tile.kwh)}</span>
                </span>
                ${tile.costLabel ? html`<span class="chip-cost">${tile.costLabel}</span>` : nothing}
              </div>
            `)}
          </div>

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
        `}

        ${benchmarkCostGrid != null || savingsLabel ? html`
          <div class="benchmark" data-testid="benchmark">
            ${benchmarkCostGrid != null ? html`
              <span>
                ${t('boiler.energy_today.benchmark_prefix', lang)} ${benchmarkCostGrid.toFixed(1).replace('.', ',')} Kč
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
