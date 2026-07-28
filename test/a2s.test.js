const test = require('node:test');
const assert = require('node:assert');
const Dgram = require('dgram');
const Path = require('path');
const Module = require('module');

const A2S = require('../src/util/a2s.js');
const ServerInfo = require('../src/util/serverInfo.js');
const Constants = require('../src/util/constants.js');

/* index.js boots the Discord bot on require, so stub it before A2sServer pulls it in. */
const indexPath = require.resolve(Path.join(__dirname, '..', 'index.js'));
if (!require.cache[indexPath]) {
    const stub = new Module(indexPath, null);
    stub.filename = indexPath;
    stub.loaded = true;
    stub.exports = { client: { log: () => { }, intlGet: () => 'ERROR' } };
    require.cache[indexPath] = stub;
}

const A2sServer = require('../src/structures/A2sServer.js');

const CHALLENGE = Buffer.from([0xDE, 0xAD, 0xBE, 0xEF]);
const INFO_PAYLOAD_LENGTH = 'Source Engine Query\0'.length;

function cstr(value) {
    return Buffer.concat([Buffer.from(value, 'utf8'), Buffer.from([0])]);
}

function infoResponse(name, map, players, maxPlayers) {
    return Buffer.concat([
        Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x49, 17]),
        cstr(name), cstr(map), cstr('rust'), cstr('Rust'),
        Buffer.from([0xD2, 0x03]),
        Buffer.from([players, maxPlayers, 0])
    ]);
}

function playerResponse(players) {
    const entries = players.map(([name, duration]) => {
        const buffer = Buffer.alloc(4);
        buffer.writeFloatLE(duration);
        return Buffer.concat([Buffer.from([0]), cstr(name), Buffer.alloc(4), buffer]);
    });
    return Buffer.concat([Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x44, entries.length]), ...entries]);
}

/* Chop a response the way a real server does once the player list outgrows one datagram. */
function splitPackets(body, chunkSize) {
    const chunks = [];
    for (let i = 0; i < body.length; i += chunkSize) chunks.push(body.subarray(i, i + chunkSize));

    return chunks.map((payload, index) => {
        const head = Buffer.alloc(12);
        head.writeInt32LE(-2, 0);
        head.writeInt32LE(0x1234, 4);
        head.writeUInt8(chunks.length, 8);
        head.writeUInt8(index, 9);
        head.writeUInt16LE(chunkSize, 10);
        return Buffer.concat([head, payload]);
    });
}

/**
 *  A fake Rust server speaking just enough A2S to drive the client.
 */
function startFakeServer(options) {
    const state = {
        players: options.players,
        info: { name: 'Test Server', map: 'Procedural Map', players: options.infoPlayers, maxPlayers: 200 }
    };

    const socket = Dgram.createSocket('udp4');

    socket.on('message', (message, remote) => {
        const header = message.readUInt8(4);
        const send = (buffer) => socket.send(buffer, remote.port, remote.address);
        const challenge = Buffer.concat([Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x41]), CHALLENGE]);

        if (header === 0x54) {
            const answered = message.length > 5 + INFO_PAYLOAD_LENGTH;
            if (options.challengeInfo && !answered) return send(challenge);

            const players = state.info.players !== undefined ? state.info.players : state.players.length;
            return send(infoResponse(state.info.name, state.info.map, players, state.info.maxPlayers));
        }

        if (header === 0x55) {
            const sent = message.subarray(5, 9);
            if (sent.equals(Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]))) return send(challenge);
            assert.ok(sent.equals(CHALLENGE), 'client must echo the challenge it was given');

            const body = playerResponse(state.players);
            if (options.splitSize) {
                /* Deliver out of order to prove reassembly sorts by packet number. */
                return splitPackets(body, options.splitSize).reverse().forEach(send);
            }
            return send(body);
        }
    });

    return new Promise((resolve) => {
        socket.bind(0, '127.0.0.1', () => resolve({ socket: socket, port: socket.address().port, state: state }));
    });
}

test('queryInfo reads server details', async () => {
    const server = await startFakeServer({ players: [], infoPlayers: 42 });
    try {
        const info = await A2S.queryInfo('127.0.0.1', server.port);
        assert.strictEqual(info.name, 'Test Server');
        assert.strictEqual(info.map, 'Procedural Map');
        assert.strictEqual(info.players, 42);
        assert.strictEqual(info.maxPlayers, 200);
    }
    finally {
        server.socket.close();
    }
});

test('queryInfo answers a challenge and retries', async () => {
    const server = await startFakeServer({ players: [], infoPlayers: 1, challengeInfo: true });
    try {
        const info = await A2S.queryInfo('127.0.0.1', server.port);
        assert.strictEqual(info.name, 'Test Server');
    }
    finally {
        server.socket.close();
    }
});

test('queryPlayers reads names and durations', async () => {
    const server = await startFakeServer({ players: [['Alice', 3600], ['Bob', 65]], infoPlayers: 2 });
    try {
        const players = await A2S.queryPlayers('127.0.0.1', server.port);
        assert.strictEqual(players.length, 2);
        assert.strictEqual(players[0].name, 'Alice');
        assert.strictEqual(Math.round(players[0].duration), 3600);
    }
    finally {
        server.socket.close();
    }
});

test('queryPlayers reassembles out of order split packets', async () => {
    const many = Array.from({ length: 150 }, (_, i) => [`Player_${i}`, i * 10]);
    const server = await startFakeServer({ players: many, infoPlayers: 150, splitSize: 400 });
    try {
        const players = await A2S.queryPlayers('127.0.0.1', server.port);
        assert.strictEqual(players.length, 150);
        assert.strictEqual(players[0].name, 'Player_0');
        assert.strictEqual(players[149].name, 'Player_149');
    }
    finally {
        server.socket.close();
    }
});

