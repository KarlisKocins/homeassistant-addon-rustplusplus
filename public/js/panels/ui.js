/* Extracted from app.js - methods are verbatim; they are copied onto RustPlusWebUI.prototype below. */
import { RustPlusWebUI } from '../../app.js';

const Methods = class {
    setupConfirmModal() {
        const modal = document.getElementById('confirmModal');
        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');

        if (!modal || !okBtn || !cancelBtn) return;

        cancelBtn.onclick = () => {
            modal.classList.remove('open');
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('open');
            }
        };
    }

    showConfirm(title, message, onConfirm) {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOkBtn');

        if (!modal || !titleEl || !messageEl || !okBtn) {
            // Fallback to native confirm if elements not found
            if (confirm(message)) onConfirm();
            return;
        }

        titleEl.textContent = title;
        messageEl.textContent = message;

        okBtn.onclick = () => {
            modal.classList.remove('open');
            onConfirm();
        };

        modal.classList.add('open');
    }

    updateUI() {
        if (!this.serverData) return;
        this.updateServerInfo();
        this.updateTeamList();
        this.updateEventsList();
    }

    updateServerInfo() {
        const info = this.serverData.info;
        const time = this.serverData.time;
        if (!info) {
            document.getElementById('serverInfo').innerHTML = '<p>No server data available</p>';
            return;
        }
        const timeOfDay = time ? (time.isDay ? '☀️ Day' : '🌙 Night') : 'Unknown';
        const gameTime = time ? this.formatGameTime(time.time) : 'Unknown';
        document.getElementById('serverInfo').innerHTML = `
            <div class="server-info-grid">
                <div class="server-info-item">
                    <svg class="server-info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                        <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                        <line x1="6" y1="6" x2="6.01" y2="6"></line>
                        <line x1="6" y1="18" x2="6.01" y2="18"></line>
                    </svg>
                    <div class="server-info-content">
                        <span class="server-info-label">Server</span>
                        <span class="server-info-value">${info.name}</span>
                    </div>
                </div>
                <div class="server-info-item">
                    <svg class="server-info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                        <line x1="8" y1="2" x2="8" y2="18"></line>
                        <line x1="16" y1="6" x2="16" y2="22"></line>
                    </svg>
                    <div class="server-info-content">
                        <span class="server-info-label">Map</span>
                        <span class="server-info-value">${info.map} <span class="server-info-badge">${info.mapSize}m</span></span>
                    </div>
                </div>
                <div class="server-info-item">
                    <svg class="server-info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <div class="server-info-content">
                        <span class="server-info-label">Players</span>
                        <span class="server-info-value">
                            ${info.players}/${info.maxPlayers}
                            <button id="viewPlayerListBtn" class="player-list-btn" title="View Full List via BattleMetrics">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                LIST
                            </button>
                        </span>
                    </div>
                </div>
                ${info.queuedPlayers > 0 ? `
                <div class="server-info-item server-info-queue">
                    <svg class="server-info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                    <div class="server-info-content">
                        <span class="server-info-label">Queue</span>
                        <span class="server-info-value server-info-queue-value">${info.queuedPlayers}</span>
                    </div>
                </div>` : ''}
                <div class="server-info-item">
                    <svg class="server-info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <div class="server-info-content">
                        <span class="server-info-label">Time</span>
                        <span class="server-info-value">${timeOfDay} <span class="server-info-badge">${gameTime}</span></span>
                    </div>
                </div>
                <div class="server-info-item">
                    <svg class="server-info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <div class="server-info-content">
                        <span class="server-info-label">Wipe</span>
                        <span class="server-info-value">${this.formatWipeTime(info.wipeTime)}</span>
                    </div>
                </div>
            </div>`;

        // Re-attach listener since we overwrote the HTML
        const btn = document.getElementById('viewPlayerListBtn');
        if (btn) {
            btn.addEventListener('click', () => this.openPlayerList());
        }
    }

    setupPlayerListModal() {
        const modal = document.getElementById('playerListModal');
        const closeBtn = document.getElementById('closePlayerListBtn');
        const searchInput = document.getElementById('playerSearch');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.classList.remove('open'));
        }
        // Close on click outside
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('open');
        });
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.renderPlayerList(e.target.value));
        }
    }

    async openPlayerList() {
        const modal = document.getElementById('playerListModal');
        if (!modal) return;

        modal.classList.add('open');
        this.renderPlayerList();

        // Fetch full list from backend using internal bot data (synced with Discord bot)
        if (!this.fullPlayerList || (Date.now() - (this.lastPlayerFetch || 0) > 30000)) {
            const container = document.getElementById('playerListContainer');
            container.innerHTML = '<div class="vending-loading">Loading player data from bot...</div>';

            try {
                // Use currentGuildId or fallback to serverData
                const guildId = this.currentGuildId || this.serverData?.guildId;
                if (!guildId) throw new Error('No active guild selected');

                const response = await fetch(`${window.RPP_BASE}/api/battlemetrics/players/${guildId}`);
                if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch');

                const data = await response.json();

                if (data.players) {
                    this.fullPlayerList = data.players;
                    this.lastPlayerFetch = Date.now();
                    this.battleMetricsUrl = data.battleMetricsUrl;

                    // Update BM Link
                    const bmLink = document.getElementById('bmLink');
                    if (bmLink && data.battleMetricsUrl) {
                        bmLink.href = data.battleMetricsUrl;
                    }

                    this.renderPlayerList();
                } else {
                    throw new Error('No players found');
                }
            } catch (e) {
                console.error('Failed to fetch players:', e);
                const container = document.getElementById('playerListContainer');
                if (container) {
                    container.innerHTML = `<div class="error">Failed to load full list. Showing team members only.<br><small>${e.message}</small></div>`;
                    // Fallback to team members after delay
                    setTimeout(() => this.renderPlayerList(), 2000);
                }
            }
        }
    }

    renderPlayerList(filter = '') {
        const container = document.getElementById('playerListContainer');
        const countDisplay = document.getElementById('playerCountDisplay');
        if (!container) return;

        // Use fetched list OR fallback to team
        let players = [];

        if (this.fullPlayerList && this.fullPlayerList.length > 0) {
            players = this.fullPlayerList.map(p => ({
                name: p.name,
                id: p.id,
                source: 'BattleMetrics',
                isOnline: true,
                time: p.time // Available from our new backend
            }));
        } else if (this.serverData?.team?.players) {
            players = this.serverData.team.players.map(p => ({
                name: p.name,
                id: p.steamId,
                source: 'Team',
                isOnline: p.isOnline,
                time: ''
            }));
        }

        container.innerHTML = '';

        const filtered = players.filter(p =>
            p.name.toLowerCase().includes(filter.toLowerCase())
        );

        if (countDisplay) countDisplay.textContent = filtered.length;

        if (filtered.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary);">No players found.</div>';
            return;
        }

        // Create a map of team members for faster lookup
        const teamMap = new Map();
        if (this.serverData?.team?.players) {
            this.serverData.team.players.forEach(p => {
                // normalize name for loose matching if needed, but steamID is key
                teamMap.set(p.name, p.steamId);
            });
        }

        filtered.forEach(p => {
            const div = document.createElement('div');
            div.className = 'vm-item';
            div.style.background = 'rgba(255, 255, 255, 0.03)';
            div.style.padding = '8px 12px';

            // Determine URLs
            const bmUrl = p.source === 'BattleMetrics'
                ? `https://www.battlemetrics.com/players/${p.id}`
                : `https://www.battlemetrics.com/players?filter[search]=${p.id}`;

            // Try to find SteamID
            let steamId = p.source === 'Team' ? p.id : teamMap.get(p.name);
            const steamUrl = steamId
                ? `https://steamcommunity.com/profiles/${steamId}`
                : `https://steamcommunity.com/search/users/#text=${encodeURIComponent(p.name)}`;
            const isOnline = p.isOnline !== false;
            const statusColor = (steamId && isOnline)
                ? this.getPlayerColor(steamId)
                : 'var(--text-secondary)';

            div.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:8px; height:8px; border-radius:50%; background:${statusColor};" title="${isOnline ? 'Online' : 'Offline'}"></div>
                        <div style="display:flex; flex-direction:column;">
                            <span style="font-weight:bold; color:var(--text-primary);">${p.name}</span>
                            <div style="font-size:0.75rem; color:var(--text-secondary); display:flex; gap:8px;">
                                <span>${p.source === 'Team' ? 'Team Member' : 'Player'}</span>
                                ${p.time ? `<span style="color:var(--accent);">⏱️ ${p.time}</span>` : ''}
                            </div>
                        </div>
                    </div>
                   <div class="profile-actions">
                        <!-- Steam Group -->
                        <div class="profile-btn-group">
                            <a href="${steamUrl}" target="_blank" class="profile-btn steam" title="Steam Profile">
                                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                Steam
                            </a>
                            <button class="copy-btn" onclick="navigator.clipboard.writeText('${steamUrl}').then(() => this.style.color='var(--success)'); setTimeout(() => this.style.color='', 1000);" title="Copy Link">
                                <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                        </div>
                        
                        <!-- BM Group -->
                        <div class="profile-btn-group">
                            <a href="${bmUrl}" target="_blank" class="profile-btn bm" title="BattleMetrics Profile">
                                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                                BM
                            </a>
                             <button class="copy-btn" onclick="navigator.clipboard.writeText('${bmUrl}').then(() => this.style.color='var(--success)'); setTimeout(() => this.style.color='', 1000);" title="Copy Link">
                                <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    updateTeamList() {
        const team = this.serverData?.team;
        const teamList = document.getElementById('teamList');
        if (!team?.players?.length) {
            teamList.innerHTML = '<p class="loading">No team members</p>';
            return;
        }

        const followSelect = document.getElementById('followPlayer');
        if (followSelect) {
            const currentVal = followSelect.value;
            followSelect.innerHTML = '<option value="">Auto-follow</option>';
            team.players.filter(p => p.isOnline).forEach(p => {
                followSelect.add(new Option(p.name, p.steamId, false, p.steamId === currentVal));
            });
        }

        teamList.innerHTML = '';
        team.players.forEach(p => {
            const div = document.createElement('div');
            div.className = 'team-member';
            if (!this.playerAvatars[p.steamId]) this.loadPlayerAvatar(p.steamId);
            div.classList.toggle('offline', !p.isOnline);
            div.classList.toggle('dead', p.isOnline && !p.isAlive);
            const playerColor = this.getPlayerColor(p.steamId);
            const status = !p.isOnline
                ? '⚫ Offline'
                : !p.isAlive
                    ? '💀 Dead'
                    : `<span style="color:${playerColor};">● Online</span>`;
            const pos = p.isOnline && p.isAlive ? `📍 ${this.worldToGrid(p.x, p.y)}` : '';
            div.innerHTML = `<div class="team-member-name">${p.name} ${p.steamId === team.leaderSteamId ? '👑' : ''}</div>
                             <div class="team-member-status">${status} ${pos}</div>`;
            if (p.isOnline && p.isAlive) {
                div.style.borderLeftColor = playerColor;
            }
            // Click to zoom to player position
            if (p.isOnline && p.isAlive) {
                div.style.cursor = 'pointer';
                div.addEventListener('click', () => this.zoomToWorldPosition(p.x, p.y));
            }
            teamList.appendChild(div);
        });
    }

    updateEventsList() {
        const events = this.serverData?.events?.all || [];
        const eventsList = document.getElementById('eventsList');
        eventsList.innerHTML = events.length === 0 ? '<div class="timeline-empty">No recent events</div>' : '';

        // First load: initialize without creating notifications
        if (!this.previousEvents) {
            this.previousEvents = [...events];

            events.slice(0, 10).forEach(event => {
                eventsList.appendChild(this.createTimelineItem(event));
            });
            return;
        }

        // Compare with previous events (only after first load)
        const newEvents = events.filter(event => !this.previousEvents.includes(event));

        // Create notifications only for truly new events
        newEvents.forEach(event => {
            if (this.notificationManager) {
                let eventType = 'cargo';
                const eventLower = event.toLowerCase();

                if (eventLower.includes('cargo') || eventLower.includes('barco')) {
                    eventType = 'cargo';
                } else if (eventLower.includes('heli') || eventLower.includes('helicóptero') || eventLower.includes('helicopter')) {
                    eventType = 'heli';
                } else if (eventLower.includes('crate') || eventLower.includes('caja')) {
                    eventType = 'crate';
                } else if (eventLower.includes('raid') || eventLower.includes('ataque')) {
                    eventType = 'raid';
                }

                this.notificationManager.addNotification(eventType, event);
            }
        });

        this.previousEvents = [...events];

        events.slice(0, 10).forEach(event => {
            eventsList.appendChild(this.createTimelineItem(event));
        });
    }

    createTimelineItem(eventText) {
        const div = document.createElement('div');
        div.className = 'timeline-item';

        // Determine icon based on event content
        const lower = eventText.toLowerCase();
        let icon = '📡';
        if (lower.includes('cargo') || lower.includes('barco')) icon = '🚢';
        else if (lower.includes('heli') || lower.includes('helicopter') || lower.includes('helicóptero')) icon = '🚁';
        else if (lower.includes('chinook')) icon = '🚁';
        else if (lower.includes('crate') || lower.includes('caja')) icon = '📦';
        else if (lower.includes('oil') || lower.includes('rig')) icon = '🛢️';
        else if (lower.includes('vendor') || lower.includes('vendedor') || lower.includes('shop')) icon = '🛒';
        else if (lower.includes('deep sea')) icon = '🌊';

        div.innerHTML = `<div class="timeline-item-header">
            <span class="timeline-item-icon">${icon}</span>
            <span class="timeline-item-text">${this.escapeHtml(eventText)}</span>
        </div>`;
        return div;
    }

    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-exit');
            toast.addEventListener('animationend', () => toast.remove());
        }, duration);
    }

    showNotification(type, message) {
        this.showToast(message, type);
    }

    toggleTheme() {
        const root = document.documentElement;
        const current = root.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
        localStorage.setItem('rustplus-theme', next);
        const btn = document.getElementById('themeToggleBtn');
        if (btn) btn.textContent = next === 'light' ? '\u2600\uFE0F' : '\uD83C\uDF19';
    }

    initTheme() {
        const saved = localStorage.getItem('rustplus-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
        const btn = document.getElementById('themeToggleBtn');
        if (btn) btn.textContent = saved === 'light' ? '\u2600\uFE0F' : '\uD83C\uDF19';
    }

    toggleMobileNav() {
        const nav = document.querySelector('.header-nav');
        if (nav) nav.classList.toggle('mobile-open');
    }

    showLoadingOverlay(container) {
        if (!container) return;
        const existing = container.querySelector('.loading-overlay');
        if (existing) return;
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="loading-spinner"></div>';
        container.style.position = container.style.position || 'relative';
        container.appendChild(overlay);
    }

    hideLoadingOverlay(container) {
        if (!container) return;
        const overlay = container.querySelector('.loading-overlay');
        if (overlay) overlay.remove();
    }

    showSkeletonLoading(container, count = 3) {
        if (!container) return;
        container.innerHTML = Array.from({ length: count }, () =>
            '<div class="skeleton skeleton-card"></div>'
        ).join('');
    }

    updateConnectionStatus(connected) {
        const status = document.getElementById('connectionStatus');
        status.textContent = connected ? '● Connected' : '● Disconnected';
        status.className = connected ? 'status-connected' : 'status-disconnected';
    }

    updateLastUpdateTime() {
        document.getElementById('lastUpdate').textContent = `Last update: ${new Date().toLocaleTimeString()}`;
    }

    formatGameTime(time) {
        const h = Math.floor(time);
        const m = Math.floor((time - h) * 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    formatWipeTime(timestamp) {
        const diff = (Date.now() / 1000 - timestamp) / 3600;
        if (diff < 24) return `${Math.floor(diff)}h ago`;
        return `${Math.floor(diff / 24)}d ago`;
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(RustPlusWebUI.prototype, descriptors);
