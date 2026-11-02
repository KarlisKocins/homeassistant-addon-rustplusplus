/*
    Unit tests for the Smart Alarm voice siren (node --test).
*/

const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const Path = require('node:path');

/* Stand-ins for @discordjs/voice and the bot client, installed before the module under test is loaded. */
const played = [];
const subscribed = [];
let connection = null;
let playerErrorHandlers = [];

function stubModule(request, exports) {
    const resolved = require.resolve(request);
    require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
}

stubModule('@discordjs/voice', {
    getVoiceConnection: () => connection,
    createAudioPlayer: () => ({
        on: (event, handler) => { if (event === 'error') playerErrorHandlers.push(handler); },
        play: (resource) => played.push(resource)
    }),
    createAudioResource: (source) => ({ source })
});

const indexPath = Path.join(__dirname, '..', 'index.js');
require.cache[indexPath] = {
    id: indexPath, filename: indexPath, loaded: true,
    exports: { client: { log() { }, intlGet: (g, id) => id, getInstance: () => ({ generalSettings: {} }) } }
};

const DiscordVoice = require('../src/discordTools/discordVoice.js');

beforeEach(() => {
    played.length = 0;
    subscribed.length = 0;
    playerErrorHandlers = [];
    connection = { subscribe: (player) => subscribed.push(player) };
});

test('plays the bundled siren when the bot is in a voice channel', () => {
    assert.strictEqual(DiscordVoice.playAlarmSiren('guild-a', 1_000_000), true);
    assert.strictEqual(played.length, 1);
    assert.strictEqual(played[0].source, DiscordVoice.ALARM_SIREN_FILE);
    assert.strictEqual(subscribed.length, 1);
    assert.ok(require('node:fs').existsSync(DiscordVoice.ALARM_SIREN_FILE), 'siren file is shipped');
});

test('does nothing when the bot is not in a voice channel', () => {
    connection = null;
    assert.strictEqual(DiscordVoice.playAlarmSiren('guild-b', 1_000_000), false);
    assert.strictEqual(played.length, 0);
});

test('does not restart the siren inside the cooldown, but plays again after it', () => {
    const t0 = 5_000_000;
    assert.strictEqual(DiscordVoice.playAlarmSiren('guild-c', t0), true);
    assert.strictEqual(DiscordVoice.playAlarmSiren('guild-c', t0 + DiscordVoice.ALARM_SIREN_COOLDOWN_MS - 1), false);
    assert.strictEqual(played.length, 1);
    assert.strictEqual(DiscordVoice.playAlarmSiren('guild-c', t0 + DiscordVoice.ALARM_SIREN_COOLDOWN_MS), true);
    assert.strictEqual(played.length, 2);
});

test('the cooldown is tracked per guild', () => {
    const t0 = 9_000_000;
    assert.strictEqual(DiscordVoice.playAlarmSiren('guild-d', t0), true);
    assert.strictEqual(DiscordVoice.playAlarmSiren('guild-e', t0 + 1), true);
});

test('a player error is handled instead of crashing the process', () => {
    DiscordVoice.playAlarmSiren('guild-f', 20_000_000);
    assert.strictEqual(playerErrorHandlers.length, 1);
    assert.doesNotThrow(() => playerErrorHandlers[0](new Error('ffmpeg missing')));
});

test('the siren setting is off by default and is part of the general settings template', () => {
    const template = require('../src/templates/generalSettingsTemplate.json');
    assert.strictEqual(template.smartAlarmVoiceSiren, false);
    const en = require('../src/languages/en.json');
    assert.ok(en.shouldSmartAlarmsPlaySirenInVoiceSetting);
    assert.ok(en.smartAlarmVoiceSirenExtendSetting);
});
