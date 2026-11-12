/*
    Unit tests for the pure relay helpers (node --test).
*/

const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

const RustRelay = require('../src/util/rustRelay.js');

const STEAM_ID = '76561198000000001';

function makeToken(payload) {
    return `${Buffer.from(JSON.stringify(payload)).toString('base64')}.c2lnbmF0dXJl`;
}

function tokenExpiringIn(ms, steamId = STEAM_ID) {
    return makeToken({ steamId: steamId, version: 0, iss: 1, exp: Math.floor((Date.now() + ms) / 1000) });
}

beforeEach(() => RustRelay.resetConnectionState());

test('normaliseAuthToken accepts bare, encoded, quoted and callback-url tokens', () => {
    const token = tokenExpiringIn(60_000);
    assert.strictEqual(RustRelay.normaliseAuthToken(`  ${token}\n`), token);
    assert.strictEqual(RustRelay.normaliseAuthToken(`"${token}"`), token);
    assert.strictEqual(RustRelay.normaliseAuthToken(encodeURIComponent(token)), token);
    assert.strictEqual(RustRelay.normaliseAuthToken(`http://localhost:3000/callback?token=${encodeURIComponent(token)}`), token);
    assert.strictEqual(RustRelay.normaliseAuthToken('   '), null);
    assert.strictEqual(RustRelay.normaliseAuthToken(undefined), null);
});

test('parseAuthToken reads steamId and expiry, rejects garbage', () => {
    const parsed = RustRelay.parseAuthToken(makeToken({ steamId: STEAM_ID, iss: 100, exp: 200 }));
    assert.deepStrictEqual(parsed, { steamId: STEAM_ID, issuedAt: 100, expiresAt: 200 });
    assert.strictEqual(RustRelay.parseAuthToken('not-a-token'), null);
    assert.strictEqual(RustRelay.parseAuthToken('%%%.sig'), null);
    assert.strictEqual(RustRelay.parseAuthToken(null), null);
});

test('tokenStatus covers missing, invalid, ok, expiring and expired', () => {
    const now = Date.now();
    assert.strictEqual(RustRelay.tokenStatus(undefined, now).status, 'missing');
    assert.strictEqual(RustRelay.tokenStatus('garbage', now).status, 'invalid');
    assert.strictEqual(RustRelay.tokenStatus(tokenExpiringIn(10 * 86400_000), now).status, 'ok');
    assert.strictEqual(RustRelay.tokenStatus(tokenExpiringIn(86400_000), now).status, 'expiring');
    assert.strictEqual(RustRelay.tokenStatus(tokenExpiringIn(-1000), now).status, 'expired');
    assert.strictEqual(RustRelay.tokenStatus(makeToken({ steamId: STEAM_ID }), now).status, 'ok');
});

function instanceWithServer() {
    return {
        serverList: {
            '10.0.0.1-28082': {
                serverIp: '10.0.0.1', appPort: '28082', steamId: STEAM_ID, playerToken: '-123', switches: { 1: {} }
            }
        },
        serverListLite: {
            '10.0.0.1-28082': {
                [STEAM_ID]: { serverIp: '10.0.0.1', appPort: '28082', steamId: STEAM_ID, playerToken: '-123' }
            }
        }
    };
}

test('resolvePairing uses ip and port when present', () => {
    const pairing = RustRelay.resolvePairing({}, { ip: '1.2.3.4', port: 28083, id: 'abc' });
    assert.strictEqual(pairing.serverId, '1.2.3.4-28083');
    assert.strictEqual(pairing.relayServerId, 'abc');
    assert.strictEqual(pairing.adopted, false);
});

test('resolvePairing returns null without address or relay id', () => {
    assert.strictEqual(RustRelay.resolvePairing({}, { playerId: STEAM_ID }), null);
    assert.strictEqual(RustRelay.resolvePairing({}, null), null);
});

test('resolvePairing adopts the existing server by playerToken and keeps its key', () => {
    const instance = instanceWithServer();
    const pairing = RustRelay.resolvePairing(instance, { id: 'relay-abc', playerId: STEAM_ID, playerToken: '-123' });
    assert.strictEqual(pairing.serverId, '10.0.0.1-28082');
    assert.strictEqual(pairing.serverIp, '10.0.0.1');
    assert.strictEqual(pairing.appPort, '28082');
    assert.strictEqual(pairing.adopted, true);

    RustRelay.stampRelayId(instance, pairing);
    assert.strictEqual(instance.serverList['10.0.0.1-28082'].relayServerId, 'relay-abc');
    assert.strictEqual(instance.serverListLite['10.0.0.1-28082'][STEAM_ID].relayServerId, 'relay-abc');
    assert.deepStrictEqual(Object.keys(instance.serverList), ['10.0.0.1-28082']);
});

