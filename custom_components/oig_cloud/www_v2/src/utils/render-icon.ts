import { html, type TemplateResult } from 'lit';
import { mdiIconPath } from './mdi-icons';
import { getIconEmoji } from './format';

/**
 * Render a tile/picker icon.
 * - `mdi:xxx` → real MDI <svg> (path from @mdi/js), inheriting size (1em) + color.
 * - unmapped `mdi:xxx` → emoji fallback (getIconEmoji).
 * - anything else (emoji / text) → rendered as-is.
 *
 * The host element styles `.oig-mdi` (width/height 1em, fill currentColor) and
 * sizes the icon via the container's font-size.
 */
export function renderIcon(icon: string | undefined | null): TemplateResult | string {
  if (!icon) return '';
  if (icon.startsWith('mdi:')) {
    const path = mdiIconPath(icon);
    return path
      ? html`<svg class="oig-mdi" viewBox="0 0 24 24" aria-hidden="true"><path d=${path}></path></svg>`
      : getIconEmoji(icon);
  }
  return icon;
}

/** Shared CSS for the inline MDI svg — include in each component's styles. */
export const OIG_MDI_CSS = `
  .oig-mdi { width: 1em; height: 1em; fill: currentColor; vertical-align: -0.125em; display: inline-block; }
`;
