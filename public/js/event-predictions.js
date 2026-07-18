/* Event Prediction Manager for WebUI */
class EventPredictionManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.predictions = {};
        this.countdownInterval = null;
        this.container = null;
    }

    async show(guildId, serverId) {
        this.guildId = guildId;
        this.serverId = serverId;

        const modal = document.getElementById('predictionsModal');
        if (!modal) return;

        modal.style.display = 'flex';
        this.container = document.getElementById('predictionsContent');
        if (!this.container) return;

        this.container.innerHTML = '<div class="predictions-loading"><div class="spinner"></div><span>Loading predictions...</span></div>';

        try {
            const url = `${window.RPP_BASE}/api/statistics/events/${guildId}/predictions${serverId ? `?serverId=${serverId}` : ''}`;
            const response = await fetch(url);
            this.predictions = await response.json();
            this.render();
            this.startCountdowns();
        } catch (error) {
            this.container.innerHTML = '<div class="predictions-empty">Failed to load predictions</div>';
        }
    }

    hide() {
        const modal = document.getElementById('predictionsModal');
        if (modal) modal.style.display = 'none';
        this.stopCountdowns();
    }

    render() {
        if (!this.container) return;

        const eventMeta = {
            cargo: { icon: '🚢', name: 'Cargo Ship', color: '#f39c12' },
            heli: { icon: '🚁', name: 'Patrol Helicopter', color: '#e74c3c' },
            chinook: { icon: '🛩️', name: 'Chinook (CH-47)', color: '#3498db' },
            small: { icon: '🛢️', name: 'Small Oil Rig', color: '#2ecc71' },
            large: { icon: '🏭', name: 'Large Oil Rig', color: '#9b59b6' },
            deepsea: { icon: '🌊', name: 'Deep Sea', color: '#1abc9c' }
        };

        let html = '<div class="predictions-grid">';

        for (const [type, data] of Object.entries(this.predictions)) {
            const meta = eventMeta[type] || { icon: '❓', name: type, color: '#95a5a6' };
            const hasData = data.totalEvents > 0;
            const confidenceClass = data.confidence >= 0.7 ? 'high' : data.confidence >= 0.3 ? 'medium' : 'low';

            html += `
                <div class="prediction-card" data-event-type="${type}">
                    <div class="prediction-header">
                        <span class="prediction-icon">${meta.icon}</span>
                        <span class="prediction-name">${meta.name}</span>
                    </div>
                    <div class="prediction-body">
                        ${hasData ? `
                            <div class="prediction-stat">
                                <span class="prediction-label">Events Tracked</span>
                                <span class="prediction-value">${data.totalEvents}</span>
                            </div>
                            <div class="prediction-stat">
                                <span class="prediction-label">Last Seen</span>
                                <span class="prediction-value">${data.lastOccurrence ? this.formatTimeAgo(data.lastOccurrence) : 'Never'}</span>
                            </div>
                            <div class="prediction-stat">
                                <span class="prediction-label">Avg Interval</span>
                                <span class="prediction-value">${data.avgIntervalSeconds ? this.formatDuration(data.avgIntervalSeconds) : 'N/A'}</span>
                            </div>
                            <div class="prediction-countdown-wrapper">
                                <div class="prediction-label">Predicted Next</div>
                                <div class="prediction-countdown" data-predicted="${data.predictedNext || ''}" data-type="${type}">
                                    ${data.predictedNext ? this.formatCountdown(data.predictedNext) : '<span class="na">Need more data</span>'}
                                </div>
                                <div class="prediction-progress-bar">
                                    <div class="prediction-progress-fill" data-type="${type}" style="width: ${this.getProgressPercent(data)}%"></div>
                                </div>
                            </div>
                            <div class="prediction-confidence ${confidenceClass}">
                                <span class="confidence-dot"></span>
                                <span>${Math.floor(data.confidence * 100)}% confidence</span>
                            </div>
                        ` : `
                            <div class="predictions-no-data">
                                <span class="no-data-icon">📊</span>
                                <span>No events recorded yet</span>
                                <span class="no-data-hint">Events will be tracked automatically</span>
                            </div>
                        `}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        this.container.innerHTML = html;
    }

    startCountdowns() {
        this.stopCountdowns();
        this.countdownInterval = setInterval(() => {
            const countdowns = document.querySelectorAll('.prediction-countdown[data-predicted]');
            countdowns.forEach(el => {
                const predicted = parseInt(el.dataset.predicted);
                if (predicted) {
                    el.innerHTML = this.formatCountdown(predicted);
                }
            });
            // Update progress bars
            for (const [type, data] of Object.entries(this.predictions)) {
                const fill = document.querySelector(`.prediction-progress-fill[data-type="${type}"]`);
                if (fill) {
                    fill.style.width = `${this.getProgressPercent(data)}%`;
                }
            }
        }, 1000);
    }

    stopCountdowns() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    getProgressPercent(data) {
        if (!data.predictedNext || !data.lastOccurrence || !data.avgIntervalSeconds) return 0;
        const now = Math.floor(Date.now() / 1000);
        const elapsed = now - data.lastOccurrence;
        return Math.min((elapsed / data.avgIntervalSeconds) * 100, 100);
    }

    formatCountdown(predictedTimestamp) {
        const now = Math.floor(Date.now() / 1000);
        const diff = predictedTimestamp - now;

        if (diff <= 0) {
            return '<span class="countdown-overdue">⚠️ OVERDUE — Could spawn any moment!</span>';
        }

        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

        let parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        parts.push(`${minutes}m`);
        parts.push(`${String(seconds).padStart(2, '0')}s`);

        return `<span class="countdown-time">${parts.join(' ')}</span>`;
    }

    formatTimeAgo(timestamp) {
        const now = Math.floor(Date.now() / 1000);
        const diff = now - timestamp;

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }
}
