/* Achievement Manager for WebUI */
class AchievementManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
    }

    async loadAndRender(container, guildId, serverId, steamId) {
        if (!container) return;

        container.innerHTML = '<div class="achievements-loading"><div class="spinner"></div><span>Loading achievements...</span></div>';

        try {
            const url = `/api/statistics/achievements/${guildId}/${steamId}${serverId ? `?serverId=${serverId}` : ''}`;
            const response = await fetch(url);
            const achievements = await response.json();
            this.render(container, achievements);
        } catch (error) {
            container.innerHTML = '<div class="achievements-error">Failed to load achievements</div>';
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