test('resolvePairing prefers a relay id match over a token match', () => {
    const instance = instanceWithServer();
    instance.serverList['10.0.0.1-28082'].relayServerId = 'abc';
    const pairing = RustRelay.resolvePairing(instance, { id: 'abc', playerId: 'other', playerToken: 'other' });
    assert.strictEqual(pairing.serverId, '10.0.0.1-28082');
    assert.strictEqual(pairing.adopted, false);
});

test('resolvePairing does not adopt on an ambiguous playerToken', () => {
    const instance = instanceWithServer();
    instance.serverList['10.0.0.2-28082'] = { ...instance.serverList['10.0.0.1-28082'], serverIp: '10.0.0.2' };
    const pairing = RustRelay.resolvePairing(instance, { id: 'abc', playerId: STEAM_ID, playerToken: '-123' });
    assert.strictEqual(pairing.serverId, 'relay-abc');
});

test('resolvePairing creates relay-<id> only for a server never seen before', () => {
    const pairing = RustRelay.resolvePairing(instanceWithServer(), { id: 'new', playerId: STEAM_ID, playerToken: '-999' });
    assert.deepStrictEqual(
        { serverId: pairing.serverId, serverIp: pairing.serverIp, appPort: pairing.appPort },
        { serverId: 'relay-new', serverIp: 'relay', appPort: 'new' });
});

test('a second pairing for a relay-keyed server reuses that key', () => {
    const instance = { serverList: { 'relay-new': { serverIp: 'relay', appPort: 'new', relayServerId: 'new' } } };
    const pairing = RustRelay.resolvePairing(instance, { id: 'new', playerId: STEAM_ID });
    assert.strictEqual(pairing.serverId, 'relay-new');
});

test('stampRelayId folds provisional relay-<id> lite entries into the real key', () => {
    const instance = instanceWithServer();
    instance.serverListLite['relay-abc'] = {
        '76561198000000002': { serverIp: 'relay', appPort: 'abc', steamId: '76561198000000002', playerToken: '7' }
    };
    const pairing = RustRelay.resolvePairing(instance, { ip: '10.0.0.1', port: '28082', id: 'abc' });
    RustRelay.stampRelayId(instance, pairing);

    assert.strictEqual(instance.serverListLite['relay-abc'], undefined);
    const merged = instance.serverListLite['10.0.0.1-28082']['76561198000000002'];
    assert.strictEqual(merged.serverIp, '10.0.0.1');
    assert.strictEqual(merged.relayServerId, 'abc');
});

const GOOD_CREDENTIALS = () => ({ [STEAM_ID]: { rustplus_auth_token: tokenExpiringIn(5 * 86400_000) } });
const RELAY_INSTANCE = () => {
    const instance = instanceWithServer();
    instance.serverList['10.0.0.1-28082'].relayServerId = 'abc';
    return instance;
};

test('resolveConnection needs a relay id; the token is optional', () => {
    assert.strictEqual(RustRelay.resolveConnection(instanceWithServer(), GOOD_CREDENTIALS(), '10.0.0.1', '28082', STEAM_ID), null);

    const relay = RustRelay.resolveConnection(RELAY_INSTANCE(), GOOD_CREDENTIALS(), '10.0.0.1', '28082', STEAM_ID);
    assert.strictEqual(relay.relayServerId, 'abc');
    assert.ok(relay.authToken);

    const noToken = RustRelay.resolveConnection(RELAY_INSTANCE(), {}, '10.0.0.1', '28082', STEAM_ID);
    assert.strictEqual(noToken.authToken, null);
});

test('resolveConnection finds the relay id on a lite entry', () => {
    const instance = instanceWithServer();
    instance.serverListLite['10.0.0.1-28082'][STEAM_ID].relayServerId = 'lite-id';
    assert.strictEqual(
        RustRelay.resolveConnection(instance, GOOD_CREDENTIALS(), '10.0.0.1', '28082', STEAM_ID).relayServerId, 'lite-id');
});

function choose(overrides) {
    const key = RustRelay.stateKey('g', 's', STEAM_ID);
    const relay = { relayServerId: 'abc', authToken: 'x.y', expiresAt: Math.floor(Date.now() / 1000) + 86400 };
    return RustRelay.chooseTransport({
        relay, serverIp: '10.0.0.1', state: RustRelay.getState(key), ...overrides
    });
}

