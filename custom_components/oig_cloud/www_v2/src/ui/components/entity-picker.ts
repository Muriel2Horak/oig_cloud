/**
 * OIG Cloud V2 — <oig-entity-picker> reusable component.
 *
 * Searchable dropdown for selecting a HA entity by entity_id or friendly_name.
 * - Filters by domain prefix (e.g. 'sensor.', 'switch.')
 * - Keyboard: arrows + enter select, esc closes
 * - Optional fields show a clear (×) button → empty string value
 * - Matches on entity_id AND friendly_name (case/diacritics-insensitive)
 * - Max 50 results, prefix matches ranked first
 */

import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';

const u = unsafeCSS;

// ============================================================================
// PURE HELPER TYPES & FUNCTIONS — exported for unit tests
// ============================================================================

export interface EntityEntry {
  entity_id: string;
  friendly_name: string;
}

/**
 * Build a normalized search key for a string — lowercased, diacritics removed.
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Filter entities by domain prefix and search query.
 * Returns max `maxResults` entries, prefix matches first.
 *
 * @param entities  Full entity catalog.
 * @param domain    Domain prefix to filter on (e.g. 'sensor', 'switch'). Empty = no filter.
 * @param query     User-typed search string (may be empty).
 * @param maxResults Cap on results (default 50).
 */
export function filterEntities(
  entities: EntityEntry[],
  domain: string,
  query: string,
  maxResults = 50,
): EntityEntry[] {
  const normQ = normalize(query.trim());
  const domainPrefix = domain ? `${domain}.` : '';

  const filtered = entities.filter((e) => {
    if (domainPrefix && !e.entity_id.startsWith(domainPrefix)) return false;
    if (!normQ) return true;
    return normalize(e.entity_id).includes(normQ) || normalize(e.friendly_name).includes(normQ);
  });

  if (!normQ) return filtered.slice(0, maxResults);

  // Rank: prefix matches on entity_id first, then friendly_name prefix, then rest
  const prefixId: EntityEntry[] = [];
  const prefixFn: EntityEntry[] = [];
  const rest: EntityEntry[] = [];

  for (const e of filtered) {
    const normId = normalize(e.entity_id);
    const normFn = normalize(e.friendly_name);
    if (normId.startsWith(normQ) || normId.includes(`.${normQ}`)) {
      prefixId.push(e);
    } else if (normFn.startsWith(normQ)) {
      prefixFn.push(e);
    } else {
      rest.push(e);
    }
  }

  return [...prefixId, ...prefixFn, ...rest].slice(0, maxResults);
}

/**
 * Resolve the display name for a given entity_id from the catalog.
 * Returns friendly_name if found, entity_id otherwise.
 */
export function resolveDisplayName(
  entityId: string,
  entities: EntityEntry[],
): string {
  if (!entityId) return '';
  const found = entities.find((e) => e.entity_id === entityId);
  return found?.friendly_name && found.friendly_name !== entityId
    ? found.friendly_name
    : entityId;
}

// ============================================================================
// BUILD CATALOG — converts hass.states to EntityEntry[]
// ============================================================================

/**
 * Build a flat catalog of EntityEntry from hass.states.
 * Call once per component open (or per hass refresh), not per keystroke.
 */
export function buildEntityCatalog(hassStates: Record<string, any>): EntityEntry[] {
  return Object.entries(hassStates ?? {}).map(([entity_id, state]) => ({
    entity_id,
    friendly_name: (state?.attributes?.friendly_name as string | undefined) ?? entity_id,
  }));
}

// ============================================================================
// COMPONENT
// ============================================================================

@customElement('oig-entity-picker')
export class OigEntityPicker extends LitElement {
  /** Currently selected entity_id (bound value). */
  @property({ type: String }) value = '';
  /** Domain to filter on (e.g. 'sensor', 'switch'). Empty = show all. */
  @property({ type: String }) domain = '';
  /** Whether the field is optional (show × clear button). */
  @property({ type: Boolean }) optional = false;
  /** Pre-built entity catalog (from buildEntityCatalog). */
  @property({ attribute: false }) entities: EntityEntry[] = [];
  /** Whether the field is dirty (pending edit). */
  @property({ type: Boolean }) dirty = false;
  /** Placeholder shown when empty and optional. */
  @property({ type: String }) placeholder = 'nevyplněno';

  @state() private open = false;
  @state() private query = '';
  @state() private highlightIndex = -1;

