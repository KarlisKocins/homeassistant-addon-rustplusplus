export class StatisticsManager {
    constructor(apiClient, guildId, serverId = null) {
        this.apiClient = apiClient;
        this.guildId = guildId;
        this.serverId = serverId; // Will be set from serverData, required for filtering
        this.currentView = 'overview';
        this.selectedPlayer = null;
        this.charts = {};
        this.authManager = null; // Will be set by app.js
        this.chatHistory = []; // Local cache for current session
        this.isChatLoaded = false;
        this.isLoadingChat = false;
        this.hasSyncedThisSession = false;
    }

    async init() {
        // Button is created in main app, we just need to load initial data
        await this.loadOverview();

        // Listen for language changes to update the panel if it's open
        window.addEventListener('languageChanged', () => {
            const panel = document.getElementById('statisticsPanel');
            if (panel && panel.style.display === 'flex') {
                // Panel is open, reload current view to update translations
                this.switchTab(this.currentView);
            }
        });
    }

    setupUI() {
        // This method is no longer needed as button is created in main app
        // Keeping for backward compatibility
    }

    async checkAuthenticationBeforeOpen() {
        // Authentication is now handled globally by authManager
        // Just open the panel directly since auth was checked on server selection
        this.openStatisticsPanel();
    }

    async openStatisticsPanel() {
        // We can open with just guildId, serverId is only for filtering
        if (!this.guildId) {
            console.error('[Statistics] Cannot open panel - guildId not available');
            return;
        }

        // Always remove and recreate the panel to ensure translations are current
        const existing = document.getElementById('statisticsPanel');
        if (existing) {
            existing.remove();
        }

        const panel = document.createElement('div');
        panel.id = 'statisticsPanel';
        panel.className = 'statistics-panel';

        // Check PIN status for button label
        const t = (key) => window.rustplusUI?.languageManager?.get(key) || key;
        let pinButtonHtml = `<button id="pinCodeManageBtn" class="primary-button" onclick="window.rustplusUI.statisticsManager.openPinCodeManager()">${t('stats.managePin')}</button>`;
        try {
            const pinStatus = await this.apiClient.get(`/api/statistics/pin-status/${this.guildId}`);
            pinButtonHtml = pinStatus.hasPinCode
                ? `<button id="pinCodeManageBtn" class="primary-button" onclick="window.rustplusUI.statisticsManager.openPinCodeManager()">${t('stats.changePin')}</button>`
                : `<button id="pinCodeManageBtn" class="primary-button" onclick="window.rustplusUI.statisticsManager.openPinCodeManager()">${t('stats.setPin')}</button>`;
        } catch (e) {
            console.log('PIN status check failed, using default button');
        }

        panel.innerHTML = `
            <div class="statistics-content">
                <div class="statistics-header">
                    <h2>${t('stats.title')}</h2>
                    <div class="header-actions" id="statsHeaderActions" style="display: flex; align-items: center; gap: 10px;">
                        <button class="primary-button" onclick="window.rustplusUI.statisticsManager.exportCurrentTab()">📥 Export CSV</button>
                        ${pinButtonHtml}
                        <button class="primary-button" onclick="window.rustplusUI.statisticsManager.confirmResetStats()">${t('stats.resetStats')}</button>
                        <button class="close-button" onclick="document.getElementById('statisticsPanel').style.display='none'">${t('stats.close')}</button>
                    </div>
                </div>
                <div class="statistics-tabs">
                    <button class="tab-button active" data-tab="overview">${t('stats.tab.overview')}</button>
                    <button class="tab-button" data-tab="players">${t('stats.tab.players')}</button>
                    <button class="tab-button" data-tab="sessions">${t('stats.tab.sessions')}</button>
                    <button class="tab-button" data-tab="deaths">${t('stats.tab.deaths')}</button>
                    <button class="tab-button" data-tab="chat">${t('stats.tab.chat')}</button>
                    <button class="tab-button" data-tab="replay">${t('stats.tab.replay')}</button>
                </div>
                <div class="statistics-body" id="statisticsBody">
                    <div class="loading">${t('stats.loading')}</div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        panel.style.display = 'flex';

        // Setup tab switching
        panel.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                panel.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.switchTab(e.target.dataset.tab);
            });
        });

        await this.loadOverview();
    }

    async switchTab(tab) {
        if (this.currentView === tab && document.getElementById('statisticsBody').innerHTML !== '' && !document.getElementById('statisticsBody').querySelector('.loading')) {
            // Already on this tab and it has content, don't clear it
            return;
        }

        this.currentView = tab;
        const body = document.getElementById('statisticsBody');
        const t = (key) => window.rustplusUI?.languageManager?.get(key) || key;

        // Show loading but keep existing content if possible (except for first load)
        if (body.innerHTML === '' || body.querySelector('.loading')) {
            body.innerHTML = `<div class="loading">${t('stats.loading')}</div>`;
        }

        switch (tab) {
            case 'overview':
                await this.loadOverview();
                break;
            case 'players':
                await this.loadPlayers();
                break;
            case 'sessions':
                await this.loadSessions();
                break;
            case 'deaths':
                await this.loadDeaths();
                break;
            case 'chat':
                await this.loadChatHistory();
                break;
            case 'replay':
                await this.loadReplay();
                break;
        }
    }







    async switchTab(tab) {
        this.currentView = tab;
        const body = document.getElementById('statisticsBody');
        body.innerHTML = '<div class="loading">Loading...</div>';

        switch (tab) {
            case 'overview':
                await this.loadOverview();
                break;
            case 'players':
                await this.loadPlayers();
                break;
            case 'sessions':
                await this.loadSessions();
                break;
            case 'deaths':
                await this.loadDeaths();
                break;
            case 'chat':
                await this.loadChatHistory();
                break;
            case 'replay':
                await this.loadReplay();
                break;
        }
    }



































    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
