/*
    Home Assistant MQTT Discovery Integration
*/

const axios = require('axios');
const mqtt = require('mqtt');

class HomeAssistant {
    constructor(client) {
        this.client = client;
        this.mqttClient = null;
        this.connected = false;
        this.discoveredEntities = new Set();

        // Supervisor token for REST API
        this.supervisorToken = process.env.SUPERVISOR_TOKEN;
        this.baseUrl = 'http://supervisor/core/api';

        // MQTT Configuration
        this.mqttHost = process.env.RPP_MQTT_HOST || 'core-mosquitto';
        this.mqttPort = parseInt(process.env.RPP_MQTT_PORT) || 1883;
        this.mqttUsername = process.env.RPP_MQTT_USERNAME || '';
        this.mqttPassword = process.env.RPP_MQTT_PASSWORD || '';
        this.mqttDiscovery = process.env.RPP_MQTT_DISCOVERY !== 'false';

        // Discovery prefix
        this.discoveryPrefix = 'homeassistant';
        this.devicePrefix = 'rustplus';

        if (this.mqttDiscovery) {
            this.connectMqtt();
        } else {
            console.log('[HA] MQTT Discovery disabled.');
        }

        if (this.supervisorToken) {
            console.log('[HA] REST API integration enabled.');
        }

        console.log(`[HA] Home Assistant integration initialized. MQTT: ${this.mqttDiscovery ? 'Enabled' : 'Disabled'}`);
    }

    connectMqtt() {
        const url = `mqtt://${this.mqttHost}:${this.mqttPort}`;
        console.log(`[HA] Connecting to MQTT broker at ${url}...`);

        const options = {
            clientId: `rustplusplus_${Date.now()}`,
            clean: true,
            connectTimeout: 10000,
            reconnectPeriod: 5000
        };

        if (this.mqttUsername) {
            options.username = this.mqttUsername;
            options.password = this.mqttPassword;
        }

        this.mqttClient = mqtt.connect(url, options);

        this.mqttClient.on('connect', () => {
            console.log('[HA] Connected to MQTT broker.');
            this.connected = true;

            // Subscribe to command topics for switches
            this.mqttClient.subscribe(`${this.devicePrefix}/+/+/set`, (err) => {
                if (err) {
                    console.error('[HA] Failed to subscribe to command topics:', err);
                } else {
                    console.log('[HA] Subscribed to switch command topics.');
                }
            });
        });

        this.mqttClient.on('error', (err) => {
            console.error('[HA] MQTT error:', err.message);
        });

        this.mqttClient.on('close', () => {
            console.log('[HA] MQTT connection closed.');
            this.connected = false;
        });

        this.mqttClient.on('message', (topic, message) => {
            this.handleCommand(topic, message.toString());
        });
    }

    /**
     * Handle incoming commands from Home Assistant
     */
    async handleCommand(topic, payload) {
        // Topic format: rustplus/{serverId}/{entityId}/set
        const parts = topic.split('/');
        if (parts.length !== 4 || parts[3] !== 'set') return;

        const serverId = parts[1];
        const entityId = parts[2];
        const command = payload.toUpperCase();

        console.log(`[HA] Received command for ${serverId}/${entityId}: ${command}`);

        // Find the rustplus instance and toggle the switch
        for (const [guildId, rustplus] of Object.entries(this.client.rustplusInstances || {})) {
            if (rustplus && rustplus.serverId === serverId && rustplus.isOperational) {
                const value = command === 'ON';
                const response = await rustplus.turnSmartSwitchAsync(entityId, value);
                if (await rustplus.isResponseValid(response)) {
                    console.log(`[HA] Switch ${entityId} turned ${command}`);
                    // State will be updated via the normal event flow
                } else {
                    console.error(`[HA] Failed to turn switch ${entityId} ${command}`);
                }
                return;
            }
        }

        console.warn(`[HA] No active server found for ${serverId}`);
    }

