const test = require('node:test');
const assert = require('node:assert');
const Path = require('path');
const Module = require('module');

/* index.js boots the Discord bot on require, so stub it before Battlemetrics pulls it in. */
const indexPath = require.resolve(Path.join(__dirname, '..', 'index.js'));
if (!require.cache[indexPath]) {
    const stub = new Module(indexPath, null);
    stub.filename = indexPath;
    stub.loaded = true;
    stub.exports = { client: { log: () => { }, intlGet: () => 'ERROR' } };
    require.cache[indexPath] = stub;
}

/* Capture what Battlemetrics hands to Axios instead of reaching the network. Loading is
   intercepted rather than seeded into require.cache so the suite runs without npm install. */
const requests = [];
const axiosStub = {
    get: async (url, config) => {
        requests.push({ url: url, config: config });
        return { status: 200, data: { data: {} } };
    }
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === 'axios') return axiosStub;
    return originalLoad.apply(this, arguments);
};
test.after(() => { Module._load = originalLoad; });

const Battlemetrics = require('../src/structures/Battlemetrics.js');

const ORIGINAL_KEY = process.env.RPP_BATTLEMETRICS_API_KEY;

function setKey(value) {
    if (value === null) delete process.env.RPP_BATTLEMETRICS_API_KEY;
    else process.env.RPP_BATTLEMETRICS_API_KEY = value;
}

test.after(() => setKey(ORIGINAL_KEY === undefined ? null : ORIGINAL_KEY));

test.beforeEach(() => {
    requests.length = 0;
    setKey(null);
});

test('isApiKeyConfigured reflects the environment', () => {
    setKey(null);
    assert.strictEqual(Battlemetrics.isApiKeyConfigured, false);

    setKey('');
    assert.strictEqual(Battlemetrics.isApiKeyConfigured, false);

    setKey('   ');
    assert.strictEqual(Battlemetrics.isApiKeyConfigured, false, 'whitespace is not a key');

    setKey('token-abc');
    assert.strictEqual(Battlemetrics.isApiKeyConfigured, true);
});

test('requests carry no Authorization header when no key is set', async () => {
    const bm = new Battlemetrics('12345');
    await bm.request('https://api.battlemetrics.com/servers/12345');

    assert.strictEqual(requests.length, 1);
    assert.deepStrictEqual(requests[0].config.headers, {});
});

test('requests carry a bearer token when a key is set', async () => {
    setKey('token-abc');

    const bm = new Battlemetrics('12345');
    await bm.request('https://api.battlemetrics.com/servers/12345');

    assert.strictEqual(requests.length, 1);
    assert.strictEqual(requests[0].config.headers['Authorization'], 'Bearer token-abc');
});

test('a surrounding whitespace key is trimmed before use', async () => {
    setKey('  token-abc\n');

    const bm = new Battlemetrics('12345');
    await bm.request('https://api.battlemetrics.com/servers/12345');

    assert.strictEqual(requests[0].config.headers['Authorization'], 'Bearer token-abc');
});

test('a key added after construction applies to the next request', async () => {
    const bm = new Battlemetrics('12345');
    await bm.request('https://api.battlemetrics.com/servers/12345');
    assert.strictEqual(requests[0].config.headers['Authorization'], undefined);

    setKey('token-later');
    await bm.request('https://api.battlemetrics.com/servers/12345');
    assert.strictEqual(requests[1].config.headers['Authorization'], 'Bearer token-later');
});

test('the token is never sent to a host other than the api', async () => {
    setKey('token-abc');

    const bm = new Battlemetrics('12345');
    await bm.request('https://evil.example.com/servers/12345');

    assert.strictEqual(requests.length, 0, 'the host allowlist rejects the call before Axios');
});

test('redirects stay refused so the token cannot be forwarded', async () => {
    setKey('token-abc');

    const bm = new Battlemetrics('12345');
    await bm.request('https://api.battlemetrics.com/servers/12345');

    assert.strictEqual(requests[0].config.maxRedirects, 0);
});
