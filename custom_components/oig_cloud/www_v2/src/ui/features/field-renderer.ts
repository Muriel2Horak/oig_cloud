/**
 * OIG Cloud V2 — shared field renderer/presenter (F1 Plan 3.6, Task 1).
 *
 * Extracted from `settings/index.ts` `renderField`/`renderFieldDisableable`
 * (:643-780 pre-extraction). `renderFieldPresenter` is PURE — no closures
 * over any component `this` — so both `oig-settings` and
 * `oig-onboarding-wizard` can call it with an explicit context object.
 */

import { html, css, unsafeCSS, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { CSS_VARS } from '@/ui/theme';
import type { EntityEntry } from '@/ui/components/entity-picker';
import '@/ui/components/entity-picker';
import type { FieldDef } from '@/ui/features/settings';

const u = unsafeCSS;

export interface FieldPresenterContext {
  value: unknown;
  dirty: boolean;
  secretSet: boolean;
  onChange: (v: unknown) => void;
  entityCatalog: EntityEntry[];
  /** Bool fields only: force-unchecked, greyed out, non-interactive. */
  disabled?: boolean;
  /**
   * Review-mode snapshot value (UX-SPEC §3) — `undefined` means "nothing to
   * compare against" (new install, or a secret field, whose real value never
   * reaches the client). Drives the diff hint below the control.
   */
  originalValue?: unknown;
  /**
   * True only inside the review-mode wizard. Gates the secret diff hint, which
   * cannot key off `originalValue` (a secret's real value never reaches the
   * client), so without this flag it would leak into the plain settings UI on
   * any dirty secret edit. Non-secret hints are already gated by `originalValue`.
   */
  reviewMode?: boolean;
  /**
   * Design rev 3 content fix (d) — a set secret collapses to a green
   * "✓ nastaveno · Změnit" badge instead of an always-editable password
   * input. Opt-in via `onRevealSecret`: only callers that pass it get the
   * badge; omitting it (the settings tab) keeps the original always-input
   * behaviour untouched, so this is additive, not a shared-component
   * behaviour change for non-wizard callers.
   */
  secretRevealed?: boolean;
  onRevealSecret?: () => void;
}

/** Render label text with optional "(volitelné)" suffix and hint below. */
function renderLabel(f: FieldDef): TemplateResult {
  return html`
    <span class="lab">
      ${f.label}${f.optional ? html`<span class="optional-badge"> (volitelné)</span>` : nothing}
      ${f.hint ? html`<span class="hint">${f.hint}</span>` : nothing}
    </span>`;
}

/** Scale-aware display string for a field's value — the same rounding the
 * number branch already applies (`:72` pre-extraction), reused as the diff
 * hint's comparison basis so a raw/display mismatch (e.g. scale rounding)
 * never produces a spurious "X → X" row. */
function formatFieldValue(f: FieldDef, value: unknown): string {
  if (f.type === 'bool') return value ? 'Zapnuto' : 'Vypnuto';
  if (value == null || value === '') return '—';
  if (f.type === 'number') {
    const scale = f.scale ?? 1;
    return String(Math.round((Number(value) * scale + Number.EPSILON) * 10000) / 10000);
  }
  if (f.type === 'select') {
    const opt = (f.options ?? []).find(([v]) => v === String(value));
    return opt ? opt[1] : String(value);
  }
  return String(value);
}

/**
 * Per-field diff hint (UX-SPEC §3/§6, "Bylo: X → Nyní: Y") — rendered inline
 * directly under the control, never a modal/toast/summary-only surface. A
 * secret field's real value never reaches the client (backend only emits a
 * `{key}_set` flag), so it is gated on `dirty` instead of a value compare and
 * never shows the raw string either side of the arrow.
 */
function renderDiffHint(f: FieldDef, ctx: FieldPresenterContext): TemplateResult | typeof nothing {
  if (f.secret) {
    if (!ctx.reviewMode || !ctx.dirty) return nothing;
    return html`<span class="diff-hint" data-testid="diff-hint">Bylo: (nastaveno) → Nyní: (změněno)</span>`;
  }
  if (ctx.originalValue === undefined) return nothing;
  const oldText = formatFieldValue(f, ctx.originalValue);
  const newText = formatFieldValue(f, ctx.value);
  if (oldText === newText) return nothing;
  return html`<span class="diff-hint" data-testid="diff-hint">Bylo: ${oldText} → Nyní: ${newText}</span>`;
}

export function renderFieldPresenter(f: FieldDef, ctx: FieldPresenterContext): TemplateResult {
  const { value: raw, dirty, secretSet, onChange, entityCatalog, disabled } = ctx;

  if (f.type === 'bool') {
    const checked = !disabled && !!raw;
    return html`
      <div class="row" style=${disabled ? 'opacity:0.45;pointer-events:none' : ''}>
        ${renderLabel(f)}
        <div class="row-control">
          <label class="switch">
            <input type="checkbox" .checked=${checked} ?disabled=${!!disabled}
              @change=${(e: Event) => onChange((e.target as HTMLInputElement).checked)} />
            <span class="slider"></span>
          </label>
        </div>
        ${renderDiffHint(f, ctx)}
      </div>`;
  }

  if (f.type === 'select') {
    const val = String(raw ?? '');
    return html`
      <div class="row">
        ${renderLabel(f)}
        <div class="row-control">
          <select class=${dirty ? 'dirty' : ''}
            @change=${(e: Event) => onChange((e.target as HTMLSelectElement).value)}>
            ${(f.options ?? []).map(([v, l]) => html`<option value=${v} ?selected=${v === val}>${l}</option>`)}
          </select>
        </div>
        ${renderDiffHint(f, ctx)}
      </div>`;
  }

  if (f.type === 'number') {
    const scale = f.scale ?? 1;
    const shown = raw == null || raw === '' ? '' : String(Math.round((Number(raw) * scale + Number.EPSILON) * 10000) / 10000);
    return html`
      <div class="row">
        ${renderLabel(f)}
        <div class="row-control">
          <input type="number" class=${dirty ? 'dirty' : ''} .value=${shown}
            min=${f.min ?? nothing} max=${f.max ?? nothing} step=${f.step ?? nothing}
            @change=${(e: Event) => {
              const v = (e.target as HTMLInputElement).value;
              if (v === '') return;
              onChange(Number(v) / scale);
            }} />
        </div>
        ${renderDiffHint(f, ctx)}
      </div>`;
  }

  // text — may be entity field or plain text / secret
  if (f.entity) {
    const currentVal = String(raw ?? '');
    return html`
      <div class="row">
        ${renderLabel(f)}
        <div class="row-control">
          <oig-entity-picker
            .value=${currentVal}
            .domain=${f.entity.domain}
            .optional=${!!f.optional}
            .dirty=${dirty}
            .entities=${entityCatalog}
            @entity-change=${(e: CustomEvent) => onChange(e.detail.value)}
          ></oig-entity-picker>
        </div>
        ${renderDiffHint(f, ctx)}
      </div>`;
  }

  // Plain text (secret or non-entity)
  const isSecret = f.secret ?? f.key.endsWith('api_key');

  if (isSecret && secretSet && ctx.onRevealSecret && !ctx.secretRevealed) {
    return html`
      <div class="row">
        ${renderLabel(f)}
        <div class="row-control">
          <span class="secret-badge" data-testid="secret-badge">
            <span aria-hidden="true">✓</span> nastaveno
            <button
              type="button"
              class="secret-badge-change"
              data-testid="secret-badge-change"
              @click=${() => ctx.onRevealSecret!()}
            >Změnit</button>
          </span>
        </div>
        ${renderDiffHint(f, ctx)}
      </div>`;
  }

  const val = isSecret ? '' : String(raw ?? '');
  const placeholder = isSecret
    ? (secretSet
        // Revealed-to-edit (wizard, after "Změnit") vs. the original
        // always-input surface (settings tab, no reveal flow) — same
        // set-but-unedited fact, different phrasing per surface.
        ? (ctx.onRevealSecret ? '(zadejte novou hodnotu)' : '••••• (nastaveno)')
        : 'nenastaveno')
    : (f.optional ? 'nevyplněno' : '');
  return html`
    <div class="row">
      ${renderLabel(f)}
      <div class="row-control">
        <input type=${isSecret ? 'password' : 'text'} class=${dirty ? 'dirty' : ''} .value=${val}
          placeholder=${placeholder}
          @change=${(e: Event) => onChange((e.target as HTMLInputElement).value)} />
      </div>
      ${renderDiffHint(f, ctx)}
    </div>`;
}

/**
 * Shared row/label/control/input CSS — extracted from `settings/index.ts`
 * (:301-361 pre-extraction). Included in both `oig-settings` and
 * `oig-onboarding-wizard` `static styles`.
 */
export const fieldStyles = css`
  /* ---- Rows ---- */
  .row {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px dashed ${u(CSS_VARS.divider)};
  }
  .row:last-of-type { border-bottom: none; }

  /* Review-mode diff hint (UX-SPEC §3/§6) — full-width, directly under the
     control, muted like the existing field-help .hint treatment. */
  .diff-hint {
    flex-basis: 100%;
    display: block;
    font-size: 10.5px;
    color: ${u(CSS_VARS.textSecondary)};
    margin-top: 2px;
    line-height: 1.4;
  }

  .lab {
    font-size: 12.5px;
    color: ${u(CSS_VARS.textPrimary)};
    flex: 1;
    min-width: 0;
  }

  .hint {
    display: block;
    font-size: 10.5px;
    color: ${u(CSS_VARS.textSecondary)};
    margin-top: 3px;
    line-height: 1.4;
  }

  .optional-badge {
    font-size: 10px;
    color: ${u(CSS_VARS.textSecondary)};
    font-style: italic;
    margin-left: 2px;
  }

  .row-control {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  input[type='number'], input[type='text'], input[type='password'], select {
    background: ${u(CSS_VARS.bgSecondary)};
    color: ${u(CSS_VARS.textPrimary)};
    border: 1px solid ${u(CSS_VARS.divider)};
    border-radius: 7px;
    padding: 5px 8px;
    font-size: 12.5px;
    max-width: 120px;
  }
  input[type='text'], input[type='password'] { max-width: 170px; }
  input.dirty, select.dirty { border-color: ${u(CSS_VARS.accent)}; }
  select option {
    background: ${u(CSS_VARS.bgSecondary)};
    color: ${u(CSS_VARS.textPrimary)};
  }

  /* toggle */
  .switch { position: relative; width: 40px; height: 22px; flex-shrink: 0; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider {
    position: absolute; inset: 0; cursor: pointer; border-radius: 11px;
    background: rgba(255,255,255,0.15); transition: 0.2s;
  }
  .slider:before {
    content: ''; position: absolute; width: 16px; height: 16px;
    left: 3px; top: 3px; border-radius: 50%; background: #fff; transition: 0.2s;
  }
  .switch input:checked + .slider { background: ${u(CSS_VARS.accent)}; }
  .switch input:checked + .slider:before { transform: translateX(18px); }
`;
