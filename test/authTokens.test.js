/*
    saveAuthToken / getAccountHealth / notifyOwner (node --test). The bot entry point and the
    credentials file are replaced by in-memory stand-ins so nothing boots and nothing is written.
*/

const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const Path = require('node:path');

const STEAM_ID = '76561198000000001';
const GUILD = 'g1';

let files;
let published;
let reconnects;

function stub(modulePath, exports) {
    const resolved = require.resolve(modulePath);
    require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
}

const fakeClient = {
    instances: { [GUILD]: {} },
    rustplusInstances: {},
    activeRustplusInstances: {},
    rustplusReconnectTimers: {},
    logs: [],
    sent: [],
    getInstance: () => ({ activeServer: null, serverList: {} }),
    intlGet: (guildId, id, vars) => `${id} ${JSON.stringify(vars || {})}`,
    log(title, text) { this.logs.push(text); },
    users: {
        fetch: async (id) => ({ send: async (text) => { fakeClient.sent.push({ id, text }); } })
    }
};

stub(Path.join(__dirname, '..', 'index.js'), {
    client: fakeClient,
    ha: { publishAccountHealth: (steamId, health) => published.push({ steamId, health }) }
});
stub(Path.join(__dirname, '..', 'src', 'util', 'instanceUtils.js'), {
    readCredentialsFile: (guildId) => JSON.parse(files[guildId]),
    writeCredentialsFile: (guildId, credentials) => { files[guildId] = JSON.stringify(credentials); }
});

const AuthTokens = require('../src/util/authTokens.js');
const RustRelay = require('../src/util/rustRelay.js');

function makeToken(expiresInMs, steamId = STEAM_ID) {
    const payload = { steamId, version: 0, iss: 1, exp: Math.floor((Date.now() + expiresInMs) / 1000) };
    return `${Buffer.from(JSON.stringify(payload)).toString('base64')}.c2ln`;
}

function stored() {
    return JSON.parse(files[GUILD]);
}

beforeEach(() => {
    RustRelay.resetConnectionState();
    published = [];
    reconnects = [];
    fakeClient.sent = [];
    fakeClient.logs = [];
    fakeClient.rustplusInstances = {};
    files = {
        [GUILD]: JSON.stringify({
            hoster: STEAM_ID,
            [STEAM_ID]: { gcm: {}, discord_user_id: 'user-1' }
        })
    };
});

test('saveAuthToken stores a valid token, clears blocks and publishes health', () => {
    RustRelay.markAuthBlocked(RustRelay.stateKey(GUILD, 'srv', STEAM_ID), 'rejected');
    const token = makeToken(10 * 86400_000);

    const result = AuthTokens.saveAuthToken(fakeClient, GUILD, STEAM_ID, encodeURIComponent(token));
    assert.strictEqual(result.ok, true);
    assert.strictEqual(stored()[STEAM_ID].rustplus_auth_token, token);
    assert.strictEqual(RustRelay.isAuthRejected(GUILD, STEAM_ID), false);
    assert.strictEqual(published.at(-1).health.status, 'ok');
    assert.strictEqual(published.at(-1).health.problem, false);
});

test('saveAuthToken rejects garbage, another account, expired tokens and unknown accounts', () => {
    const before = files[GUILD];
    assert.match(AuthTokens.saveAuthToken(fakeClient, GUILD, STEAM_ID, 'nope').error, /Invalid/);
    assert.match(AuthTokens.saveAuthToken(fakeClient, GUILD, STEAM_ID, makeToken(1e6, '76561198000000009')).error, /belongs to/);
    assert.match(AuthTokens.saveAuthToken(fakeClient, GUILD, STEAM_ID, makeToken(-1e6)).error, /expired/);
    assert.match(AuthTokens.saveAuthToken(fakeClient, GUILD, '76561198000000002', makeToken(1e6, '76561198000000002')).error, /No FCM/);
    assert.match(AuthTokens.saveAuthToken(fakeClient, GUILD, 'hoster', makeToken(1e6)).error, /17-digit/);
    assert.strictEqual(files[GUILD], before, 'nothing may be written on failure');
});

