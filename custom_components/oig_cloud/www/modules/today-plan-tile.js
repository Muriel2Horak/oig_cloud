/**
 * Today Plan Tile Component
 *
 * Dlaždice "Dnes - Plnění plánu" s mini grafem variance chart
 * Zobrazuje průběžné plnění plánu a EOD predikci
 *
 * Phase 2.9 - Implementace dle PLAN_VS_ACTUAL_UX_REDESIGN.md
 *
 * @version 1.0.0
 * @author OIG Cloud Team
 * @status IMPLEMENTOVÁNO - NEZASAZENO (čeká na review)
 */

class TodayPlanTile {
    /**
     * @param {HTMLElement} container - Container element pro dlaždici
     * @param {Object} data - Data z API (today_tile_summary)
     * @param {Function} onClickHandler - Handler pro kliknutí na dlaždici
     */
    constructor(container, data, onClickHandler = null) {
        this.container = container;
        this.data = data;
        this.onClickHandler = onClickHandler;
        this.chart = null;

        this.render();
    }

    /**
     * Hlavní render metoda - vykreslí celou dlaždici
     */
    render() {
        if (!this.data) {
            this.renderEmpty();
            return;
        }

        const {
            progress_pct,
            planned_so_far,
            actual_so_far,
            delta,
            delta_pct,
            eod_prediction,
            eod_plan,
            eod_delta_pct,
            confidence,
            current_time
        } = this.data;

        // Určit CSS třídy podle delta
        const deltaClass = delta < 0 ? 'better' : (delta > 0 ? 'worse' : 'neutral');
        const deltaIcon = delta < 0 ? '✅' : (delta > 0 ? '⚠️' : '➡️');
        const eodClass = eod_delta_pct < 0 ? 'better' : (eod_delta_pct > 0 ? 'worse' : 'neutral');
        const eodIcon = eod_delta_pct < 0 ? '✅' : (eod_delta_pct > 0 ? '⚠️' : '➡️');

        // Vytvořit HTML
        this.container.innerHTML = `
            <div class="tile today-plan-tile" data-confidence="${confidence}">
                <div class="tile-header">
                    <span class="tile-title">📆 DNES - Plnění plánu</span>
                    <span class="tile-time">🕐 ${current_time}</span>
                </div>

                <div class="mini-chart-container">
                    <canvas id="today-mini-chart"></canvas>
                </div>

                <div class="tile-metrics">
                    <div class="metric">
                        <div class="metric-label">💰 Plán</div>
                        <div class="metric-value">${planned_so_far.toFixed(2)} Kč</div>
                        <div class="metric-sublabel">(dosud)</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">💸 Skutečně</div>
                        <div class="metric-value">${actual_so_far.toFixed(2)} Kč</div>
                        <div class="metric-sublabel">(dosud)</div>
                    </div>
                    <div class="metric ${deltaClass}">
                        <div class="metric-label">📊 Odchylka</div>
                        <div class="metric-value">
                            ${delta.toFixed(2)} Kč
                        </div>
                        <div class="metric-sublabel">
                            ${deltaIcon} ${Math.abs(delta_pct).toFixed(1)}%
                        </div>
                    </div>
                </div>

                <div class="tile-prediction">
                    🔮 EOD: <strong>${eod_prediction.toFixed(2)} Kč</strong>
                    <span class="prediction-plan">(plán: ${eod_plan.toFixed(2)})</span>
                    <span class="${eodClass}">${eodIcon} ${eod_delta_pct.toFixed(1)}%</span>
                </div>

                <div class="tile-footer">
                    <span class="detail-link">[Detail →]</span>
                    <span class="auto-refresh">🔄 Auto 15min</span>
                </div>
            </div>
        `;

        // Přidat click handler
        if (this.onClickHandler) {
            const tileEl = this.container.querySelector('.today-plan-tile');
            if (tileEl) {
                tileEl.style.cursor = 'pointer';
                tileEl.addEventListener('click', this.onClickHandler);
            }
        }

        // Render mini chart
        this.renderMiniChart();
    }

