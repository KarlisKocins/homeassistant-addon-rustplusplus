/* Achievement Manager for WebUI */
class AchievementManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.storageKey = 'rpp_earned_achievements';
    }

    async loadAndRender(container, guildId, serverId, steamId, playerName = 'Unknown player') {
        if (!container) return;

        container.innerHTML = '<div class="achievements-loading"><div class="spinner"></div><span>Loading achievements...</span></div>';

        try {
            const url = `${window.RPP_BASE}/api/statistics/achievements/${guildId}/${steamId}${serverId ? `?serverId=${serverId}` : ''}`;
            const response = await fetch(url);
            const achievements = await response.json();
            this.notifyNewAchievements(guildId, serverId, steamId, playerName, achievements);
            this.render(container, achievements);
        } catch (error) {
            container.innerHTML = '<div class="achievements-error">Failed to load achievements</div>';
        }
    }

    notifyNewAchievements(guildId, serverId, steamId, playerName, achievements) {
        if (!Array.isArray(achievements) || !window.rustplusUI?.notificationManager) return;

        const storage = this.loadEarnedAchievementStorage();
        const playerKey = `${guildId}:${serverId || 'default'}:${steamId}`;
        const knownAchievements = new Set(storage[playerKey] || []);
        const currentEarned = achievements.filter(a => a?.earned).map(a => a.title);

        currentEarned.forEach((title) => {
            if (!knownAchievements.has(title)) {
                window.rustplusUI.notificationManager.addNotification(
                    'achievement',
                    `🏆 ${playerName} earned an achievement: ${title}`
                );
            }
        });

        storage[playerKey] = currentEarned;
        localStorage.setItem(this.storageKey, JSON.stringify(storage));
    }

    loadEarnedAchievementStorage() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            return {};
        }
    }

    render(container, achievements) {
        if (!container || !achievements || !Array.isArray(achievements)) return;

        const earned = achievements.filter(a => a.earned);
        const locked = achievements.filter(a => !a.earned);

        let html = `
            <div class="achievements-header">
                <span class="achievements-title">🏆 Achievements</span>
                <span class="achievements-count">${earned.length} / ${achievements.length}</span>
            </div>
            <div class="achievements-grid">
        `;

        // Show earned first, then locked
        const sorted = [...earned, ...locked];

        sorted.forEach(achievement => {
            const progressPct = Math.floor(achievement.progress * 100);

            html += `
                <div class="achievement-card ${achievement.earned ? 'earned' : 'locked'}">
                    <div class="achievement-icon-wrapper">
                        <span class="achievement-icon">${achievement.icon}</span>
                        ${achievement.earned ? '<span class="achievement-checkmark">✓</span>' : ''}
                    </div>
                    <div class="achievement-info">
                        <div class="achievement-name">${achievement.title}</div>
                        <div class="achievement-desc">${achievement.description}</div>
                        <div class="achievement-progress-wrapper">
                            <div class="achievement-progress-bar">
                                <div class="achievement-progress-fill ${achievement.earned ? 'complete' : ''}" style="width: ${progressPct}%"></div>
                            </div>
                            <span class="achievement-progress-text">${achievement.progressText}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }
}
