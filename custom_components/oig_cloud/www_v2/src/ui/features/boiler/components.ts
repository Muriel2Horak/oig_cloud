import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { BoilerProfile, BoilerState, BoilerHourData, DAYS_SHORT } from './types';

const u = unsafeCSS;

@customElement('oig-boiler-heatmap')
export class OigBoilerHeatmap extends LitElement {
  @property({ type: Array }) data: BoilerHourData[] = [];
  @property({ type: Number }) minTemp = 20;
  @property({ type: Number }) maxTemp = 70;

  static styles = css`
    :host {
      display: block;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
    }

    .heatmap-title {
      font-size: 14px;
      font-weight: 500;
      color: ${u(CSS_VARS.textPrimary)};
      margin-bottom: 12px;
    }

    .heatmap-grid {
      display: grid;
      grid-template-columns: 40px repeat(24, 1fr);
      gap: 2px;
    }

    .hour-cell {
      height: 20px;
      border-radius: 2px;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .hour-cell:hover {
      opacity: 0.8;
    }

    .hour-label {
      font-size: 10px;
      color: ${u(CSS_VARS.textSecondary)};
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .legend {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .legend-gradient {
      flex: 1;
      height: 12px;
      border-radius: 6px;
      background: linear-gradient(to right, #2196f3, #4caf50, #ff9800, #f44336);
    }
  `;

  private getTempColor(temp: number): string {
    const ratio = (temp - this.minTemp) / (this.maxTemp - this.minTemp);
    
    if (ratio < 0.33) {
      return '#2196f3';
    } else if (ratio < 0.66) {
      return '#4caf50';
    } else if (ratio < 0.85) {
      return '#ff9800';
    }
    return '#f44336';
  }

  private onCellClick(hour: number): void {
    this.dispatchEvent(new CustomEvent('hour-click', {
      detail: { hour },
      bubbles: true,
    }));
  }

  render() {
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return html`
      <div class="heatmap-title">Teplotní profil</div>
      
      <div class="heatmap-grid">
        ${hours.map(hour => html`
          <div
            class="hour-cell"
            style="background: ${this.data[hour] 
              ? u(this.getTempColor(this.data[hour].temp)) 
              : u(CSS_VARS.bgSecondary)}"
            @click=${() => this.onCellClick(hour)}
            title="${hour}:00 - ${this.data[hour]?.temp ?? '?'}°C"
          ></div>
        `)}
      </div>
      
      <div class="legend">
        <span>${this.minTemp}°C</span>
        <div class="legend-gradient"></div>
        <span>${this.maxTemp}°C</span>
      </div>
    `;
  }
}

@customElement('oig-boiler-state')
export class OigBoilerState extends LitElement {
  @property({ type: Object }) state: BoilerState | null = null;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
    }

    .temp-display {
      text-align: center;
    }

    .current-temp {
      font-size: 36px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .target-temp {
      font-size: 14px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .status-dot.heating {
      background: #f44336;
      animation: pulse 1s infinite;
    }

    .status-dot.idle {
      background: #4caf50;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .next-info {
      margin-left: auto;
      text-align: right;
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
    }
  `;

  render() {
    if (!this.state) return html`<div>Načítání...</div>`;

    return html`
      <div class="temp-display">
        <div class="current-temp">${this.state.currentTemp}°C</div>
        <div class="target-temp">Cíl: ${this.state.targetTemp}°C</div>
      </div>
      
      <div class="status-indicator">
        <div class="status-dot ${this.state.heating ? 'heating' : 'idle'}"></div>
        <span>${this.state.heating ? 'Topí' : 'Nečinný'}</span>
      </div>
      
      ${this.state.nextProfile ? html`
        <div class="next-info">
          <div>Další: ${this.state.nextProfile}</div>
          <div>${this.state.nextStart}</div>
        </div>
      ` : null}
    `;
  }
}

@customElement('oig-boiler-profiles')
export class OigBoilerProfiles extends LitElement {
  @property({ type: Array }) profiles: BoilerProfile[] = [];
  @property({ type: Boolean }) editMode = false;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .profile-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 8px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
    }

    .profile-item.disabled {
      opacity: 0.5;
    }

    .profile-icon {
      font-size: 20px;
    }

    .profile-info {
      flex: 1;
    }

    .profile-name {
      font-size: 14px;
      font-weight: 500;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .profile-time {
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .profile-days {
      display: flex;
      gap: 4px;
    }

    .day-badge {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: ${u(CSS_VARS.bgSecondary)};
      font-size: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .day-badge.active {
      background: ${u(CSS_VARS.accent)};
      color: #fff;
    }

    .profile-temp {
      font-size: 16px;
      font-weight: 600;
      color: ${u(CSS_VARS.accent)};
    }

    .profile-actions {
      display: flex;
      gap: 4px;
    }

    .action-btn {
      width: 28px;
      height: 28px;
      border: none;
      background: ${u(CSS_VARS.bgSecondary)};
      border-radius: 50%;
      cursor: pointer;
      font-size: 12px;
    }

    .action-btn:hover {
      background: ${u(CSS_VARS.divider)};
    }

    .add-btn {
      padding: 12px;
      border: 2px dashed ${u(CSS_VARS.divider)};
      background: transparent;
      border-radius: 8px;
      color: ${u(CSS_VARS.textSecondary)};
      cursor: pointer;
      font-size: 14px;
    }

    .add-btn:hover {
      border-color: ${u(CSS_VARS.accent)};
      color: ${u(CSS_VARS.accent)};
    }
  `;

  private onToggle(profileId: string): void {
    this.dispatchEvent(new CustomEvent('toggle-profile', {
      detail: { id: profileId },
      bubbles: true,
    }));
  }

  private onEdit(profileId: string): void {
    this.dispatchEvent(new CustomEvent('edit-profile', {
      detail: { id: profileId },
      bubbles: true,
    }));
  }

  private onDelete(profileId: string): void {
    this.dispatchEvent(new CustomEvent('delete-profile', {
      detail: { id: profileId },
      bubbles: true,
    }));
  }

  private onAdd(): void {
    this.dispatchEvent(new CustomEvent('add-profile', { bubbles: true }));
  }

  render() {
    return html`
      ${this.profiles.map(profile => html`
        <div class="profile-item ${profile.enabled ? '' : 'disabled'}">
          <span class="profile-icon">🔥</span>
          
          <div class="profile-info">
            <div class="profile-name">${profile.name}</div>
            <div class="profile-time">${profile.startTime} - ${profile.endTime}</div>
          </div>
          
          <div class="profile-days">
            ${profile.days.map((day, i) => html`
              <span class="day-badge ${day ? 'active' : ''}">${DAYS_SHORT[i]}</span>
            `)}
          </div>
          
          <span class="profile-temp">${profile.targetTemp}°C</span>
          
          ${this.editMode ? html`
            <div class="profile-actions">
              <button class="action-btn" @click=${() => this.onToggle(profile.id)}>
                ${profile.enabled ? '⏸' : '▶'}
              </button>
              <button class="action-btn" @click=${() => this.onEdit(profile.id)}>⚙️</button>
              <button class="action-btn" @click=${() => this.onDelete(profile.id)}>🗑️</button>
            </div>
          ` : null}
        </div>
      `)}
      
      ${this.editMode ? html`
        <button class="add-btn" @click=${this.onAdd}>+ Přidat profil</button>
      ` : null}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-heatmap': OigBoilerHeatmap;
    'oig-boiler-state': OigBoilerState;
    'oig-boiler-profiles': OigBoilerProfiles;
  }
}
