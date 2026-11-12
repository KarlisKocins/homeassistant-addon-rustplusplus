/*
    Home Assistant entities for the Rust+ auth token health (node --test).
*/

const { test } = require('node:test');
const assert = require('node:assert');

process.env.RPP_MQTT_DISCOVERY = 'false';

const HomeAssistant = require('../src/structures/HomeAssistant.js');

const STEAM_ID = '76561198000000001';

function createHa() {
    const ha = new HomeAssistant({ instances: {}, rustplusInstances: {} });
    ha.mqttClient = {
        published: [],
        publish(topic, payload, options) { this.published.push({ topic, payload, options }); }
    };
    ha.connected = true;
    return ha;
}

const find = (ha, topic) => ha.mqttClient.published.find(p => p.topic === topic);

test('publishAccountHealth publishes discovery for expiry, status and problem, bridge-availability only', () => {
    const ha = createHa();
    ha.publishAccountHealth(STEAM_ID, { status: 'ok', expiresAt: 1900000000, rejected: false, problem: false });

    const expiry = JSON.parse(find(ha, `homeassistant/sensor/rustplus_account_${STEAM_ID}_token_expiry/config`).payload);
    assert.strictEqual(expiry.device_class, 'timestamp');
    assert.strictEqual(expiry.availability_topic, 'rustplus/bridge/availability');
    assert.strictEqual(expiry.state_topic, `rustplus/account/${STEAM_ID}/token`);
    assert.strictEqual(expiry.availability, undefined, 'must not depend on a server connection');

    const problem = JSON.parse(find(ha, `homeassistant/binary_sensor/rustplus_account_${STEAM_ID}_token_problem/config`).payload);
    assert.strictEqual(problem.device_class, 'problem');
    assert.ok(find(ha, `homeassistant/sensor/rustplus_account_${STEAM_ID}_token_status/config`));
});

test('publishAccountHealth state carries ISO expiry, status and ON/OFF problem', () => {
    const ha = createHa();
    ha.publishAccountHealth(STEAM_ID, { status: 'expired', expiresAt: 1700000000, rejected: false, problem: true });
    let state = JSON.parse(find(ha, `rustplus/account/${STEAM_ID}/token`).payload);
    assert.deepStrictEqual(state, { expires_at: '2023-11-14T22:13:20.000Z', status: 'expired', problem: 'ON' });

    ha.mqttClient.published.length = 0;
    ha.publishAccountHealth(STEAM_ID, { status: 'ok', expiresAt: 1900000000, rejected: true, problem: true });
    state = JSON.parse(find(ha, `rustplus/account/${STEAM_ID}/token`).payload);
    assert.strictEqual(state.status, 'rejected');

    ha.mqttClient.published.length = 0;
    ha.publishAccountHealth(STEAM_ID, { status: 'missing', expiresAt: null, rejected: false, problem: true });
    assert.strictEqual(JSON.parse(find(ha, `rustplus/account/${STEAM_ID}/token`).payload).expires_at, null);
});

test('removeAccountDiscovery clears the retained config and state', () => {
    const ha = createHa();
    ha.removeAccountDiscovery(STEAM_ID);
    const topics = ha.mqttClient.published.filter(p => p.payload === '').map(p => p.topic).sort();
    assert.deepStrictEqual(topics, [
        `homeassistant/binary_sensor/rustplus_account_${STEAM_ID}_token_problem/config`,
        `homeassistant/sensor/rustplus_account_${STEAM_ID}_token_expiry/config`,
        `homeassistant/sensor/rustplus_account_${STEAM_ID}_token_status/config`,
        `rustplus/account/${STEAM_ID}/token`
    ].sort());
    assert.ok(ha.mqttClient.published.every(p => p.options.retain === true));
});

test('nothing is published while MQTT is disconnected', () => {
    const ha = createHa();
    ha.connected = false;
    ha.publishAccountHealth(STEAM_ID, { status: 'ok', expiresAt: 1, rejected: false, problem: false });
    ha.removeAccountDiscovery(STEAM_ID);
    assert.strictEqual(ha.mqttClient.published.length, 0);
});
