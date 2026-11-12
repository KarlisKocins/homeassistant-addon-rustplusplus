/*
    RelayRustPlus against a fake relay: a local ws server that checks the handshake the Facepunch
    relay expects (path, origin, subprotocols) and answers protobuf requests. This proves our side
    of the wire format; it cannot prove the real relay accepts it.
*/

const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const Path = require('node:path');

const LIB_DIR = Path.dirname(require.resolve('@liamcottle/rustplus.js'));
const { WebSocketServer } = require(require.resolve('ws', { paths: [LIB_DIR] }));
const protobuf = require(require.resolve('protobufjs', { paths: [LIB_DIR] }));

const RelayRustPlus = require('../src/structures/RelayRustPlus.js');
const RustRelay = require('../src/util/rustRelay.js');

const STEAM_ID = '76561198000000001';
const GUILD = 'guild-1';
const SERVER_IP = '10.9.8.7';
const APP_PORT = '28082';
const RELAY_ID = 'relay-server-id';

function makeToken(expiresInMs) {
    const payload = { steamId: STEAM_ID, version: 0, iss: 1, exp: Math.floor((Date.now() + expiresInMs) / 1000) };
    return `${Buffer.from(JSON.stringify(payload)).toString('base64')}.c2ln`;
}

let AppRequest;
let AppMessage;

/* mode: 'ok' answers requests; 'reject' answers the upgrade with 401; 'error' answers with 502 */
async function startFakeRelay(mode, token) {
    const root = await protobuf.load(Path.join(LIB_DIR, 'rustplus.proto'));
    AppRequest = root.lookupType('rustplus.AppRequest');
    AppMessage = root.lookupType('rustplus.AppMessage');

    const seen = [];
    const wss = new WebSocketServer({
        port: 0,
        host: '127.0.0.1',
        handleProtocols: (protocols) => (protocols.has('rustplus.auth.v1') ? 'rustplus.auth.v1' : false),
        verifyClient: (info, done) => {
            const protocols = (info.req.headers['sec-websocket-protocol'] || '').split(',').map(p => p.trim());
            seen.push({ url: info.req.url, origin: info.origin, protocols });
            if (mode === 'reject') return done(false, 401, 'Unauthorized');
            if (mode === 'error') return done(false, 502, 'Bad Gateway');
            if (mode === 'close') return done(true);
            const authOk = protocols[1] === Buffer.from(token).toString('base64url');
            return done(authOk, 401, 'Unauthorized');
        }
    });
    await new Promise(resolve => wss.on('listening', resolve));

    wss.on('connection', (socket) => {
        socket.send('relay hello (text frame, must be ignored)');
        if (mode === 'close') return setTimeout(() => socket.close(), 20);
        socket.on('message', (data, isBinary) => {
            if (!isBinary) return;
            const request = AppRequest.decode(data);
            const response = AppMessage.create({
                response: { seq: request.seq, info: { name: 'Fake Server', mapSize: 3500 } }
            });
            socket.send(AppMessage.encode(response).finish());
        });
    });

    return {
        seen,
        url: `ws://127.0.0.1:${wss.address().port}`,
        close: () => new Promise(resolve => { wss.clients.forEach(c => c.terminate()); wss.close(resolve); })
    };
}

class TestRustPlus extends RelayRustPlus {
    constructor(token, { serverIp = SERVER_IP, relayId = RELAY_ID } = {}) {
        super(serverIp, APP_PORT, STEAM_ID, '12345');
        this.logs = [];
        this.context = {
            guildId: GUILD,
            instance: {
                serverList: {
                    [`${serverIp}-${APP_PORT}`]: {
                        serverIp, appPort: APP_PORT, steamId: STEAM_ID, playerToken: '12345', relayServerId: relayId
                    }
                },
                serverListLite: {}
            },
            credentials: { [STEAM_ID]: token ? { rustplus_auth_token: token } : {} }
        };
    }

    getRelayContext() { return this.context; }
    log(title, text, level) { this.logs.push({ title, text, level }); }
}

function once(emitter, event) {
    return new Promise(resolve => emitter.once(event, (...args) => resolve(args)));
}

beforeEach(() => RustRelay.resetConnectionState());

test('connects through the relay with the expected path, origin and subprotocols, and round-trips a request', async () => {
    const token = makeToken(5 * 86400_000);
    const relay = await startFakeRelay('ok', token);
    const rustplus = new TestRustPlus(token);
    rustplus.relayBaseUrl = relay.url;

    try {
        const connected = once(rustplus, 'connected');
        rustplus.connect();
        await connected;

        assert.strictEqual(rustplus.connectionMode, 'relay');
        assert.strictEqual(relay.seen.length, 1);
        assert.match(relay.seen[0].url, new RegExp(`^/socket/${RELAY_ID}\\?v=\\d+$`));
        assert.strictEqual(relay.seen[0].origin, 'https://app.playrust.com');
        assert.strictEqual(relay.seen[0].protocols[0], 'rustplus.auth.v1');
        assert.strictEqual(relay.seen[0].protocols[1], Buffer.from(token).toString('base64url'));

        const response = await rustplus.sendRequestAsync({ getInfo: {} }, 5000);
        assert.strictEqual(response.info.name, 'Fake Server');

        const state = RustRelay.getState(rustplus.getStateKey());
        assert.strictEqual(state.lastWorked, 'relay');
        assert.ok(!rustplus.logs.some(l => `${l.text}`.includes(token)), 'token must never be logged');
    }
    finally {
        rustplus.disconnect();
        await relay.close();
    }
});

