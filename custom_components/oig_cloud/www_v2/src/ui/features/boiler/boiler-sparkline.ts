import { LitElement, html, css, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('oig-boiler-sparkline')
export class OigBoilerSparkline extends LitElement {
  @property({ type: Array }) values: number[] = [];
  @property({ type: String }) color = '#4CAF50';
  @property({ type: Number }) sparkWidth = 100;
  @property({ type: Number }) sparkHeight = 30;
  @property({ type: String }) label = '';

  static styles = css`
    :host {
      display: inline-block;
    }
    svg {
      display: block;
      overflow: visible;
    }
  `;

  render() {
    try {
      return this._renderSparkline();
    } catch {
      return html`<svg
        width="${this.sparkWidth}"
        height="${this.sparkHeight}"
        data-testid="boiler-sparkline"
        role="img"
        aria-label="${this.label}"
      ></svg>`;
    }
  }

  private _renderSparkline() {
    const vals = Array.isArray(this.values) ? this.values : [];
    const finite = vals.filter((v) => typeof v === 'number' && isFinite(v));

    if (finite.length < 2) {
      return html`<svg
        width="${this.sparkWidth}"
        height="${this.sparkHeight}"
        viewBox="0 0 ${this.sparkWidth} ${this.sparkHeight}"
        data-testid="boiler-sparkline"
        role="img"
        aria-label="${this.label}"
      ></svg>`;
    }

    const minVal = Math.min(...finite);
    const maxVal = Math.max(...finite);
    const range = maxVal - minVal || 1;
    const pad = 2;
    const drawH = this.sparkHeight - pad * 2;
    const w = this.sparkWidth;

    const pointCount = vals.length;
    const points = vals
      .map((v, i) => {
        if (typeof v !== 'number' || !isFinite(v)) return null;
        const x = pointCount > 1 ? (i / (pointCount - 1)) * w : w / 2;
        const y = pad + drawH - ((v - minVal) / range) * drawH;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .filter((p): p is string => p !== null)
      .join(' ');

    return html`
      <svg
        width="${this.sparkWidth}"
        height="${this.sparkHeight}"
        viewBox="0 0 ${this.sparkWidth} ${this.sparkHeight}"
        data-testid="boiler-sparkline"
        role="img"
        aria-label="${this.label}"
      >
        ${svg`<polyline
          points="${points}"
          fill="none"
          stroke="${this.color}"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />`}
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-sparkline': OigBoilerSparkline;
  }
}