  static styles = css`
    :host { display: block; position: relative; }

    .picker-wrap {
      position: relative;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .picker-input {
      background: ${u(CSS_VARS.bgSecondary)};
      color: ${u(CSS_VARS.textPrimary)};
      border: 1px solid ${u(CSS_VARS.divider)};
      border-radius: 7px;
      padding: 5px 8px;
      font-size: 12.5px;
      width: 170px;
      cursor: pointer;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      box-sizing: border-box;
    }

    .picker-input.dirty {
      border-color: ${u(CSS_VARS.accent)};
    }

    .picker-input.open {
      border-color: ${u(CSS_VARS.accent)};
      border-radius: 7px 7px 0 0;
    }

    .clear-btn {
      border: none;
      background: transparent;
      color: ${u(CSS_VARS.textSecondary)};
      cursor: pointer;
      font-size: 15px;
      padding: 0 2px;
      line-height: 1;
      flex-shrink: 0;
    }

    .clear-btn:hover { color: ${u(CSS_VARS.textPrimary)}; }

    .dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      width: 300px;
      max-height: 280px;
      overflow-y: auto;
      background: ${u(CSS_VARS.cardBg)};
      border: 1px solid ${u(CSS_VARS.accent)};
      border-radius: 0 0 8px 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      z-index: 999;
      display: flex;
      flex-direction: column;
    }

    .search-box {
      padding: 6px 8px;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
      background: ${u(CSS_VARS.bgSecondary)};
      flex-shrink: 0;
    }

    .search-box input {
      width: 100%;
      background: ${u(CSS_VARS.bgSecondary)};
      color: ${u(CSS_VARS.textPrimary)};
      border: none;
      outline: none;
      font-size: 12px;
      padding: 2px 4px;
      box-sizing: border-box;
    }

    .option-list {
      overflow-y: auto;
      flex: 1;
    }

    .option {
      padding: 6px 10px;
      cursor: pointer;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .option:last-of-type { border-bottom: none; }

    .option:hover,
    .option.hl {
      background: rgba(3, 169, 244, 0.12);
    }

    .opt-name {
      font-size: 12.5px;
      color: ${u(CSS_VARS.textPrimary)};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .opt-id {
      font-size: 10.5px;
      color: ${u(CSS_VARS.textSecondary)};
      font-family: monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .opt-none {
      padding: 6px 10px;
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
      font-style: italic;
    }

    .empty-msg {
      padding: 10px;
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
      text-align: center;
    }
  `;

  private get results(): EntityEntry[] {
    return filterEntities(this.entities, this.domain, this.query);
  }

  private get displayValue(): string {
    if (!this.value) return '';
    return resolveDisplayName(this.value, this.entities);
  }

  private openDropdown(): void {
    this.open = true;
    this.query = '';
    this.highlightIndex = -1;
    // Focus search input on next frame
    requestAnimationFrame(() => {
      const inp = this.shadowRoot?.querySelector<HTMLInputElement>('.search-box input');
      inp?.focus();
    });
  }

  private closeDropdown(): void {
    this.open = false;
    this.query = '';
    this.highlightIndex = -1;
  }

  private selectEntity(entityId: string): void {
    this.closeDropdown();
    if (entityId !== this.value) {
      this.value = entityId;
      this.dispatchEvent(new CustomEvent('entity-change', {
        detail: { value: entityId },
        bubbles: true,
        composed: true,
      }));
    }
  }

  private clearValue(e: MouseEvent): void {
    e.stopPropagation();
    this.selectEntity('');
  }

  private onInputClick(): void {
    if (this.open) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  private onSearchInput(e: Event): void {
    this.query = (e.target as HTMLInputElement).value;
    this.highlightIndex = -1;
  }

  private onSearchKeydown(e: KeyboardEvent): void {
    const results = this.results;
    if (e.key === 'Escape') {
      this.closeDropdown();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.highlightIndex = Math.min(this.highlightIndex + 1, results.length - 1);
      this.scrollHighlightedIntoView();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.highlightIndex = Math.max(this.highlightIndex - 1, -1);
      this.scrollHighlightedIntoView();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (this.highlightIndex >= 0 && this.highlightIndex < results.length) {
        this.selectEntity(results[this.highlightIndex].entity_id);
      }
      return;
    }
  }

  private scrollHighlightedIntoView(): void {
    requestAnimationFrame(() => {
      const list = this.shadowRoot?.querySelector('.option-list');
      const hl = list?.querySelector<HTMLElement>('.option.hl');
      hl?.scrollIntoView({ block: 'nearest' });
    });
  }

  render() {
    const displayVal = this.displayValue;
    const results = this.open ? this.results : [];

    return html`
      <div class="picker-wrap">
        <div
          class="picker-input ${this.dirty ? 'dirty' : ''} ${this.open ? 'open' : ''}"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded=${this.open}
          tabindex="0"
          title=${this.value || ''}
          @click=${this.onInputClick}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.onInputClick(); }
            if (e.key === 'Escape') this.closeDropdown();
          }}
        >
          ${displayVal || html`<span style="color:${CSS_VARS.textSecondary};opacity:0.6">${this.optional ? this.placeholder : '— vyberte —'}</span>`}
        </div>
        ${this.optional && this.value
          ? html`<button class="clear-btn" title="Vymazat" @click=${this.clearValue} tabindex="-1">×</button>`
          : nothing}
        ${this.open ? html`
          <div class="dropdown" role="listbox">
            <div class="search-box">
              <input
                type="text"
                .value=${this.query}
                placeholder="Hledat entitu…"
                autocomplete="off"
                @input=${this.onSearchInput}
                @keydown=${this.onSearchKeydown}
              />
            </div>
            <div class="option-list">
              ${this.optional ? html`
                <div class="option opt-none" @click=${() => this.selectEntity('')}>— žádné —</div>
              ` : nothing}
              ${results.length === 0 && this.query
                ? html`<div class="empty-msg">Žádné entity nenalezeny</div>`
                : results.map((e, i) => html`
                  <div
                    class="option ${i === this.highlightIndex ? 'hl' : ''}"
                    role="option"
                    @click=${() => this.selectEntity(e.entity_id)}
                    @mouseenter=${() => { this.highlightIndex = i; }}
                  >
                    <span class="opt-name">${e.friendly_name !== e.entity_id ? e.friendly_name : e.entity_id}</span>
                    ${e.friendly_name !== e.entity_id ? html`<span class="opt-id">${e.entity_id}</span>` : nothing}
                  </div>
                `)
              }
            </div>
          </div>
        ` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-entity-picker': OigEntityPicker;
  }
}