    /**
     * Publish discovery config for a Smart Switch
     */
    publishSwitchDiscovery(serverId, entityId, name, guildId) {
        if (!this.connected) return;

        const serverIdSanitized = serverId.replace(/\./g, '_');
        const uniqueId = `rustplus_${serverIdSanitized}_${entityId}`;
        const topic = `${this.discoveryPrefix}/switch/${uniqueId}/config`;

        const config = {
            name: name,
            unique_id: uniqueId,
            command_topic: `${this.devicePrefix}/${serverId}/${entityId}/set`,
            state_topic: `${this.devicePrefix}/${serverId}/${entityId}/state`,
            payload_on: 'ON',
            payload_off: 'OFF',
            device: {
                identifiers: [`rustplus_${serverId}`],
                name: `Rust Server ${serverId}`,
                manufacturer: 'RustPlusPlus',
                model: 'Smart Switch'
            }
        };

        this.mqttClient.publish(topic, JSON.stringify(config), { retain: true });
        this.discoveredEntities.add(uniqueId);
        console.log(`[HA] Published discovery for switch: ${name} (${entityId})`);
    }

    /**
     * Publish discovery config for a Smart Alarm
     */
    publishAlarmDiscovery(serverId, entityId, name, guildId) {
        if (!this.connected) return;

        const serverIdSanitized = serverId.replace(/\./g, '_');
        const uniqueId = `rustplus_${serverIdSanitized}_${entityId}`;
        const topic = `${this.discoveryPrefix}/binary_sensor/${uniqueId}/config`;

        const config = {
            name: name,
            unique_id: uniqueId,
            state_topic: `${this.devicePrefix}/${serverId}/${entityId}/state`,
            payload_on: 'ON',
            payload_off: 'OFF',
            device_class: 'safety',
            device: {
                identifiers: [`rustplus_${serverId}`],
                name: `Rust Server ${serverId}`,
                manufacturer: 'RustPlusPlus',
                model: 'Smart Alarm'
            }
        };

        this.mqttClient.publish(topic, JSON.stringify(config), { retain: true });
        this.discoveredEntities.add(uniqueId);
        console.log(`[HA] Published discovery for alarm: ${name} (${entityId})`);
    }

    /**
     * Publish discovery config for a Storage Monitor
     */
    publishStorageMonitorDiscovery(serverId, entityId, name, guildId) {
        if (!this.connected) return;

        const serverIdSanitized = serverId.replace(/\./g, '_');
        const uniqueId = `rustplus_${serverIdSanitized}_${entityId}`;
        const topic = `${this.discoveryPrefix}/sensor/${uniqueId}/config`;

        const config = {
            name: name,
            unique_id: uniqueId,
            state_topic: `${this.devicePrefix}/${serverId}/${entityId}/state`,
            value_template: '{{ value_json.items }}',
            json_attributes_topic: `${this.devicePrefix}/${serverId}/${entityId}/state`,
            device: {
                identifiers: [`rustplus_${serverId}`],
                name: `Rust Server ${serverId}`,
                manufacturer: 'RustPlusPlus',
                model: 'Storage Monitor'
            }
        };

        this.mqttClient.publish(topic, JSON.stringify(config), { retain: true });
        this.discoveredEntities.add(uniqueId);
        console.log(`[HA] Published discovery for storage monitor: ${name} (${entityId})`);
    }

    /**
     * Publish discovery config for the Server itself (Sensor for player count, name, etc)
     */
    publishServerDiscovery(serverId, serverName) {
        if (!this.connected) return;

        const serverIdSanitized = serverId.replace(/\./g, '_').replace(/:/g, '_').replace(/-/g, '_');
        const deviceId = `rustplus_${serverIdSanitized}`;

        const device = {
            identifiers: [deviceId],
            name: serverName || `Rust Server ${serverId}`,
            manufacturer: 'RustPlusPlus',
            model: 'Rust Server'
        };

        // Player Count Sensor
        const playersUniqueId = `${deviceId}_players`;
        const playersTopic = `${this.discoveryPrefix}/sensor/${playersUniqueId}/config`;
        const playersConfig = {
            name: `Player Count`,
            unique_id: playersUniqueId,
            state_topic: `${this.devicePrefix}/${serverId}/info/state`,
            value_template: '{{ value_json.players }}',
            unit_of_measurement: 'players',
            icon: 'mdi:account-group',
            device: device
        };
        this.mqttClient.publish(playersTopic, JSON.stringify(playersConfig), { retain: true });

        // Max Players Sensor
        const maxPlayersUniqueId = `${deviceId}_max_players`;
        const maxPlayersTopic = `${this.discoveryPrefix}/sensor/${maxPlayersUniqueId}/config`;
        const maxPlayersConfig = {
            name: `Max Players`,
            unique_id: maxPlayersUniqueId,
            state_topic: `${this.devicePrefix}/${serverId}/info/state`,
            value_template: '{{ value_json.maxPlayers }}',
            unit_of_measurement: 'players',
            icon: 'mdi:account-multiple-plus',
            device: device
        };
        this.mqttClient.publish(maxPlayersTopic, JSON.stringify(maxPlayersConfig), { retain: true });

        // Queued Players Sensor
        const queuedUniqueId = `${deviceId}_queued`;
        const queuedTopic = `${this.discoveryPrefix}/sensor/${queuedUniqueId}/config`;
        const queuedConfig = {
            name: `Queued Players`,
            unique_id: queuedUniqueId,
            state_topic: `${this.devicePrefix}/${serverId}/info/state`,
            value_template: '{{ value_json.queuedPlayers }}',
            unit_of_measurement: 'players',
            icon: 'mdi:human-queue',
            device: device
        };
        this.mqttClient.publish(queuedTopic, JSON.stringify(queuedConfig), { retain: true });

        console.log(`[HA] Published discovery for server info: ${serverName}`);
    }

