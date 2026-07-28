/*
    Unit tests for the Home Assistant MQTT availability / Last Will handling (node --test).
*/

const { test } = require('node:test');
const assert = require('node:assert');

/* Keep the constructor from opening a real broker connection. */
process.env.RPP_MQTT_DISCOVERY = 'false';

const HomeAssistant = require('../src/structures/HomeAssistant.js');

const SERVER_ID = '192.168.1.10-28082';

/* Minimal stand-in for an mqtt.js client that records everything published. */
function createFakeMqttClient() {
    return {
        published: [],
        ended: false,
        publish(topic, payload, options, callback) {
            this.published.push({ topic, payload, options });
            if (typeof options === 'function') options();
            else if (typeof callback === 'function') callback();
        },
        end(force, opts, callback) {
            this.ended = true;
            if (typeof callback === 'function') callback();
        }
    };
}

function createHa() {
    const ha = new HomeAssistant({ instances: {}, rustplusInstances: {} });
    ha.mqttClient = createFakeMqttClient();
    ha.connected = true;
    return ha;
}

function findPublish(ha, topic) {
    return ha.mqttClient.published.find(p => p.topic === topic);
}

function discoveryConfig(ha, topic) {
    const entry = findPublish(ha, topic);
    assert.ok(entry, `expected a publish on ${topic}`);
    return JSON.parse(entry.payload);
}

test('connect options carry an offline Last Will on the bridge availability topic', () => {
    const ha = createHa();
    const options = ha.buildConnectOptions();

    assert.deepStrictEqual(options.will, {
        topic: 'rustplus/bridge/availability',
        payload: 'offline',
        qos: 1,
        retain: true
    });
});

test('server availability is published retained on the per-server topic', () => {
    const ha = createHa();

    ha.publishServerAvailability(SERVER_ID, true);
    ha.publishServerAvailability(SERVER_ID, false);

    const publishes = ha.mqttClient.published.filter(p => p.topic === `rustplus/${SERVER_ID}/availability`);
    assert.strictEqual(publishes.length, 2);
    assert.strictEqual(publishes[0].payload, 'online');
    assert.strictEqual(publishes[1].payload, 'offline');
    assert.strictEqual(publishes[0].options.retain, true);
});

test('availability is not published while disconnected from the broker', () => {
    const ha = createHa();
    ha.connected = false;

    ha.publishServerAvailability(SERVER_ID, true);

    assert.strictEqual(ha.mqttClient.published.length, 0);
});

test('switch discovery requires both bridge and server availability', () => {
    const ha = createHa();
    ha.publishSwitchDiscovery(SERVER_ID, '12345', 'Front Door', 'guild1');

    const config = discoveryConfig(ha, `homeassistant/switch/rustplus_192_168_1_10-28082_12345/config`);

    assert.strictEqual(config.availability_mode, 'all');
    assert.deepStrictEqual(config.availability.map(a => a.topic), [
        'rustplus/bridge/availability',
        `rustplus/${SERVER_ID}/availability`
    ]);
    for (const entry of config.availability) {
        assert.strictEqual(entry.payload_available, 'online');
        assert.strictEqual(entry.payload_not_available, 'offline');
    }
});

test('alarm and storage monitor discovery carry the same availability block', () => {
    const ha = createHa();
    ha.publishAlarmDiscovery(SERVER_ID, '222', 'Raid Alarm', 'guild1');
    ha.publishStorageMonitorDiscovery(SERVER_ID, '333', 'Tool Cupboard', 'guild1');

    const expected = ha.getAvailabilityConfig(SERVER_ID);

    const alarm = discoveryConfig(ha, 'homeassistant/binary_sensor/rustplus_192_168_1_10-28082_222/config');
    const storage = discoveryConfig(ha, 'homeassistant/sensor/rustplus_192_168_1_10-28082_333/config');

    assert.deepStrictEqual(alarm.availability, expected.availability);
    assert.strictEqual(alarm.availability_mode, 'all');
    assert.deepStrictEqual(storage.availability, expected.availability);
    assert.strictEqual(storage.availability_mode, 'all');
});