test('getAccountHealth reports missing, expiring, expired and rejected', () => {
    assert.strictEqual(AuthTokens.getAccountHealth(GUILD, STEAM_ID).status, 'missing');
    assert.strictEqual(AuthTokens.getAccountHealth(GUILD, STEAM_ID).problem, true);

    const credentials = stored();
    credentials[STEAM_ID].rustplus_auth_token = makeToken(86400_000);
    files[GUILD] = JSON.stringify(credentials);
    assert.deepStrictEqual(
        [AuthTokens.getAccountHealth(GUILD, STEAM_ID).status, AuthTokens.getAccountHealth(GUILD, STEAM_ID).problem],
        ['expiring', false]);

    credentials[STEAM_ID].rustplus_auth_token = makeToken(-1000);
    files[GUILD] = JSON.stringify(credentials);
    assert.strictEqual(AuthTokens.getAccountHealth(GUILD, STEAM_ID).status, 'expired');

    credentials[STEAM_ID].rustplus_auth_token = makeToken(10 * 86400_000);
    files[GUILD] = JSON.stringify(credentials);
    RustRelay.markAuthBlocked(RustRelay.stateKey(GUILD, 'srv', STEAM_ID), 'rejected');
    const health = AuthTokens.getAccountHealth(GUILD, STEAM_ID);
    assert.deepStrictEqual([health.rejected, health.problem], [true, true]);
});

test('listAccounts skips the hoster key and never exposes the token', () => {
    AuthTokens.saveAuthToken(fakeClient, GUILD, STEAM_ID, makeToken(10 * 86400_000));
    const accounts = AuthTokens.listAccounts(GUILD);
    assert.strictEqual(accounts.length, 1);
    assert.strictEqual(accounts[0].steamId, STEAM_ID);
    assert.strictEqual(accounts[0].hoster, true);
    assert.ok(!JSON.stringify(accounts).includes('rustplus_auth_token'));
    assert.ok(!JSON.stringify(accounts).includes(stored()[STEAM_ID].rustplus_auth_token));
});

test('notifyOwner messages once per token and severity, and a new token re-arms it', async () => {
    AuthTokens.saveAuthToken(fakeClient, GUILD, STEAM_ID, makeToken(86400_000));

    assert.strictEqual(await AuthTokens.notifyOwner(fakeClient, GUILD, STEAM_ID, 'expiring'), true);
    assert.strictEqual(await AuthTokens.notifyOwner(fakeClient, GUILD, STEAM_ID, 'expiring'), false);
    assert.strictEqual(fakeClient.sent.length, 1);
    assert.strictEqual(fakeClient.sent[0].id, 'user-1');

    assert.strictEqual(await AuthTokens.notifyOwner(fakeClient, GUILD, STEAM_ID, 'rejected'), true);
    assert.strictEqual(await AuthTokens.notifyOwner(fakeClient, GUILD, STEAM_ID, 'expiring'), false);

    AuthTokens.saveAuthToken(fakeClient, GUILD, STEAM_ID, makeToken(2 * 86400_000));
    assert.strictEqual(await AuthTokens.notifyOwner(fakeClient, GUILD, STEAM_ID, 'expiring'), true);
    assert.ok(!fakeClient.sent.some(m => m.text.includes('c2ln')), 'the token is never put in a message');
});

test('checkAllTokens warns about expiring tokens only', async () => {
    AuthTokens.saveAuthToken(fakeClient, GUILD, STEAM_ID, makeToken(10 * 86400_000));
    await AuthTokens.checkAllTokens(fakeClient);
    assert.strictEqual(fakeClient.sent.length, 0);

    AuthTokens.saveAuthToken(fakeClient, GUILD, STEAM_ID, makeToken(86400_000));
    await AuthTokens.checkAllTokens(fakeClient);
    await AuthTokens.checkAllTokens(fakeClient);
    assert.strictEqual(fakeClient.sent.length, 1);
});

test('reconnectAfterTokenChange restarts a connection that was waiting for the token', () => {
    const rustplus = {
        playerId: STEAM_ID,
        websocket: null,
        team: { leaderSteamId: 'someone-else' },
        connect() { reconnects.push('connect'); }
    };
    fakeClient.rustplusInstances[GUILD] = rustplus;
    AuthTokens.saveAuthToken(fakeClient, GUILD, STEAM_ID, makeToken(10 * 86400_000));
    assert.deepStrictEqual(reconnects, ['connect']);

    rustplus.websocket = {};
    AuthTokens.saveAuthToken(fakeClient, GUILD, STEAM_ID, makeToken(11 * 86400_000));
    assert.deepStrictEqual(reconnects, ['connect'], 'a live connection is left alone');
});
