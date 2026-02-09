/*
    Home Assistant WebSocket Integration
*/

const WebSocket = require('ws');

class HomeAssistant {
    constructor(client) {
        this.client = client;
        this.connection = null;
        this.authenticated = false;
        this.messageId = 1;
        this.pendingRequests = new Map();
        this.entities = new Map(); // Map<entityId, rustPlusEntityId>

        // Supervisor token is provided by the add-on environment
        this.supervisorToken = process.env.SUPERVISOR_TOKEN;

        if (this.supervisorToken) {
            this.connect();
        } else {
            console.log('No SUPERVISOR_TOKEN found, Home Assistant integration disabled.');
        }
    }

    connect() {
        // The supervisor API is available at ws://supervisor/core/websocket
        // However, we might need to use the internal HA URL if running as an addon.
        // Usually http://supervisor/core/api is for REST, websocket is at /core/websocket
        const haUrl = process.env.HA_WS_URL || 'ws://supervisor/core/websocket';

        console.log(`Connecting to Home Assistant at ${haUrl}...`);

        try {
            this.connection = new WebSocket(haUrl);

            this.connection.on('open', () => {
                console.log('Connected to Home Assistant WebSocket.');
            });

            this.connection.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(message);
                } catch (e) {
                    console.error('Failed to parse HA message:', e);
                }
            });

            this.connection.on('close', () => {
                console.log('Disconnected from Home Assistant. Reconnecting in 5s...');
                this.authenticated = false;
                setTimeout(() => this.connect(), 5000);
            });

            this.connection.on('error', (err) => {
                console.error('Home Assistant WebSocket error:', err);
            });
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
        }
    }

    handleMessage(message) {
        if (message.type === 'auth_required') {
            this.sendAuth();
        } else if (message.type === 'auth_ok') {
            console.log('Authenticated with Home Assistant.');
            this.authenticated = true;
            // Subscribe to events if needed
        } else if (message.type === 'auth_invalid') {
            console.error('Authentication failed:', message.message);
            this.connection.close();
        } else if (message.type === 'result') {
            if (this.pendingRequests.has(message.id)) {
                const { resolve, reject } = this.pendingRequests.get(message.id);
                if (message.success) {
                    resolve(message.result);
                } else {
                    reject(message.error);
                }
                this.pendingRequests.delete(message.id);
            }
        }
        // Handle event notifications
    }

    sendAuth() {
        this.connection.send(JSON.stringify({
            type: 'auth',
            access_token: this.supervisorToken
        }));
    }

    sendRequest(type, payload = {}) {
        if (!this.authenticated) return Promise.reject(new Error('Not authenticated'));

        const id = this.messageId++;
        const request = {
            id,
            type,
            ...payload
        };

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.connection.send(JSON.stringify(request));
        });
    }

    /**
     * Publishes a state update to Home Assistant.
     * Note: Creating entities dynamically via WebSocket is not standard in HA.
     * Usually, one uses MQTT discovery or a custom integration.
     * Since this is an Add-on, we might need a different approach or just fire events.
     * 
     * However, simpler approach for now: Fire events that HA can listen to, or update input_booleans if configured.
     * 
     * BUT, standard way for Add-ons to exposing entities is via MQTT or by calling the API to update states of existing entities (if they exist).
     * 
     * Let's assume we want to fire events for now, which is safe.
     * User can create template sensors/switches in HA that listen to these events.
     */
    publishEvent(eventType, data) {
        if (!this.authenticated) return;

        this.sendRequest('fire_event', {
            event_type: `rustplus_${eventType}`,
            event_data: data
        }).catch(err => console.error('Failed to fire event:', err));
    }

    // Attempt to set state of an entity (e.g. if user created a helper)
    updateEntityState(entityId, state, attributes = {}) {
        // This requires calling the REST API typically, but some WS commands exist.
        // For now, let's stick to logging and basic event firing.
        console.log(`[HA] Updating ${entityId} to ${state}`);
    }
}

module.exports = HomeAssistant;