    /**
     * Vykreslí prázdnou dlaždici pokud nejsou data
     */
    renderEmpty() {
        this.container.innerHTML = `
            <div class="tile today-plan-tile today-plan-tile--empty">
                <div class="tile-header">
                    <span class="tile-title">📆 DNES - Plnění plánu</span>
                </div>
                <div class="tile-empty-state">
                    <p>⏳ Načítání dat...</p>
                    <p class="tile-empty-hint">Data budou k dispozici po prvním 15minutovém intervalu.</p>
                </div>
            </div>
        `;
    }

    /**
     * Vykreslí mini variance chart s Chart.js
     */
    renderMiniChart() {
        const canvas = document.getElementById('today-mini-chart');
        if (!canvas) {
            console.warn('⚠️ Canvas #today-mini-chart not found');
            return;
        }

        const chartData = this.data.mini_chart_data || [];
        if (chartData.length === 0) {
            this.renderEmptyChart(canvas);
            return;
        }

        const ctx = canvas.getContext('2d');

        // Příprava dat
        const labels = chartData.map(d => {
            const time = d.time.substring(11, 16); // HH:MM
            return time;
        });

        const data = chartData.map(d => d.delta);

        // Barevné kódování podle hodnoty a statusu
        const colors = chartData.map(d => {
            if (!d.is_historical) {
                // Planned (ještě nenastalo) - šedá
                return 'rgba(200, 200, 200, 0.5)';
            }

            if (d.delta === null) {
                // Historical ale bez delta - šedá
                return 'rgba(200, 200, 200, 0.7)';
            }

            // Historical s delta - zelená (lepší) / červená (horší)
            return d.delta < 0
                ? 'rgba(76, 175, 80, 0.8)'  // Zelená - úspora
                : 'rgba(244, 67, 54, 0.8)'; // Červená - ztráta
        });

        // Najít NOW index pro marker
        const nowIndex = chartData.findIndex(d => d.is_current);

        // Zničit existující chart pokud je
        if (this.chart) {
            this.chart.destroy();
        }

        // Vytvořit nový chart
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    barPercentage: 0.9,
                    categoryPercentage: 0.95
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            title: (context) => {
                                const index = context[0].dataIndex;
                                const item = chartData[index];
                                return item.time.substring(11, 16); // HH:MM
                            },
                            label: (context) => {
                                const index = context.dataIndex;
                                const item = chartData[index];

                                if (!item.is_historical) {
                                    return 'Plán (ještě nenastalo)';
                                }

                                if (item.delta === null) {
                                    return 'Chybí actual data';
                                }

                                const value = context.parsed.y;
                                const sign = value < 0 ? '' : '+';
                                return `Odchylka: ${sign}${value.toFixed(2)} Kč`;
                            }
                        }
                    },
                    annotation: nowIndex >= 0 ? {
                        annotations: {
                            nowLine: {
                                type: 'line',
                                xMin: nowIndex - 0.5,
                                xMax: nowIndex - 0.5,
                                borderColor: 'rgb(255, 99, 132)',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                label: {
                                    content: 'NOW',
                                    enabled: true,
                                    position: 'top',
                                    backgroundColor: 'rgb(255, 99, 132)',
                                    color: 'white',
                                    font: {
                                        size: 10,
                                        weight: 'bold'
                                    }
                                }
                            }
                        }
                    } : undefined
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 8,
                            font: {
                                size: 9
                            }
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: (value) => {
                                const sign = value < 0 ? '' : '+';
                                return `${sign}${value.toFixed(1)}`;
                            },
                            font: {
                                size: 9
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Vykreslí prázdný chart jako placeholder
     */
    renderEmptyChart(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#999';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Žádná data pro graf', canvas.width / 2, canvas.height / 2);
    }

    /**
     * Aktualizovat data a překreslit
     * @param {Object} newData - Nová data z API
     */
    update(newData) {
        this.data = newData;
        this.render();
    }

    /**
     * Zničit komponentu a uvolnit resources
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export pro použití v dashboard
window.TodayPlanTile = TodayPlanTile;

export default TodayPlanTile;