test('queryPlayers drops entries with empty names', async () => {
    const server = await startFakeServer({ players: [['', 5], ['Real', 5], ['', 5]], infoPlayers: 3 });
    try {
        const players = await A2S.queryPlayers('127.0.0.1', server.port);
        assert.deepStrictEqual(players.map(e => e.name), ['Real']);
    }
    finally {
        server.socket.close();
    }
});

test('a query to an unreachable port rejects rather than hanging', async () => {
    await assert.rejects(() => A2S.queryInfo('127.0.0.1', 1, 500), /timed out/);
});

test('A2sServer tracks logins, logouts and session time', async () => {
    const server = await startFakeServer({ players: [['Alice', 7200], ['Bob', 120]], infoPlayers: undefined });
    try {
        const source = new A2sServer('127.0.0.1', server.port, null);
        await source.setup();

        assert.strictEqual(source.lastUpdateSuccessful, true);
        assert.strictEqual(source.server_name, 'Test Server');
        assert.deepStrictEqual(source.onlinePlayers.slice().sort(), ['Alice', 'Bob']);

        /* The id must never look like a numeric Battlemetrics id. */
        assert.match(source.id, /^a2s:127\.0\.0\.1:\d+$/);
        assert.strictEqual(/^\d+$/.test(source.id), false);

        /* A2S sourced players have no profile page. */
        assert.strictEqual(source.players['Alice']['url'], null);

        /* The reported duration becomes the session length. */
        const online = source.getOnlineTime('Alice');
        assert.ok(online[0] >= 7199 && online[0] <= 7202, `unexpected session time ${online[0]}`);
        assert.strictEqual(source.getOnlinePlayerIdsOrderedByTime()[0], 'Alice');

        /* First evaluation must not manufacture login events. */
        assert.strictEqual(source.connectionLog.length, 0);

        /* Bob leaves, Carol joins. */
        server.state.players = [['Alice', 7260], ['Carol', 30]];
        await source.evaluation();

        assert.deepStrictEqual(source.logoutPlayers, ['Bob']);
        assert.deepStrictEqual(source.newPlayers, ['Carol']);
        assert.deepStrictEqual(source.offlinePlayers, ['Bob']);
        assert.strictEqual(source.players['Bob']['status'], false);
        assert.ok(source.getOfflineTime('Bob') !== null);

        /* Bob comes back. */
        server.state.players = [['Alice', 7320], ['Carol', 90], ['Bob', 5]];
        await source.evaluation();

        assert.deepStrictEqual(source.loginPlayers, ['Bob']);
        assert.strictEqual(source.players['Bob']['status'], true);
        assert.strictEqual(source.offlinePlayers.length, 0);

        /* A2S cannot correlate a rename, so this stays empty by design. */
        assert.deepStrictEqual(source.nameChangedPlayers, []);
    }
    finally {
        server.socket.close();
    }
});

test('A2sServer reports failure when the server stops answering', async () => {
    const server = await startFakeServer({ players: [['Alice', 10]], infoPlayers: undefined });
    const source = new A2sServer('127.0.0.1', server.port, null);
    await source.setup();
    assert.strictEqual(source.lastUpdateSuccessful, true);

    server.socket.close();

    const result = await source.evaluation();
    assert.strictEqual(result, false);
    assert.strictEqual(source.lastUpdateSuccessful, false);
    assert.strictEqual(source.server_status, false);
    assert.strictEqual(source.getOnlineTime('Alice'), null);
});

test('resolveQueryAddress prefers queryPort, then connect, then the default game port', () => {
    assert.deepStrictEqual(
        ServerInfo.resolveQueryAddress({ serverIp: '1.2.3.4', queryPort: 28016, connect: 'connect 1.2.3.4:28015' }),
        { host: '1.2.3.4', port: 28016, source: 'queryPort' });

    assert.deepStrictEqual(
        ServerInfo.resolveQueryAddress({ serverIp: '1.2.3.4', queryIp: '5.6.7.8', queryPort: 28016 }),
        { host: '5.6.7.8', port: 28016, source: 'queryPort' });

    assert.deepStrictEqual(
        ServerInfo.resolveQueryAddress({ serverIp: '1.2.3.4', connect: 'connect 9.9.9.9:28015' }),
        { host: '9.9.9.9', port: 28015, source: 'connect' });

    /* The serverList port is the Rust+ app port, so it must never be used as the query port. */
    assert.deepStrictEqual(
        ServerInfo.resolveQueryAddress({ serverIp: '1.2.3.4', appPort: 28082, connect: null }),
        { host: '1.2.3.4', port: A2S.DEFAULT_QUERY_PORT, source: 'default' });

    assert.deepStrictEqual(
        ServerInfo.resolveQueryAddress(null, '7.7.7.7-28082'),
        { host: '7.7.7.7', port: A2S.DEFAULT_QUERY_PORT, source: 'default' });

    assert.strictEqual(ServerInfo.resolveQueryAddress(null, null), null);
});

test('profile and server links degrade to plain text for A2S ids', () => {
    assert.strictEqual(Constants.GET_BATTLEMETRICS_PROFILE_LINK('123456'),
        '[123456](https://www.battlemetrics.com/players/123456)');
    assert.strictEqual(Constants.GET_BATTLEMETRICS_PROFILE_LINK('Alice'), 'Alice');

    assert.strictEqual(Constants.GET_BATTLEMETRICS_SERVER_LINK('1477148'),
        '[1477148](https://www.battlemetrics.com/servers/rust/1477148)');
    assert.strictEqual(Constants.GET_BATTLEMETRICS_SERVER_LINK('a2s:1.2.3.4:28015'), 'a2s:1.2.3.4:28015');
});
