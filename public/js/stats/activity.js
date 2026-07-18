/* Activity heatmap + player-count forecast tab for the statistics panel.
   Methods are copied onto StatisticsManager.prototype below. */
import { StatisticsManager } from '../statistics.js';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Methods = class {
    async loadActivity() {
        const body = document.getElementById('statisticsBody');
        const t = (key, fb) => window.rustplusUI?.languageManager?.get(key) || fb;
        const tz = -new Date().getTimezoneOffset() * 60; /* seconds east of UTC */

        try {
            const serverParam = this.serverId ? `&serverId=${encodeURIComponent(this.serverId)}` : '';
            const [activity, forecast] = await Promise.all([
                this.apiClient.get(`/api/statistics/activity/${this.guildId}?days=28&tz=${tz}${serverParam}`),
                this.apiClient.get(`/api/statistics/forecast/${this.guildId}?weeks=4&tz=${tz}${serverParam}`)
            ]);

            body.innerHTML = `
                <div class="activity-view">
                    <div class="chart-section">
                        <h3>${t('stats.activityHeatmap', '🔥 Team Activity by Hour (last 4 weeks)')}</h3>
                        <canvas id="activityHeatmapCanvas" width="900" height="260"></canvas>
                    </div>
                    <div class="chart-section">
                        <h3>${t('stats.forecast', `📈 Player Forecast for ${DAY_NAMES[forecast.dow]} (4-week average vs today)`)}</h3>
                        <canvas id="forecastChartCanvas" width="900" height="240"></canvas>
                    </div>
                </div>
            `;

            this.renderActivityHeatmap('activityHeatmapCanvas', activity);
            this.renderForecastChart('forecastChartCanvas', forecast);
        } catch (error) {
            console.error('[Statistics] Failed to load activity data:', error);
            body.innerHTML = `<div class="loading">Failed to load activity data</div>`;
        }
    }

    /* 7x24 grid; cell intensity = avg players relative to the dataset max */
    renderActivityHeatmap(canvasId, rows) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        const left = 44, top = 24, right = 10, bottom = 6;
        const gridW = W - left - right, gridH = H - top - bottom;
        const cellW = gridW / 24, cellH = gridH / 7;

        const byCell = {};
        let maxAvg = 0;
        for (const r of rows) {
            byCell[`${r.dow}:${r.hour}`] = r;
            if (r.avgPlayers > maxAvg) maxAvg = r.avgPlayers;
        }

        ctx.font = '11px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let h = 0; h < 24; h += 2) {
            ctx.fillText(`${h}`, left + h * cellW + cellW / 2, top - 12);
        }
        ctx.textAlign = 'right';
        for (let d = 0; d < 7; d++) {
            ctx.fillText(DAY_NAMES[d], left - 8, top + d * cellH + cellH / 2);
        }

        for (let d = 0; d < 7; d++) {
            for (let h = 0; h < 24; h++) {
                const cell = byCell[`${d}:${h}`];
                const ratio = cell && maxAvg > 0 ? cell.avgPlayers / maxAvg : 0;
                if (cell) {
                    /* dark blue -> orange -> red ramp */
                    const hue = 220 - ratio * 200;
                    const light = 18 + ratio * 34;
                    ctx.fillStyle = `hsl(${hue}, 85%, ${light}%)`;
                } else {
                    ctx.fillStyle = 'rgba(255,255,255,0.04)';
                }
                ctx.fillRect(left + h * cellW + 1, top + d * cellH + 1, cellW - 2, cellH - 2);
            }
        }
    }

    /* 24h line chart: forecast mean per hour + today's actuals overlay */
    renderForecastChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        const left = 36, top = 12, right = 10, bottom = 26;
        const plotW = W - left - right, plotH = H - top - bottom;

        const forecastByHour = new Array(24).fill(null);
        for (const r of (data.forecast || [])) forecastByHour[r.hour] = r.avgPlayers;
        const todayByHour = new Array(24).fill(null);
        for (const r of (data.today || [])) todayByHour[r.hour] = r.avgPlayers;

        const allValues = [...forecastByHour, ...todayByHour].filter(v => v !== null);
        const maxY = Math.max(1, ...allValues) * 1.15;

        const xFor = h => left + (h / 23) * plotW;
        const yFor = v => top + plotH - (v / maxY) * plotH;

        /* Axes + hour labels */
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.font = '10px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'center';
        for (let h = 0; h < 24; h += 3) {
            ctx.beginPath();
            ctx.moveTo(xFor(h), top);
            ctx.lineTo(xFor(h), top + plotH);
            ctx.stroke();
            ctx.fillText(`${h}:00`, xFor(h), H - 10);
        }
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const v = (maxY / 4) * i;
            ctx.fillText(Math.round(v), left - 5, yFor(v) + 3);
        }

        const drawSeries = (series, color, width, dashed) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.setLineDash(dashed ? [6, 4] : []);
            ctx.beginPath();
            let started = false;
            for (let h = 0; h < 24; h++) {
                if (series[h] === null) continue;
                const x = xFor(h), y = yFor(series[h]);
                if (!started) { ctx.moveTo(x, y); started = true; }
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        };

        drawSeries(forecastByHour, 'rgba(52, 152, 219, 0.9)', 2, true);   /* forecast */
        drawSeries(todayByHour, 'rgba(46, 204, 113, 0.95)', 2.5, false);  /* today */

        /* "now" marker */
        const nowHour = new Date().getHours() + new Date().getMinutes() / 60;
        ctx.strokeStyle = 'rgba(231, 76, 60, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(left + (nowHour / 23) * plotW, top);
        ctx.lineTo(left + (nowHour / 23) * plotW, top + plotH);
        ctx.stroke();

        /* Legend */
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(52, 152, 219, 0.9)';
        ctx.fillText('— forecast (4-wk avg)', left + 6, top + 12);
        ctx.fillStyle = 'rgba(46, 204, 113, 0.95)';
        ctx.fillText('— today', left + 150, top + 12);
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(StatisticsManager.prototype, descriptors);