test('chooseTransport: relay when id and valid token exist', () => {
    assert.strictEqual(choose({}).mode, 'relay');
});

test('chooseTransport: direct for servers without relay id or token', () => {
    assert.strictEqual(choose({ relay: null }).mode, 'direct');
    assert.strictEqual(choose({ relay: { relayServerId: 'abc', authToken: null } }).mode, 'direct');
});

test('chooseTransport never goes direct for a relay-only server', () => {
    assert.strictEqual(choose({ relay: null, serverIp: 'relay' }).mode, 'unavailable');
    assert.strictEqual(choose({ relay: { relayServerId: 'abc', authToken: null }, serverIp: 'relay' }).mode, 'unavailable');
    const expired = { relayServerId: 'abc', authToken: 'x.y', expiresAt: 1 };
    assert.strictEqual(choose({ relay: expired, serverIp: 'relay' }).mode, 'blocked');
});

test('chooseTransport blocks on an expired token and on a rejected one', () => {
    const expired = { relayServerId: 'abc', authToken: 'x.y', expiresAt: 1 };
    assert.deepStrictEqual(
        { mode: choose({ relay: expired }).mode, reason: choose({ relay: expired }).reason },
        { mode: 'blocked', reason: 'expired' });

    const key = RustRelay.stateKey('g', 's', STEAM_ID);
    RustRelay.markAuthBlocked(key, 'rejected');
    assert.strictEqual(choose({}).mode, 'blocked');
    assert.strictEqual(RustRelay.isAuthRejected('g', STEAM_ID), true);

    RustRelay.clearAuthBlocks('g', STEAM_ID);
    assert.strictEqual(choose({}).mode, 'relay');
    assert.strictEqual(RustRelay.isAuthRejected('g', STEAM_ID), false);
});

test('chooseTransport remembers that direct worked', () => {
    const key = RustRelay.stateKey('g', 's', STEAM_ID);
    RustRelay.markAuthBlocked(key, 'rejected');
    RustRelay.markWorked(key, 'direct');
    RustRelay.markAuthBlocked(key, 'rejected');
    assert.strictEqual(choose({}).mode, 'direct');
});

test('chooseTransport tries direct once after repeated relay failures, then relay again', () => {
    const key = RustRelay.stateKey('g', 's', STEAM_ID);
    for (let i = 0; i < RustRelay.DIRECT_FALLBACK_AFTER; i++) RustRelay.markRelayFailure(key);
    assert.strictEqual(choose({}).mode, 'direct');
    assert.strictEqual(choose({}).mode, 'relay');
});

test('chooseTransport keeps using a relay that worked before', () => {
    const key = RustRelay.stateKey('g', 's', STEAM_ID);
    RustRelay.markWorked(key, 'relay');
    for (let i = 0; i < 10; i++) RustRelay.markRelayFailure(key);
    assert.strictEqual(choose({}).mode, 'relay');
});

test('classifyFailure only calls 401/403 and local expiry auth failures', () => {
    const relay = { expiresAt: Math.floor(Date.now() / 1000) + 3600 };
    assert.strictEqual(RustRelay.classifyFailure(new Error('Unexpected server response: 401'), relay), 'auth');
    assert.strictEqual(RustRelay.classifyFailure(new Error('Unexpected server response: 403'), relay), 'auth');
    assert.strictEqual(RustRelay.classifyFailure(new Error('Unexpected server response: 502'), relay), 'transient');
    assert.strictEqual(RustRelay.classifyFailure(new Error('getaddrinfo ENOTFOUND x'), relay), 'transient');
    assert.strictEqual(RustRelay.classifyFailure(new Error('socket hang up'), relay), 'transient');
    assert.strictEqual(RustRelay.classifyFailure(new Error('anything'), { expiresAt: 1 }), 'auth');
});

test('buildRelayUrl and subprotocols follow the relay wire format', () => {
    assert.strictEqual(
        RustRelay.buildRelayUrl('wss://example.test', 'abc-1', 42), 'wss://example.test/socket/abc-1?v=42');
    const [protocol, encoded] = RustRelay.relaySubprotocols('a+b/c==.sig');
    assert.strictEqual(protocol, 'rustplus.auth.v1');
    assert.ok(!/[+/=]/.test(encoded));
    assert.strictEqual(Buffer.from(encoded, 'base64url').toString('utf8'), 'a+b/c==.sig');
});