test('all three server sensors carry the availability block', () => {
    const ha = createHa();
    ha.publishServerDiscovery(SERVER_ID, 'My Rust Server');

    const deviceId = 'rustplus_192_168_1_10_28082';
    const expected = ha.getAvailabilityConfig(SERVER_ID);

    for (const suffix of ['players', 'max_players', 'queued']) {
        const config = discoveryConfig(ha, `homeassistant/sensor/${deviceId}_${suffix}/config`);
        assert.deepStrictEqual(config.availability, expected.availability, `${suffix} availability`);
        assert.strictEqual(config.availability_mode, 'all', `${suffix} availability_mode`);
    }
});

test('publishAllDevices marks the server online only when its Rust+ connection is operational', () => {
    const instance = {
        serverList: {
            [SERVER_ID]: { title: 'My Rust Server', switches: {}, alarms: {}, storageMonitors: {} }
        }
    };

    const offline = createHa();
    offline.client.instances = { guild1: instance };
    offline.client.rustplusInstances = { guild1: { serverId: SERVER_ID, isOperational: false } };
    offline.publishAllDevices('guild1', SERVER_ID, instance);
    assert.strictEqual(findPublish(offline, `rustplus/${SERVER_ID}/availability`).payload, 'offline');

    const online = createHa();
    online.client.instances = { guild1: instance };
    online.client.rustplusInstances = { guild1: { serverId: SERVER_ID, isOperational: true, info: null } };
    online.publishAllDevices('guild1', SERVER_ID, instance);
    assert.strictEqual(findPublish(online, `rustplus/${SERVER_ID}/availability`).payload, 'online');
});

test('availability is published before the discovery configs it guards', () => {
    const ha = createHa();
    const instance = {
        serverList: {
            [SERVER_ID]: { title: 'My Rust Server', switches: {}, alarms: {}, storageMonitors: {} }
        }
    };
    ha.client.rustplusInstances = { guild1: { serverId: SERVER_ID, isOperational: true, info: null } };

    ha.publishAllDevices('guild1', SERVER_ID, instance);

    const topics = ha.mqttClient.published.map(p => p.topic);
    const availabilityIndex = topics.indexOf(`rustplus/${SERVER_ID}/availability`);
    const firstDiscoveryIndex = topics.findIndex(t => t.startsWith('homeassistant/'));

    assert.ok(availabilityIndex >= 0 && firstDiscoveryIndex >= 0);
    assert.ok(availabilityIndex < firstDiscoveryIndex,
        'server availability must be retained before HA sees the discovery config');
});

test('removeServerDiscovery clears the retained availability topic', () => {
    const ha = createHa();
    ha.removeServerDiscovery(SERVER_ID);

    const entry = findPublish(ha, `rustplus/${SERVER_ID}/availability`);
    assert.ok(entry, 'expected the availability topic to be cleared');
    assert.strictEqual(entry.payload, '');
    assert.strictEqual(entry.options.retain, true);
});

test('shutdown publishes offline and ends the connection', async () => {
    const ha = createHa();

    await ha.shutdown();

    const entry = findPublish(ha, 'rustplus/bridge/availability');
    assert.ok(entry, 'expected a bridge availability publish');
    assert.strictEqual(entry.payload, 'offline');
    assert.strictEqual(entry.options.retain, true);
    assert.strictEqual(ha.mqttClient.ended, true);
    assert.strictEqual(ha.connected, false);
});

test('shutdown is safe when MQTT was never connected', async () => {
    const ha = new HomeAssistant({ instances: {}, rustplusInstances: {} });
    await ha.shutdown();
    assert.strictEqual(ha.mqttClient, null);
});