    /**
     * Update server info via MQTT
     */
    publishServerInfo(serverId, info) {
        if (!this.connected) return;

        const topic = `${this.devicePrefix}/${serverId}/info/state`;
        const payload = JSON.stringify({
            name: info.name,
            players: info.players,
            maxPlayers: info.maxPlayers,
            queuedPlayers: info.queuedPlayers
        });

        this.mqttClient.publish(topic, payload, { retain: true });
    }

    /**
     * Update entity state via MQTT
     */
    publishState(serverId, entityId, state) {
        if (!this.connected) return;

        const topic = `${this.devicePrefix}/${serverId}/${entityId}/state`;
        const payload = typeof state === 'object' ? JSON.stringify(state) : state;

        this.mqttClient.publish(topic, payload, { retain: true });
    }

    /**
     * Remove entity discovery (when device is deleted)
     */
    removeDiscovery(serverId, entityId, type = 'switch') {
        if (!this.connected) return;

        const serverIdSanitized = serverId.replace(/\./g, '_');
        const uniqueId = `rustplus_${serverIdSanitized}_${entityId}`;
        const topic = `${this.discoveryPrefix}/${type}/${uniqueId}/config`;

        this.mqttClient.publish(topic, '', { retain: true }); // Empty payload removes
        this.discoveredEntities.delete(uniqueId);
        console.log(`[HA] Removed discovery for ${type}: ${entityId}`);
    }

    /**
     * Publish all devices for a server (called on connect)
     */
    publishAllDevices(guildId, serverId, instance) {
        if (!this.connected) {
            console.log(`[HA] Cannot publish devices: MQTT not connected.`);
            return;
        }
        if (!instance.serverList[serverId]) {
            console.log(`[HA] Cannot publish devices: Server ${serverId} not found in instance.`);
            return;
        }

        console.log(`[HA] Publishing all devices for server ${serverId}`);

        const server = instance.serverList[serverId];

        // Publish server info
        this.publishServerDiscovery(serverId, server.title);

        // Publish switches
        for (const [entityId, data] of Object.entries(server.switches || {})) {
            this.publishSwitchDiscovery(serverId, entityId, data.name, guildId);
            this.publishState(serverId, entityId, data.active ? 'ON' : 'OFF');
        }

        // Publish alarms
        for (const [entityId, data] of Object.entries(server.alarms || {})) {
            this.publishAlarmDiscovery(serverId, entityId, data.name, guildId);
            this.publishState(serverId, entityId, data.active ? 'ON' : 'OFF');
        }

        // Publish storage monitors
        for (const [entityId, data] of Object.entries(server.storageMonitors || {})) {
            this.publishStorageMonitorDiscovery(serverId, entityId, data.name, guildId);
        }

        console.log(`[HA] Published all devices for server ${serverId}`);
    }

    /**
     * Fires an event to Home Assistant via REST API (legacy, kept for compatibility)
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
        } catch (error) {
            // Silently fail for events, MQTT is primary
        }

        // Also publish state via MQTT if applicable
        if (data.entityId && data.value !== undefined) {
            const stateValue = typeof data.value === 'boolean' ? (data.value ? 'ON' : 'OFF') : data.value;
            this.publishState(data.serverIp + '-' + data.port, data.entityId, stateValue);
        }
    }
}

module.exports = HomeAssistant;