test('a 401 from the relay blocks reconnecting and flags the error as an auth failure', async () => {
    const token = makeToken(5 * 86400_000);
    const relay = await startFakeRelay('reject', token);
    const rustplus = new TestRustPlus(token);
    rustplus.relayBaseUrl = relay.url;

    try {
        const failed = once(rustplus, 'error');
        rustplus.connect();
        const [error] = await failed;

        assert.strictEqual(error.relayAuth, true);
        assert.strictEqual(rustplus.isRelayBlocked(), true);
        assert.strictEqual(RustRelay.isAuthRejected(GUILD, STEAM_ID), true);

        /* A new connect() attempt does not touch the network until a token is stored again. */
        const attempts = relay.seen.length;
        const blocked = once(rustplus, 'error');
        rustplus.connect();
        const [second] = await blocked;
        assert.strictEqual(second.code, 'RELAY_AUTH');
        assert.strictEqual(relay.seen.length, attempts);

        RustRelay.clearAuthBlocks(GUILD, STEAM_ID);
        assert.strictEqual(rustplus.isRelayBlocked(), false);
    }
    finally {
        rustplus.disconnect();
        await relay.close();
    }
});

test('a 502 from the relay is transient: it never blocks', async () => {
    const token = makeToken(5 * 86400_000);
    const relay = await startFakeRelay('error', token);
    const rustplus = new TestRustPlus(token);
    rustplus.relayBaseUrl = relay.url;

    try {
        const failed = once(rustplus, 'error');
        rustplus.connect();
        const [error] = await failed;

        assert.notStrictEqual(error.relayAuth, true);
        assert.strictEqual(rustplus.isRelayBlocked(), false);
        assert.strictEqual(RustRelay.getState(rustplus.getStateKey()).relayFailures, 1);
    }
    finally {
        rustplus.disconnect();
        await relay.close();
    }
});

test('an expired token blocks locally without contacting the relay', async () => {
    const token = makeToken(-60_000);
    const relay = await startFakeRelay('ok', token);
    const rustplus = new TestRustPlus(token);
    rustplus.relayBaseUrl = relay.url;

    try {
        const failed = once(rustplus, 'error');
        rustplus.connect();
        const [error] = await failed;

        assert.strictEqual(error.code, 'RELAY_AUTH');
        assert.strictEqual(error.relayReason, 'expired');
        assert.strictEqual(relay.seen.length, 0);
        assert.strictEqual(rustplus.isRelayBlocked(), true);
    }
    finally {
        await relay.close();
    }
});

test('a relay-only server without a token reports unavailable and does not go direct', async () => {
    const rustplus = new TestRustPlus(null, { serverIp: 'relay', relayId: RELAY_ID });

    const failed = once(rustplus, 'error');
    rustplus.connect();
    const [error] = await failed;

    assert.strictEqual(rustplus.connectionMode, 'unavailable');
    assert.strictEqual(error.code, 'RELAY_UNAVAILABLE');
    assert.ok(!rustplus.websocket, 'no socket may be opened');
});

test('a server without a relay id connects directly', async () => {
    const wss = new WebSocketServer({ port: 0, host: '127.0.0.1' });
    await new Promise(resolve => wss.on('listening', resolve));

    const rustplus = new RelayRustPlus('127.0.0.1', `${wss.address().port}`, STEAM_ID, '1');
    rustplus.getRelayContext = () => ({ guildId: GUILD, instance: { serverList: {}, serverListLite: {} }, credentials: {} });

    try {
        const connected = once(rustplus, 'connected');
        rustplus.connect();
        await connected;
        assert.strictEqual(rustplus.connectionMode, 'direct');
        assert.strictEqual(RustRelay.getState(rustplus.getStateKey()).lastWorked, 'direct');
    }
    finally {
        rustplus.disconnect();
        wss.clients.forEach(c => c.terminate());
        await new Promise(resolve => wss.close(resolve));
    }
});

test('a relay that accepts the upgrade and then drops is a failure, not a success', async () => {
    const token = makeToken(5 * 86400_000);
    const relay = await startFakeRelay('close', token);
    const rustplus = new TestRustPlus(token);
    rustplus.relayBaseUrl = relay.url;

    try {
        const disconnected = once(rustplus, 'disconnected');
        rustplus.connect();
        await disconnected;

        const state = RustRelay.getState(rustplus.getStateKey());
        assert.strictEqual(state.lastWorked, null, 'a text frame and a close never confirm the connection');
        assert.strictEqual(state.failures, 1);
        assert.strictEqual(state.relayFailures, 1);
        assert.strictEqual(rustplus.isRelayBlocked(), false);
        assert.strictEqual(rustplus.getReconnectDelayMs(1000), 1000);

        /* Keeps failing: the delay backs off, and after enough failures one direct attempt is made. */
        RustRelay.markFailure(rustplus.getStateKey(), 'relay');
        RustRelay.markFailure(rustplus.getStateKey(), 'relay');
        assert.strictEqual(rustplus.getReconnectDelayMs(1000), 4000);
        assert.strictEqual(
            RustRelay.chooseTransport({
                relay: { relayServerId: RELAY_ID, authToken: token, expiresAt: null },
                serverIp: SERVER_IP, state: RustRelay.getState(rustplus.getStateKey())
            }).mode,
            'direct');
    }
    finally {
        rustplus.disconnect();
        await relay.close();
    }
});
