/* Extracted from statistics.js - methods are verbatim; they are copied onto StatisticsManager.prototype below. */
import { StatisticsManager } from '../statistics.js';

const Methods = class {
    renderDeathsByHourChart(deathsByHour) {
        const canvas = document.getElementById('deathsByHourChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth || canvas.parentElement?.clientWidth || 800;
        canvas.height = 250;

        const data = deathsByHour.map((count, hour) => ({
            x: hour,
            y: count,
            label: `${hour}:00`
        }));

        const padding = { left: 50, right: 20, top: 30, bottom: 40 };
        const chartWidth = canvas.width - padding.left - padding.right;
        const chartHeight = canvas.height - padding.top - padding.bottom;
        const maxY = Math.max(...deathsByHour, 1) * 1.1;
        const barWidth = chartWidth / 24 * 0.7;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw title
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Deaths Distribution by Hour', canvas.width / 2, 20);

        // Draw bars
        data.forEach((point, i) => {
            const x = padding.left + (chartWidth / 24) * i + (chartWidth / 24 - barWidth) / 2;
            const barHeight = (point.y / maxY) * chartHeight;
            const y = padding.top + chartHeight - barHeight;

            // Gradient fill
            const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
            gradient.addColorStop(0, '#ff5722');
            gradient.addColorStop(1, '#ff5722aa');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);

            // Hour label (every 3 hours)
            if (i % 3 === 0) {
                ctx.fillStyle = '#888';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(i.toString(), x + barWidth / 2, canvas.height - 5);
            }
        });

        // Draw axes
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + chartHeight);
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.stroke();

        // Y-axis labels
        ctx.fillStyle = '#888';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + chartHeight - (chartHeight / 5) * i;
            const value = Math.floor((maxY / 5) * i);
            ctx.fillText(value.toString(), padding.left - 5, y + 4);
        }

        // Axis labels
        ctx.fillStyle = '#aaa';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Hour of Day', canvas.width / 2, canvas.height - 5);

        ctx.save();
        ctx.translate(15, canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Number of Deaths', 0, 0);
    }

    renderPopulationTimeline(data) {
        const canvas = document.getElementById('connectionChart');
        if (!canvas) return;

        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = 300;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!data || data.length === 0) {
            ctx.fillStyle = '#888';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
            return;
        }

        const padding = { top: 40, right: 40, bottom: 60, left: 60 };
        const chartWidth = canvas.width - padding.left - padding.right;
        const chartHeight = canvas.height - padding.top - padding.bottom;

        // Find max values
        const maxPlayers = Math.max(...data.map(d => d.online_players), 10);
        const maxQueue = Math.max(...data.map(d => d.queued_players || 0), 0);
        const maxValue = Math.max(maxPlayers, maxQueue) * 1.1;

        // Draw background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);

        // Draw grid lines
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartHeight / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();

            // Y-axis labels
            const value = Math.floor(maxValue * (1 - i / gridLines));
            ctx.fillStyle = '#888';
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(value.toString(), padding.left - 10, y + 4);
        }

        // Draw time labels (sample every N points for readability)
        const timeLabels = 6;
        const step = Math.floor(data.length / timeLabels);
        ctx.textAlign = 'center';
        for (let i = 0; i <= timeLabels; i++) {
            const idx = Math.min(i * step, data.length - 1);
            const x = padding.left + (chartWidth / data.length) * idx;
            const date = new Date(data[idx].timestamp * 1000);
            const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            ctx.fillText(timeStr, x, canvas.height - padding.bottom + 20);
        }

        // Function to draw line chart
        const drawLine = (dataKey, color, fillAlpha = 0.2) => {
            const points = data.map((point, i) => ({
                x: padding.left + (chartWidth / (data.length - 1)) * i,
                y: padding.top + chartHeight - ((point[dataKey] || 0) / maxValue) * chartHeight
            }));

            // Draw filled area
            ctx.fillStyle = color + Math.floor(fillAlpha * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.moveTo(points[0].x, chartHeight + padding.top);
            points.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.lineTo(points[points.length - 1].x, chartHeight + padding.top);
            ctx.closePath();
            ctx.fill();

            // Draw line
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            points.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
        };

        // Draw queue first (background layer)
        if (maxQueue > 0) {
            drawLine('queued_players', '#ff9800', 0.15);
        }

        // Draw online players (foreground layer)
        drawLine('online_players', '#4caf50', 0.25);

        // Draw border
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(padding.left, padding.top, chartWidth, chartHeight);

        // Draw legend
        const legendY = padding.top - 20;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';

        // Online players legend
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(padding.left, legendY, 15, 15);
        ctx.fillStyle = '#fff';
        ctx.fillText('Online Players', padding.left + 20, legendY + 12);

        // Queue legend
        if (maxQueue > 0) {
            ctx.fillStyle = '#ff9800';
            ctx.fillRect(padding.left + 150, legendY, 15, 15);
            ctx.fillStyle = '#fff';
            ctx.fillText('Queue', padding.left + 170, legendY + 12);
        }

        // Title
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Server Population Over Time', canvas.width / 2, 20);
    }

    renderPlayerSessionChart(sessions, color) {
        const canvas = document.getElementById('sessionChart');
        if (!canvas) {
            console.log('[Charts] Session chart canvas not found');
            return;
        }

        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth || canvas.parentElement?.clientWidth || 800;
        canvas.height = 300;

        const now = Math.floor(Date.now() / 1000);

        // Prepare data - show session durations over time (most recent 20)
        // Always calculate duration including active sessions
        const data = sessions
            .map(s => {
                let duration;
                if (s.duration_seconds && !s.is_active) {
                    duration = s.duration_seconds;
                } else {
                    // For active sessions, calculate current duration
                    const endTime = s.session_end || now;
                    duration = Math.max(0, endTime - s.session_start);
                }
                return {
                    x: s.session_start,
                    y: duration / 60,
                    timestamp: s.session_start,
                    isActive: s.is_active
                };
            })
            .filter(s => s.y > 0)
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-20);

        console.log('[Charts] Rendering session chart with', data.length, 'data points');
        this.renderSimpleBarChart(ctx, canvas, data, color, 'Session Duration (minutes)');
    }

    renderHourlyActivityChart(playByHour, color) {
        const canvas = document.getElementById('hourlyActivityChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth || canvas.parentElement?.clientWidth || 400;
        canvas.height = 200;

        const data = playByHour.map((hours, index) => ({
            x: index,
            y: hours,
            label: `${index}:00`
        }));

        this.renderSimpleBarChart(ctx, canvas, data, color, 'Hours Played by Hour of Day');
    }

    renderWeeklyActivityChart(playByDay, color) {
        const canvas = document.getElementById('weeklyActivityChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth || canvas.parentElement?.clientWidth || 400;
        canvas.height = 200;

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const data = playByDay.map((hours, index) => ({
            x: index,
            y: hours,
            label: dayNames[index]
        }));

        this.renderSimpleBarChart(ctx, canvas, data, color, 'Hours Played by Day of Week');
    }

    renderAllSessionsChart(sessionsData, players) {
        const canvas = document.getElementById('allSessionsChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Create timeline visualization showing when each player was online
        this.renderTimelineChart(ctx, canvas, sessionsData, players);
    }

    renderSimpleLineChart(ctx, canvas, data, yKey, label) {
        canvas.height = 300;
        const padding = 40;
        const width = canvas.width - padding * 2;
        const height = canvas.height - padding * 2;

        if (!data || data.length === 0) {
            ctx.fillStyle = '#888';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
            return;
        }

        const maxY = Math.max(...data.map(d => d[yKey])) * 1.1;
        const minY = 0;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;

        // Draw axes
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height + padding);
        ctx.lineTo(width + padding, height + padding);
        ctx.stroke();

        // Draw grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width + padding, y);
            ctx.stroke();

            // Y-axis labels
            const value = maxY - (maxY / 5) * i;
            ctx.fillStyle = '#888';
            ctx.font = '10px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(Math.floor(value).toString(), padding - 5, y + 4);
        }

        // Draw line
        ctx.strokeStyle = '#00ff88';
        ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        data.forEach((point, i) => {
            const x = padding + (width / (data.length - 1)) * i;
            const y = padding + height - ((point[yKey] - minY) / (maxY - minY)) * height;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Fill area under line
        ctx.lineTo(width + padding, height + padding);
        ctx.lineTo(padding, height + padding);
        ctx.closePath();
        ctx.fill();

        // Title
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, canvas.width / 2, 20);
    }

    renderSimpleBarChart(ctx, canvas, data, color, label) {
        // Canvas size should be set before calling this
        const padding = { left: 50, right: 20, top: 35, bottom: 40 };
        const width = canvas.width - padding.left - padding.right;
        const height = canvas.height - padding.top - padding.bottom;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!data || data.length === 0) {
            ctx.fillStyle = '#888';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
            return;
        }

        const maxY = Math.max(...data.map(d => d.y), 1) * 1.1;
        const barWidth = Math.max(width / data.length * 0.7, 2);

        // Draw title
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, canvas.width / 2, 20);

        // Draw bars with gradient
        data.forEach((point, i) => {
            const x = padding.left + (width / data.length) * i + (width / data.length - barWidth) / 2;
            const barHeight = (point.y / maxY) * height;
            const y = padding.top + height - barHeight;

            // Gradient fill
            const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
            const baseColor = color || '#00ff88';
            gradient.addColorStop(0, baseColor);
            // Convert hex/hsl to rgba for gradient transparency
            const gradientColor = baseColor.startsWith('#') ? baseColor + '88' : baseColor.replace('hsl(', 'hsla(').replace(')', ', 0.53)');
            gradient.addColorStop(1, gradientColor);
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);

            // Value on top of bar if space permits
            if (barHeight > 20) {
                ctx.fillStyle = '#fff';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                const valueText = point.y >= 60 ? `${Math.floor(point.y / 60)}h` : `${Math.floor(point.y)}m`;
                ctx.fillText(valueText, x + barWidth / 2, y - 5);
            }
        });

        // Draw axes
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + height);
        ctx.lineTo(padding.left + width, padding.top + height);
        ctx.stroke();

        // Y-axis labels
        ctx.fillStyle = '#888';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + height - (height / 5) * i;
            const value = (maxY / 5) * i;
            const valueText = value >= 60 ? `${Math.floor(value / 60)}h` : `${Math.floor(value)}m`;
            ctx.fillText(valueText, padding.left - 5, y + 4);

            // Grid line
            if (i > 0) {
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(padding.left + width, y);
                ctx.stroke();
            }
        }

        // X-axis labels (show labels if available)
        if (data[0]?.label) {
            ctx.fillStyle = '#888';
            ctx.font = '9px Arial';
            ctx.textAlign = 'center';
            const labelStep = Math.ceil(data.length / 10);
            data.forEach((point, i) => {
                if (i % labelStep === 0 || data.length <= 10) {
                    const x = padding.left + (width / data.length) * i + (width / data.length) / 2;
                    ctx.fillText(point.label, x, canvas.height - 10);
                }
            });
        }
    }

    async updateSessionTimeline() {
        const teamData = window.rustplusUI?.serverData?.team;
        if (!teamData || !teamData.players) {
            console.log('[Sessions] No team data available');
            return;
        }

        const timeRange = document.getElementById('timeRangeSelect')?.value || '168';
        const steamIds = teamData.players.map(p => p.steamId).join(',');

        let url = `/api/statistics/sessions/${this.guildId}?steamIds=${steamIds}&serverId=${this.serverId}`;
        if (timeRange !== 'all') {
            // Add time-based filtering to get ALL sessions in the range
            const hours = parseInt(timeRange);
            const now = Math.floor(Date.now() / 1000);
            const startTime = now - (hours * 3600);
            url += `&startTime=${startTime}&endTime=${now}`;
            // Add high limit as fallback to ensure we get all sessions
            url += `&limit=10000`;
        } else {
            // For "all time", use a very high limit
            url += `&limit=50000`;
        }

        console.log('[Sessions] Fetching from URL:', url);
        try {
            const sessions = await this.apiClient.get(url);
            console.log('[Sessions] Received data:', sessions);
            console.log('[Sessions] Session counts per player:', Object.entries(sessions).map(([id, s]) => `${id}: ${s.length}`));
            requestAnimationFrame(() => this.renderTimelineChart(sessions, teamData.players));
        } catch (error) {
            console.error('Error loading session timeline:', error);
        }
    }

    renderTimelineChart(sessionsData, players) {
        const canvas = document.getElementById('allSessionsChart');
        if (!canvas) {
            console.log('[Sessions] Canvas not found');
            return;
        }

        console.log('[Sessions] Rendering chart with players:', players.length);
        console.log('[Sessions] Sessions data:', sessionsData);

        const ctx = canvas.getContext('2d');
        const rowHeight = 45;
        const headerHeight = 10;
        const padding = { left: 150, right: 40, top: headerHeight, bottom: 30 };

        const parentWidth = canvas.parentElement?.clientWidth || 0;
        const fallbackWidth = canvas.getBoundingClientRect().width || 1000;
        canvas.width = canvas.offsetWidth || parentWidth || fallbackWidth;
        canvas.height = (players?.length || 0) * rowHeight + padding.top + padding.bottom;

        console.log('[Sessions] Canvas size:', canvas.width, 'x', canvas.height);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!players || players.length === 0) {
            ctx.fillStyle = '#888';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No team data available', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Get time range
        const timeRange = document.getElementById('timeRangeSelect')?.value || '168';
        const now = Date.now() / 1000;
        const startTime = timeRange === 'all' ? this.getEarliestSessionTime(sessionsData) : now - (parseInt(timeRange) * 3600);
        const endTime = now;
        const timeSpan = Math.max(1, endTime - startTime);

        console.log('[Sessions] Time range:', { timeRange, startTime: new Date(startTime * 1000), endTime: new Date(endTime * 1000), timeSpan });

        const chartWidth = canvas.width - padding.left - padding.right;
        const chartHeight = players.length * rowHeight;

        // Draw background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);

        // Draw grid lines and time labels
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#888';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';

        const timeIntervals = timeSpan < 86400 ? 6 : timeSpan < 259200 ? 8 : 10;
        for (let i = 0; i <= timeIntervals; i++) {
            const time = startTime + (timeSpan / timeIntervals) * i;
            const x = padding.left + (chartWidth / timeIntervals) * i;

            // Draw grid line
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, padding.top + chartHeight);
            ctx.stroke();

            // Draw time label
            const date = new Date(time * 1000);
            const label = timeSpan < 86400 ?
                `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` :
                `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:00`;
            ctx.fillText(label, x, canvas.height - 10);
        }

        const hasSessions = Object.values(sessionsData || {}).some(sessions => sessions.length > 0);

        // Draw each player's timeline
        players.forEach((player, index) => {
            const y = padding.top + index * rowHeight;
            const playerSessions = sessionsData[player.steamId] || [];
            const playerColor = this.getPlayerColorForTimeline(player.steamId);

            console.log(`[Sessions] Player ${player.name} (${player.steamId}): ${playerSessions.length} sessions`, playerSessions);

            // Draw player name background
            ctx.fillStyle = '#252525';
            ctx.fillRect(0, y, padding.left - 5, rowHeight - 5);

            // Draw player avatar if available
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = `${window.RPP_BASE}/api/avatar/${player.steamId}`;
            img.onload = () => {
                ctx.save();
                ctx.beginPath();
                ctx.arc(20, y + rowHeight / 2, 15, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(img, 5, y + rowHeight / 2 - 15, 30, 30);
                ctx.restore();
            };

            // Draw player name
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(player.name.substring(0, 15), 45, y + rowHeight / 2 + 4);

            // Draw status indicator
            const isOnline = player.isOnline;
            ctx.fillStyle = isOnline ? '#4caf50' : '#666';
            ctx.beginPath();
            ctx.arc(padding.left - 15, y + rowHeight / 2, 5, 0, Math.PI * 2);
            ctx.fill();

            // Draw session bars
            ctx.fillStyle = playerColor;
            playerSessions.forEach(session => {
                const sessionStart = Math.max(session.session_start, startTime);
                const sessionEnd = session.session_end ? Math.min(session.session_end, endTime) : endTime;

                if (sessionEnd > startTime && sessionStart < endTime) {
                    const startX = padding.left + ((sessionStart - startTime) / timeSpan) * chartWidth;
                    const endX = padding.left + ((sessionEnd - startTime) / timeSpan) * chartWidth;
                    const width = Math.max(endX - startX, 2);

                    // Draw session bar with gradient
                    const gradient = ctx.createLinearGradient(startX, y + 8, startX, y + rowHeight - 13);
                    // Convert HSL to HSLA for transparency
                    const transparentColor = playerColor.replace('hsl(', 'hsla(').replace(')', ', 0.53)');
                    gradient.addColorStop(0, playerColor);
                    gradient.addColorStop(1, transparentColor);
                    ctx.fillStyle = gradient;

                    ctx.fillRect(startX, y + 8, width, rowHeight - 13);

                    // Add border if session is active
                    if (!session.session_end) {
                        ctx.strokeStyle = '#fff';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(startX, y + 8, width, rowHeight - 13);
                    }
                }
            });

            // Draw horizontal separator
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, y + rowHeight - 2);
            ctx.lineTo(canvas.width, y + rowHeight - 2);
            ctx.stroke();
        });

        // Draw border
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(padding.left, padding.top, chartWidth, chartHeight);

        if (!hasSessions) {
            ctx.fillStyle = '#888';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No sessions recorded yet', padding.left + chartWidth / 2, padding.top + chartHeight / 2);
        }

        // Draw "now" indicator
        const nowX = padding.left + ((now - startTime) / timeSpan) * chartWidth;
        ctx.strokeStyle = '#ff5722';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(nowX, padding.top);
        ctx.lineTo(nowX, padding.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // "Now" label
        ctx.fillStyle = '#ff5722';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('NOW', nowX, padding.top - 5);
    }

    getEarliestSessionTime(sessionsData) {
        let earliest = Date.now() / 1000;
        Object.values(sessionsData).forEach(sessions => {
            sessions.forEach(session => {
                if (session.session_start < earliest) {
                    earliest = session.session_start;
                }
            });
        });
        return earliest;
    }

    getPlayerColorForTimeline(steamId) {
        // Generate consistent color from steam ID
        const colors = window.rustplusUI?.playerColors;
        if (colors && colors[steamId]) {
            const color = colors[steamId];
            // Ensure it's in HSL format for gradient manipulation
            if (color.startsWith('#')) {
                // Convert hex to HSL if needed (simplified conversion)
                const hash = steamId.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
                const hue = Math.abs(hash) % 360;
                return `hsl(${hue}, 70%, 50%)`;
            }
            return color;
        }
        const hash = steamId.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 70%, 50%)`;
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(StatisticsManager.prototype, descriptors);
