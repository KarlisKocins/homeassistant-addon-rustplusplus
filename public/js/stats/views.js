/* Extracted from statistics.js - methods are verbatim; they are copied onto StatisticsManager.prototype below. */
import { StatisticsManager } from '../statistics.js';

const Methods = class {
    async loadOverview() {
        try {
            const t = (key) => window.rustplusUI?.languageManager?.get(key) || key;
            const teamData = window.rustplusUI?.serverData?.team;
            if (!teamData || !teamData.players || teamData.players.length === 0) {
                document.getElementById('statisticsBody').innerHTML = `
                    <div class="info">${t('stats.noTeamData')}</div>
                `;
                return;
            }

            const steamIds = teamData.players.map(p => p.steamId);
            const defaultHours = 168; // 7 days default
            const [teamStats, connectionStats] = await Promise.all([
                this.apiClient.get(`/api/statistics/team/${this.guildId}?steamIds=${steamIds.join(',')}&serverId=${this.serverId}`),
                this.apiClient.get(`/api/statistics/connections/${this.guildId}?hours=${defaultHours}&serverId=${this.serverId}`)
            ]);

            const body = document.getElementById('statisticsBody');
            body.innerHTML = `
                <div class="stats-overview">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon">👥</div>
                            <div class="stat-value">${teamStats.playerCount || 0}</div>
                            <div class="stat-label">${t('stats.teamMembers')}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">🎮</div>
                            <div class="stat-value">${teamStats.totalSessions || 0}</div>
                            <div class="stat-label">${t('stats.totalSessions')}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">⏱️</div>
                            <div class="stat-value">${teamStats.totalPlaytimeHours || 0}h</div>
                            <div class="stat-label">${t('stats.totalPlaytime')}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">📈</div>
                            <div class="stat-value">${Math.floor(teamStats.avgSessionSeconds / 60) || 0}m</div>
                            <div class="stat-label">${t('stats.avgSession')}</div>
                        </div>
                    </div>

                    <h3>${t('stats.teamMembersOverview')}</h3>
                    <div class="team-stats-grid">
                        ${teamStats.playerStats.map(stat => `
                            <div class="team-member-card">
                                <div class="member-name">${this.getPlayerName(stat.steamId)}</div>
                                <div class="member-stats">
                                    <span>⏱️ ${stat.totalPlaytimeHours}h ${Math.floor((stat.totalPlaytimeSeconds % 3600) / 60)}m</span>
                                    <span>🎮 ${stat.totalSessions} sessions</span>
                                    <span>💀 ${stat.totalDeaths} deaths</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin: 30px 0 15px 0;">
                        <h3 style="margin: 0;">${t('stats.populationTimeline')}</h3>
                        <div class="time-range-selector">
                            <label style="margin-right: 8px;">${t('stats.timeRange')}</label>
                            <select id="populationTimeRange" onchange="window.rustplusUI.statisticsManager.updatePopulationTimeline()">
                                <option value="24">${t('stats.last24h')}</option>
                                <option value="72">${t('stats.last3days')}</option>
                                <option value="168" selected>${t('stats.last7days')}</option>
                                <option value="336">${t('stats.last14days')}</option>
                                <option value="720">${t('stats.last30days')}</option>
                                <option value="2160">${t('stats.last90days')}</option>
                                <option value="4320">${t('stats.last180days')}</option>
                            </select>
                        </div>
                    </div>
                    <div class="chart-container">
                        <canvas id="connectionChart"></canvas>
                    </div>
                    
                    <div id="dbInfo" class="db-info" style="margin-top: 20px;"></div>
                </div>
            `;

            this.renderPopulationTimeline(connectionStats);
            this.loadDatabaseInfo();
        } catch (error) {
            console.error('Error loading overview:', error);
            const t = (key) => window.rustplusUI?.languageManager?.get(key) || key;
            document.getElementById('statisticsBody').innerHTML = `
                <div class="error">${t('stats.failedToLoad')} ${error.message}</div>
            `;
        }
    }

    async updatePopulationTimeline() {
        try {
            const hours = parseInt(document.getElementById('populationTimeRange')?.value || '168');
            const connectionStats = await this.apiClient.get(`/api/statistics/connections/${this.guildId}?hours=${hours}&serverId=${this.serverId}`);
            this.renderPopulationTimeline(connectionStats);
        } catch (error) {
            console.error('Error updating population timeline:', error);
        }
    }

    getPlayerName(steamId) {
        const teamData = window.rustplusUI?.serverData?.team;
        if (!teamData) return 'Unknown';
        const player = teamData.players.find(p => p.steamId === steamId);
        return player ? player.name : 'Unknown';
    }

    async loadPlayers() {
        try {
            const t = (key) => window.rustplusUI?.languageManager?.get(key) || key;
            const teamData = window.rustplusUI?.serverData?.team;
            if (!teamData || !teamData.players) {
                document.getElementById('statisticsBody').innerHTML = `
                    <div class="info">${t('stats.noTeamData')}</div>
                `;
                return;
            }

            const steamIds = teamData.players.map(p => p.steamId);
            const playerStats = await Promise.all(
                steamIds.map(id => this.apiClient.get(`/api/statistics/player/${this.guildId}/${id}?serverId=${this.serverId}`))
            );

            const body = document.getElementById('statisticsBody');
            body.innerHTML = `
                <div class="players-stats">
                    <h3>${t('stats.teamPlayers')}</h3>
                    <div class="players-list">
                        ${playerStats.map((data, idx) => {
                const player = teamData.players[idx];
                const stats = data.stats;
                return `
                                <div class="player-stat-card" style="border-left: 4px solid ${data.color};">
                                    <div class="player-stat-header">
                                        <img src="${window.RPP_BASE}/api/avatar/${player.steamId}" alt="${player.name}" class="player-avatar-small">
                                        <div>
                                            <h4>${player.name}</h4>
                                            <span class="steam-id">${player.steamId}</span>
                                        </div>
                                    </div>
                                    <div class="player-stat-details">
                                        <div class="stat-row">
                                            <span>${t('stats.totalPlaytimeLabel')}</span>
                                            <strong>${stats.totalPlaytimeHours}h ${Math.floor((stats.totalPlaytimeSeconds % 3600) / 60)}m</strong>
                                        </div>
                                        <div class="stat-row">
                                            <span>${t('stats.sessionsLabel')}</span>
                                            <strong>${stats.totalSessions}</strong>
                                        </div>
                                        <div class="stat-row">
                                            <span>${t('stats.avgSessionLabel')}</span>
                                            <strong>${Math.floor(stats.avgSessionSeconds / 60)}m</strong>
                                        </div>
                                        <div class="stat-row">
                                            <span>${t('stats.longestSessionLabel')}</span>
                                            <strong>${Math.floor(stats.longestSessionSeconds / 3600)}h ${Math.floor((stats.longestSessionSeconds % 3600) / 60)}m</strong>
                                        </div>
                                        <div class="stat-row">
                                            <span>${t('stats.deathsLabel')}</span>
                                            <strong>${stats.totalDeaths} (${stats.deathsPerHour.toFixed(2)}/hr)</strong>
                                        </div>
                                    </div>
                                    <button class="view-details-btn" onclick="window.rustplusUI.statisticsManager.viewPlayerDetails('${player.steamId}', '${player.name}')">
                                        ${t('stats.viewDetails')}
                                    </button>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading players:', error);
            const t = (key) => window.rustplusUI?.languageManager?.get(key) || key;
            document.getElementById('statisticsBody').innerHTML = `
                <div class="error">${t('stats.failedToLoad')} ${error.message}</div>
            `;
        }
    }

    async viewPlayerDetails(steamId, playerName) {
        try {
            const data = await this.apiClient.get(`/api/statistics/player/${this.guildId}/${steamId}?serverId=${this.serverId}`);

            // Helper function to get session duration (including active sessions)
            const now = Math.floor(Date.now() / 1000);
            const getSessionDuration = (session) => {
                if (session.duration_seconds && !session.is_active) {
                    return session.duration_seconds;
                }
                // For active sessions or missing duration, calculate from timestamps
                const endTime = session.session_end || now;
                return Math.max(0, endTime - session.session_start);
            };

            // Calculate enhanced statistics (including active sessions)
            const totalPlaytime = data.sessions.reduce((sum, s) => sum + getSessionDuration(s), 0);
            const avgSessionLength = data.sessions.length > 0 ? totalPlaytime / data.sessions.length : 0;
            const longestSession = Math.max(...data.sessions.map(s => getSessionDuration(s)), 0);
            const activeSessions = data.sessions.filter(s => s.is_active).length;
            const deathCount = data.deaths.length;
            const deathsPerHour = totalPlaytime > 0 ? (deathCount / (totalPlaytime / 3600)).toFixed(2) : 0;

            // Calculate play patterns (hours of day) - including active sessions
            const playByHour = new Array(24).fill(0);
            const playByDayOfWeek = new Array(7).fill(0);
            data.sessions.forEach(session => {
                const start = new Date(session.session_start * 1000);
                const duration = getSessionDuration(session);
                playByHour[start.getHours()] += duration / 3600;
                playByDayOfWeek[start.getDay()] += duration / 3600;
            });

            const favoriteHour = playByHour.indexOf(Math.max(...playByHour));
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const favoriteDay = dayNames[playByDayOfWeek.indexOf(Math.max(...playByDayOfWeek))];

            const body = document.getElementById('statisticsBody');
            body.innerHTML = `
                <div class="player-details">
                    <button class="back-button" onclick="window.rustplusUI.statisticsManager.loadPlayers()">← Back to Players</button>
                    <div class="player-header" style="border-left: 4px solid ${data.color};">
                        <img src="${window.RPP_BASE}/api/avatar/${steamId}" alt="${this.escapeHtml(playerName)}" class="player-avatar-large">
                        <div style="flex: 1;">
                            <h2>${this.escapeHtml(playerName)}</h2>
                            <span class="steam-id">${steamId}</span>
                            ${activeSessions > 0 ? '<span style="color: #4caf50; font-weight: bold; margin-left: 10px;">● ONLINE</span>' : ''}
                        </div>
                    </div>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon">⏱️</div>
                            <div class="stat-value">${Math.floor(totalPlaytime / 3600)}h ${Math.floor((totalPlaytime % 3600) / 60)}m</div>
                            <div class="stat-label">Total Playtime</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">📊</div>
                            <div class="stat-value">${Math.floor(avgSessionLength / 60)} min</div>
                            <div class="stat-label">Avg Session</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">🏆</div>
                            <div class="stat-value">${Math.floor(longestSession / 3600)}h ${Math.floor((longestSession % 3600) / 60)}m</div>
                            <div class="stat-label">Longest Session</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">💀</div>
                            <div class="stat-value">${deathCount}</div>
                            <div class="stat-label">Total Deaths</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">📈</div>
                            <div class="stat-value">${data.sessions.length}</div>
                            <div class="stat-label">Total Sessions</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">⚠️</div>
                            <div class="stat-value">${deathsPerHour}</div>
                            <div class="stat-label">Deaths/Hour</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">🕐</div>
                            <div class="stat-value">${favoriteHour}:00</div>
                            <div class="stat-label">Favorite Hour</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">📅</div>
                            <div class="stat-value">${favoriteDay.substring(0, 3)}</div>
                            <div class="stat-label">Favorite Day</div>
                        </div>
                    </div>
                    
                    <h3>Session Duration Over Time</h3>
                    <canvas id="sessionChart" style="margin-bottom: 20px;"></canvas>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <div>
                            <h3>Activity by Hour of Day</h3>
                            <canvas id="hourlyActivityChart"></canvas>
                        </div>
                        <div>
                            <h3>Activity by Day of Week</h3>
                            <canvas id="weeklyActivityChart"></canvas>
                        </div>
                    </div>
                    
                    <h3>Recent Sessions (${data.sessions.length} total)</h3>
                    <div class="sessions-list">
                        ${data.sessions.slice(0, 15).map(session => {
                const duration = getSessionDuration(session);
                const hours = Math.floor(duration / 3600);
                const minutes = Math.floor((duration % 3600) / 60);
                const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
                return `
                            <div class="session-item ${session.is_active ? 'active' : ''}">
                                <div class="session-time">
                                    ${new Date(session.session_start * 1000).toLocaleString()}
                                    ${session.session_end ? '→ ' + new Date(session.session_end * 1000).toLocaleString() : '<span style="color: #4caf50;"> (Active Now)</span>'}
                                </div>
                                <div class="session-duration">
                                    ⏱️ ${durationStr}${session.is_active ? ' <span style="color: #4caf50;">(ongoing)</span>' : ''}
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                    
                    <h3>Recent Deaths (${deathCount} total)</h3>
                    <div class="deaths-list">
                        ${data.deaths.length > 0 ? data.deaths.slice(0, 15).map(death => `
                            <div class="death-item">
                                <div class="death-time">💀 ${new Date(death.death_time * 1000).toLocaleString()}</div>
                                <div class="death-location">
                                    ${death.x && death.y ? `📍 Location: (${Math.floor(death.x)}, ${Math.floor(death.y)})` : '📍 Unknown location'}
                                </div>
                            </div>
                        `).join('') : '<p style="color: #888; text-align: center; padding: 20px;">No deaths recorded yet 🎉</p>'}
                    </div>

                    <div id="playerAchievementsSection" style="margin-top: 20px;"></div>
                </div>
            `;

            // Render charts with proper sizing
            requestAnimationFrame(() => {
                this.renderPlayerSessionChart(data.sessions, data.color);
                this.renderHourlyActivityChart(playByHour, data.color);
                this.renderWeeklyActivityChart(playByDayOfWeek, data.color);

                // Load achievements
                const achievementsContainer = document.getElementById('playerAchievementsSection');
                if (achievementsContainer && window.rustplusUI?.achievementManager) {
                    window.rustplusUI.achievementManager.loadAndRender(
                        achievementsContainer, this.guildId, this.serverId, steamId, playerName
                    );
                }
            });
        } catch (error) {
            console.error('Error loading player details:', error);
            const body = document.getElementById('statisticsBody');
            body.innerHTML = '<p style="color: #888; text-align: center; padding: 40px;">Error loading player details</p>';
        }
    }

    async loadSessions() {
        const teamData = window.rustplusUI?.serverData?.team;
        if (!teamData || !teamData.players || teamData.players.length === 0) {
            document.getElementById('statisticsBody').innerHTML = '<div class="info">No team data available.</div>';
            return;
        }

        const body = document.getElementById('statisticsBody');
        body.innerHTML = `
            <div class="sessions-overview">
                <div class="time-range-controls">
                    <h3>Team Session Timeline</h3>
                    <div class="time-range-selector">
                        <label>Time Range:</label>
                        <select id="timeRangeSelect" onchange="window.rustplusUI.statisticsManager.updateSessionTimeline()">
                            <option value="24">Last 24 Hours</option>
                            <option value="72">Last 3 Days</option>
                            <option value="168" selected>Last Week</option>
                            <option value="336">Last 2 Weeks</option>
                            <option value="720">Last 30 Days</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                </div>
                <div class="timeline-legend">
                    <span class="legend-item"><span class="legend-box" style="background: #4caf50;"></span> Online</span>
                    <span class="legend-item"><span class="legend-box" style="background: #333;"></span> Offline</span>
                </div>
                <canvas id="allSessionsChart"></canvas>
            </div>
        `;

        await this.updateSessionTimeline();
    }

    async loadDeaths() {
        const body = document.getElementById('statisticsBody');
        body.innerHTML = `
            <div class="deaths-overview">
                <div class="time-range-controls">
                    <h3>💀 Death Statistics</h3>
                    <div class="time-range-selector">
                        <label>Time Range:</label>
                        <select id="deathTimeRangeSelect" onchange="window.rustplusUI.statisticsManager.updateDeathsView()">
                            <option value="24">Last 24 Hours</option>
                            <option value="72">Last 3 Days</option>
                            <option value="168" selected>Last Week</option>
                            <option value="336">Last 2 Weeks</option>
                            <option value="720">Last 30 Days</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                </div>
                <div id="deathsContent">
                    <div class="loading">Loading death statistics...</div>
                </div>
            </div>
        `;

        await this.updateDeathsView();
    }

    async updateDeathsView() {
        try {
            const timeRange = document.getElementById('deathTimeRangeSelect')?.value || '168';
            const now = Math.floor(Date.now() / 1000);
            const startTime = timeRange === 'all' ? 0 : now - (parseInt(timeRange) * 3600);

            const url = `/api/statistics/deaths/${this.guildId}?startTime=${startTime}&endTime=${now}&limit=10000&serverId=${this.serverId || ''}`;
            console.log('[Deaths] Fetching from URL:', url);

            const deathsResponse = await this.apiClient.get(url);
            console.log('[Deaths] Received deaths:', deathsResponse);

            const content = document.getElementById('deathsContent');

            // Handle both array and object formats
            let deathsArray = Array.isArray(deathsResponse) ? deathsResponse : Object.values(deathsResponse).flat();

            // Group deaths by steam_id
            const deaths = {};
            deathsArray.forEach(death => {
                const steamId = death.steam_id;
                if (!deaths[steamId]) {
                    deaths[steamId] = [];
                }
                deaths[steamId].push(death);
            });

            // Calculate statistics
            const totalDeaths = deathsArray.length;
            const playerDeathCounts = {};
            const deathsByHour = new Array(24).fill(0);
            const recentDeaths = [];

            Object.entries(deaths).forEach(([steamId, playerDeaths]) => {
                playerDeathCounts[steamId] = playerDeaths.length;
                playerDeaths.forEach(death => {
                    const date = new Date(death.death_time * 1000);
                    deathsByHour[date.getHours()]++;
                    recentDeaths.push({ ...death, steamId });
                });
            });

            // Sort recent deaths by time
            recentDeaths.sort((a, b) => b.death_time - a.death_time);

            // Find most dangerous hour
            const maxDeathHour = deathsByHour.indexOf(Math.max(...deathsByHour));
            const avgDeathsPerDay = totalDeaths / (timeRange === 'all' ? 30 : parseInt(timeRange) / 24);

            // Get player names
            const teamData = window.rustplusUI?.serverData?.team;
            const getPlayerName = (steamId) => {
                if (!teamData) return 'Unknown';
                const player = teamData.players.find(p => p.steamId === steamId);
                return player ? player.name : 'Unknown';
            };

            // Top death leaders
            const topDeaths = Object.entries(playerDeathCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            content.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">💀</div>
                        <div class="stat-value">${totalDeaths}</div>
                        <div class="stat-label">Total Deaths</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-value">${avgDeathsPerDay.toFixed(1)}</div>
                        <div class="stat-label">Deaths/Day</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">⏰</div>
                        <div class="stat-value">${maxDeathHour}:00</div>
                        <div class="stat-label">Most Dangerous Hour</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-value">${Object.keys(playerDeathCounts).length}</div>
                        <div class="stat-label">Players with Deaths</div>
                    </div>
                </div>
                
                <h3>Deaths by Hour of Day</h3>
                <canvas id="deathsByHourChart" style="max-height: 250px; margin-bottom: 30px;"></canvas>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                    <div>
                        <h3>💀 Most Deaths Leaderboard</h3>
                        <div class="deaths-list">
                            ${topDeaths.length > 0 ? topDeaths.map(([steamId, count], index) => `
                                <div class="death-item" style="background: ${index === 0 ? 'rgba(255, 87, 34, 0.1)' : 'var(--bg-primary)'}; border-left: 3px solid ${index === 0 ? '#ff5722' : index === 1 ? '#ff9800' : index === 2 ? '#ffc107' : '#666'};">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <img src="${window.RPP_BASE}/api/avatar/${steamId}" alt="" class="chat-avatar" style="width: 30px; height: 30px;">
                                        <div style="flex: 1;">
                                            <div style="font-weight: bold;">${index + 1}. ${this.escapeHtml(getPlayerName(steamId))}</div>
                                            <div style="font-size: 11px; color: var(--text-secondary);">${steamId}</div>
                                        </div>
                                        <div style="font-size: 20px; font-weight: bold; color: ${index === 0 ? '#ff5722' : '#888'};">${count}</div>
                                    </div>
                                </div>
                            `).join('') : '<p style="color: #888; text-align: center; padding: 20px;">No deaths recorded</p>'}
                        </div>
                    </div>
                    <div>
                        <h3>🕐 Recent Deaths</h3>
                        <div class="deaths-list">
                            ${recentDeaths.slice(0, 10).map(death => `
                                <div class="death-item">
                                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                        <img src="${window.RPP_BASE}/api/avatar/${death.steamId}" alt="" class="chat-avatar" style="width: 25px; height: 25px;">
                                        <div style="font-weight: bold;">${this.escapeHtml(getPlayerName(death.steamId))}</div>
                                    </div>
                                    <div class="death-time">${new Date(death.death_time * 1000).toLocaleString()}</div>
                                    <div class="death-location">
                                        ${death.x && death.y ? `📍 Location: (${Math.floor(death.x)}, ${Math.floor(death.y)})` : '📍 Unknown location'}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <h3>All Deaths Map</h3>
                <div style="background: var(--bg-primary); padding: 15px; border-radius: 8px; text-align: center;">
                    <p style="color: var(--text-secondary); margin: 10px 0;">💡 Death locations are shown on the main map with skull markers</p>
                    <button class="primary-button" onclick="document.getElementById('showDeathMarkers').checked = true; window.rustplusUI.dirtyDynamic = true; window.rustplusUI.needsRender = true; document.getElementById('statisticsPanel').style.display='none';">
                        📍 View Deaths on Map
                    </button>
                </div>
            `;

            // Render deaths by hour chart
            this.renderDeathsByHourChart(deathsByHour);

        } catch (error) {
            console.error('Error loading deaths:', error);
            const content = document.getElementById('deathsContent');
            content.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">Error loading death statistics</p>';
        }
    }

    async loadChatHistory() {
        try {
            const t = (key) => window.rustplusUI?.languageManager?.get(key) || key;
            const body = document.getElementById('statisticsBody');

            // If already loading, don't repeat
            if (this.isLoadingChat) return;

            // If we already have chat history in cache, render it immediately
            if (this.chatHistory.length > 0) {
                this.renderChatHistory();
            }

            // If we haven't loaded from API yet, do it now
            if (!this.isChatLoaded) {
                this.isLoadingChat = true;

                const encodedServerId = this.serverId ? encodeURIComponent(this.serverId) : '';
                const url = `/api/statistics/chat/${this.guildId}?limit=500&serverId=${encodedServerId}`;
                console.log(`[Statistics] Initial loading of chat history from: ${url}`);

                const chatResponse = await this.apiClient.get(url);
                console.log(`[Statistics] Chat history response count: ${chatResponse?.length || 0}`);

                if (chatResponse && chatResponse.length > 0) {
                    // Update cache with historical messages, avoid duplicates
                    const existingIds = new Set(this.chatHistory.map(m => `${m.steam_id}-${m.timestamp}-${m.message.substring(0, 20)}`));

                    chatResponse.forEach(msg => {
                        const id = `${msg.steam_id}-${msg.timestamp}-${msg.message.substring(0, 20)}`;
                        if (!existingIds.has(id)) {
                            this.chatHistory.push(msg);
                        }
                    });

                    // Sort cache by timestamp
                    this.chatHistory.sort((a, b) => a.timestamp - b.timestamp);

                    // Keep reasonable limit
                    if (this.chatHistory.length > 1000) {
                        this.chatHistory = this.chatHistory.slice(-1000);
                    }
                }

                this.isChatLoaded = true;
                this.isLoadingChat = false;

                // Auto-sync from Discord if empty and not yet synced this session
                if (this.chatHistory.length === 0 && !this.hasSyncedThisSession) {
                    console.log('[Statistics] Chat history empty, triggering auto-sync from Discord...');
                    this.hasSyncedThisSession = true;
                    await this.syncFromDiscord(true); // true = silent
                } else {
                    this.renderChatHistory();
                }
            }

        } catch (error) {
            this.isLoadingChat = false;
            console.error('Error loading chat history:', error);
            const t = (key) => window.rustplusUI?.languageManager?.get(key) || key;
            const body = document.getElementById('statisticsBody');
            if (body && (!this.chatHistory || this.chatHistory.length === 0)) {
                body.innerHTML = `
                    <div class="error">${t('stats.failedToLoad')} ${error.message}</div>
                `;
            }
        }
    }

    renderChatHistory() {
        const body = document.getElementById('statisticsBody');
        const t = (key) => window.rustplusUI?.languageManager?.get(key) || key;

        if (!body || this.currentView !== 'chat') return;

        if (this.chatHistory.length === 0) {
            body.innerHTML = `
                <div class="chat-history">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0;">${t('stats.tab.chat')}</h3>
                    </div>
                    <div id="emptyChatInfo" class="info">No chat messages found.</div>
                    <div class="chat-messages" style="display: none;"></div>
                </div>
            `;
            return;
        }

        body.innerHTML = `
            <div class="chat-history">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0;">${t('stats.tab.chat')}</h3>
                </div>
                <div class="chat-messages">
                    ${this.chatHistory.map(msg => `
                        <div class="chat-message">
                            <div class="chat-header">
                                <img src="${window.RPP_BASE}/api/avatar/${msg.steam_id}" alt="${msg.player_name}" class="chat-avatar">
                                <strong>${this.escapeHtml(msg.player_name)}</strong>
                                <span class="chat-time">${new Date(msg.timestamp * 1000).toLocaleString()}</span>
                            </div>
                            <div class="chat-text">${this.escapeHtml(msg.message)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Auto-scroll to bottom
        const container = body.querySelector('.chat-messages');
        if (container) container.scrollTop = container.scrollHeight;
    }

    async refreshChatHistory() {
        this.isChatLoaded = false;
        await this.loadChatHistory();
    }

    async syncFromDiscord(silent = false) {
        const btn = document.getElementById('syncDiscordBtn');
        const originalText = btn ? btn.innerHTML : '';

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '⌛ Syncing...';
        }

        try {
            console.log('[Statistics] Requesting Discord chat sync...');
            const result = await this.apiClient.post(`/api/statistics/sync-chat/${this.guildId}?limit=100`, {});

            if (result.success) {
                if (!silent) alert(`✅ Successfully synced ${result.synced} messages from Discord! (${result.skipped} duplicates skipped)`);
                // Force reload
                this.isChatLoaded = false;
                await this.loadChatHistory();
            } else {
                if (!silent) alert(`❌ Sync failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Error syncing from Discord:', error);
            if (!silent) alert(`❌ Error syncing: ${error.message}`);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    }

    handleNewChatMessage(msg) {
        // ALWAYS store in cache even if tab is not active
        const exists = this.chatHistory.some(m =>
            m.steam_id === msg.steam_id &&
            Math.abs(m.timestamp - msg.timestamp) < 2 &&
            m.message === msg.message
        );

        if (!exists) {
            this.chatHistory.push(msg);

            // Limit cache size
            if (this.chatHistory.length > 1000) {
                this.chatHistory.shift();
            }
        }

        // Only update UI if we are currently looking at the chat tab
        if (this.currentView !== 'chat') return;

        this.renderChatHistory();
    }

    async loadReplay() {
        const body = document.getElementById('statisticsBody');
        body.innerHTML = `
    < div class="replay-container" >
                <h3>Map Replay</h3>
                <p class="info-text">View historical player movements on the main map with a timeline scrubber.</p>
                
                <div class="replay-setup">
                    <div class="form-group">
                        <label for="replayTimeRange">Time Range:</label>
                        <select id="replayTimeRange" class="form-control">
                            <option value="60">Last 1 Hour</option>
                            <option value="360">Last 6 Hours</option>
                            <option value="720">Last 12 Hours</option>
                            <option value="1440" selected>Last 24 Hours</option>
                            <option value="4320">Last 3 Days</option>
                            <option value="10080">Last 7 Days</option>
                            <option value="43200">Last 30 Days (Full History)</option>
                        </select>
                    </div>
                    
                    <button id="startReplayBtn" class="primary-button large">
                        🎬 Start Map Replay
                    </button>
                    
                    <div id="replayStatus" class="replay-status"></div>
                </div>
                
                <div class="replay-info-box">
                    <h4>How to use:</h4>
                    <ul>
                        <li>Select a time range above</li>
                        <li>Click "Start Map Replay" to load position data</li>
                        <li>Replay controls will appear at the bottom of the main map</li>
                        <li>Use the timeline scrubber to jump to any point in history</li>
                        <li>Play/pause and adjust speed with the control buttons</li>
                        <li>Click "Exit Replay" on the map to return to live view</li>
                    </ul>
                </div>
            </div >
    `;

        document.getElementById('startReplayBtn').onclick = () => this.startMapReplay();
    }

    async startMapReplay() {
        const minutes = parseInt(document.getElementById('replayTimeRange').value);
        const status = document.getElementById('replayStatus');
        const btn = document.getElementById('startReplayBtn');

        btn.disabled = true;
        status.innerHTML = '<div class="loading">Loading replay data...</div>';

        try {
            const replayData = await this.apiClient.get(`/api/statistics/replay/${this.guildId}?minutes=${minutes}&serverId=${this.serverId}`);

            const playerCount = Object.keys(replayData).length;
            const totalPositions = Object.values(replayData).reduce((sum, p) => sum + p.positions.length, 0);

            if (playerCount === 0 || totalPositions === 0) {
                status.innerHTML = '<div class="error">No replay data available for this time range.</div>';
                btn.disabled = false;
                return;
            }

            status.innerHTML = `<div class="success">✓ Loaded ${totalPositions.toLocaleString()} positions for ${playerCount} players</div>`;

            // Start replay on main map
            if (window.rustplusUI) {
                window.rustplusUI.setReplayMode(true, replayData);

                // Close statistics panel so user can see the map
                setTimeout(() => {
                    const panel = document.getElementById('statisticsPanel');
                    if (panel) panel.style.display = 'none';
                }, 1000);
            }

            btn.disabled = false;
        } catch (error) {
            status.innerHTML = `<div class="error">Error loading replay: ${error.message}</div>`;
            btn.disabled = false;
            console.error('Error loading replay:', error);
        }
    }

    async loadDatabaseInfo() {
        try {
            const info = await this.apiClient.get('/api/statistics/info');
            const dbInfo = document.getElementById('dbInfo');
            if (dbInfo) {
                dbInfo.innerHTML = `
Database: ${info.size.megabytes} MB |
    Last maintenance: ${info.maintenanceLog.length > 0 ?
                        new Date(info.maintenanceLog[0].timestamp * 1000).toLocaleString() : 'Never'
                    }
`;
            }
        } catch (error) {
            console.error('Error loading database info:', error);
        }
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(StatisticsManager.prototype, descriptors);
