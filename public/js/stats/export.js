/* Extracted from statistics.js - methods are verbatim; they are copied onto StatisticsManager.prototype below. */
import { StatisticsManager } from '../statistics.js';

const Methods = class {
    exportToCSV(headers, rows, filename) {
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => {
                const str = String(cell ?? '');
                return str.includes(',') || str.includes('"') || str.includes('\n')
                    ? `"${str.replace(/"/g, '""')}"` : str;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        if (window.rustplusUI?.showToast) {
            window.rustplusUI.showToast(`Exported ${rows.length} rows`, 'success', 2000);
        }
    }

    async exportCurrentTab() {
        try {
            const tab = this.currentView;
            if (tab === 'players') {
                const data = await this.apiClient.get(`/api/statistics/players/${this.guildId}?serverId=${this.serverId}`);
                const headers = ['Name', 'Steam ID', 'Total Playtime (h)', 'Sessions', 'Last Seen'];
                const rows = data.map(p => [
                    p.name, p.steam_id,
                    (p.total_playtime_seconds / 3600).toFixed(1),
                    p.session_count,
                    p.last_seen ? new Date(p.last_seen * 1000).toISOString() : ''
                ]);
                this.exportToCSV(headers, rows, 'players');
            } else if (tab === 'sessions') {
                const teamData = window.rustplusUI?.serverData?.team;
                if (!teamData) return;
                const steamIds = teamData.players.map(p => p.steamId).join(',');
                const data = await this.apiClient.get(`/api/statistics/sessions/${this.guildId}?steamIds=${steamIds}&serverId=${this.serverId}&limit=10000`);
                const headers = ['Player', 'Steam ID', 'Start', 'End', 'Duration (min)', 'Active'];
                const rows = [];
                for (const [steamId, sessions] of Object.entries(data)) {
                    const name = teamData.players.find(p => p.steamId === steamId)?.name || steamId;
                    sessions.forEach(s => {
                        rows.push([
                            name, steamId,
                            new Date(s.session_start * 1000).toISOString(),
                            s.session_end ? new Date(s.session_end * 1000).toISOString() : 'Active',
                            s.duration_seconds ? (s.duration_seconds / 60).toFixed(1) : '',
                            s.is_active ? 'Yes' : 'No'
                        ]);
                    });
                }
                this.exportToCSV(headers, rows, 'sessions');
            } else if (tab === 'deaths') {
                const data = await this.apiClient.get(`/api/statistics/deaths/${this.guildId}?serverId=${this.serverId}`);
                const headers = ['Player', 'Steam ID', 'X', 'Y', 'Grid', 'Time'];
                const rows = data.map(d => [
                    d.name || '', d.steam_id || '',
                    d.x || '', d.y || '', d.grid || '',
                    d.timestamp ? new Date(d.timestamp * 1000).toISOString() : ''
                ]);
                this.exportToCSV(headers, rows, 'deaths');
            } else if (tab === 'chat') {
                const data = await this.apiClient.get(`/api/statistics/chat-history/${this.guildId}?serverId=${this.serverId}`);
                const headers = ['Player', 'Steam ID', 'Message', 'Time'];
                const rows = data.map(m => [
                    m.name || '', m.steam_id || '',
                    m.message || '',
                    m.timestamp ? new Date(m.timestamp * 1000).toISOString() : ''
                ]);
                this.exportToCSV(headers, rows, 'chat');
            } else {
                if (window.rustplusUI?.showToast) {
                    window.rustplusUI.showToast('Export not available for this tab', 'info');
                }
            }
        } catch (e) {
            console.error('Export error:', e);
            if (window.rustplusUI?.showToast) {
                window.rustplusUI.showToast('Export failed', 'error');
            }
        }
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(StatisticsManager.prototype, descriptors);
