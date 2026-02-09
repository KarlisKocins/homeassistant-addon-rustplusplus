/*
    Home Assistant REST API Integration
*/

const axios = require('axios');

class HomeAssistant {
    constructor(client) {
        this.client = client;

        // Supervisor token is provided by the add-on environment
        this.supervisorToken = process.env.SUPERVISOR_TOKEN;

        // Base URL for Supervisor API
        this.baseUrl = 'http://supervisor/core/api';

        if (this.supervisorToken) {
            console.log('Home Assistant integration enabled (SUPERVISOR_TOKEN found).');
            this.testConnection();
        } else {
            console.log('No SUPERVISOR_TOKEN found, Home Assistant integration disabled.');
        }
    }

    async testConnection() {
        try {
            const response = await axios.get(`${this.baseUrl}/`, {
                headers: {
                    'Authorization': `Bearer ${this.supervisorToken}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('Home Assistant connection test successful:', response.data.message);
        } catch (error) {
            console.error('Home Assistant connection test failed:', error.message);
        }
    }

    /**
     * Fires an event to Home Assistant.
     * @param {string} eventType - Event type suffix (will be prefixed with 'rustplus_')
     * @param {object} data - Event data
     */
    async publishEvent(eventType, data) {
        if (!this.supervisorToken) return;

        try {
            await axios.post(
                `${this.baseUrl}/events/rustplus_${eventType}`,
                data,
                {
                    headers: {
                        'Authorization': `Bearer ${this.supervisorToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log(`[HA] Published event: rustplus_${eventType}`);
        } catch (error) {
            console.error(`[HA] Failed to publish event rustplus_${eventType}:`, error.message);
        }
    }

    /**
     * Updates the state of a Home Assistant entity.
     * Note: This requires the entity to already exist in HA (e.g., created via helpers).
     * @param {string} entityId - The full entity ID (e.g., 'input_boolean.rust_switch_1')
     * @param {string} state - The state to set
     * @param {object} attributes - Optional attributes
     */
    async updateEntityState(entityId, state, attributes = {}) {
        if (!this.supervisorToken) return;

        try {
            await axios.post(
                `${this.baseUrl}/states/${entityId}`,
                {
                    state: state,
                    attributes: attributes
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.supervisorToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log(`[HA] Updated entity ${entityId} to ${state}`);
        } catch (error) {
            console.error(`[HA] Failed to update entity ${entityId}:`, error.message);
        }
    }
}

module.exports = HomeAssistant;
