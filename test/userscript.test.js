/*
    The generated Tampermonkey userscript (node --test): the metadata block, address handling, and
    its behaviour when run against fake page APIs.
*/

const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');

const { buildUserscript, normaliseBaseUrl } = require('../src/webserver/userscript.js');
const Auth = require('../src/webserver/Auth.js');

const KEY = '123.76561198000000001.' + 'ab'.repeat(24);
const STEAM_ID = '76561198000000001';

test('normaliseBaseUrl keeps only a plain http(s) origin', () => {
    assert.strictEqual(normaliseBaseUrl('http://192.168.1.10:3001/some/path?x=1'), 'http://192.168.1.10:3001');
    assert.strictEqual(normaliseBaseUrl(' https://ha.local '), 'https://ha.local');
    for (const bad of ['javascript:alert(1)', 'ftp://x', 'http://user:pw@host', 'not a url', '', undefined]) {
        assert.strictEqual(normaliseBaseUrl(bad), null);
    }
});

test('buildUserscript has the metadata, key and address, and rejects a bad address', () => {
    const script = buildUserscript({ baseUrl: 'http://192.168.1.10:3001/x', key: KEY, steamId: STEAM_ID });
    assert.match(script, /^\/\/ ==UserScript==/);
    assert.match(script, /@match\s+https:\/\/companion-rust\.facepunch\.com\/\*/);
    assert.match(script, /@run-at\s+document-start/);
    assert.match(script, /@connect\s+192\.168\.1\.10\n/);
    assert.ok(script.includes('"http://192.168.1.10:3001/api/relay-token/push"'));
    assert.ok(script.includes(JSON.stringify(KEY)));
    assert.throws(() => buildUserscript({ baseUrl: 'javascript:1', key: KEY, steamId: STEAM_ID }));
});

function run(scriptOptions, respond) {
    const requests = [];
    const page = {};
    const nodes = [];
    const document = {
        body: {
            appendChild: (node) => nodes.push(node)
        },
        getElementById: () => nodes[0] || null,
        createElement: () => ({
            style: {}, children: [], appendChild(c) { this.children.push(c); }, replaceChildren() { this.children = []; },
            addEventListener() {}, select() {}
        }),
        createTextNode: (text) => ({ text }),
        addEventListener() {}
    };
    const context = {
        unsafeWindow: page,
        document,
        JSON,
        Object,
        GM_xmlhttpRequest: (request) => { requests.push(request); respond(request); }
    };
    vm.runInNewContext(buildUserscript(scriptOptions), context);
    return { page, requests, nodes };
}

test('the userscript hooks ReactNativeWebView and posts the token with the key', () => {
    const { page, requests } = run(
        { baseUrl: 'http://10.0.0.5:3001', key: KEY, steamId: STEAM_ID },
        (request) => request.onload({ status: 200, responseText: '{"success":true}' }));

    assert.strictEqual(typeof page.ReactNativeWebView.postMessage, 'function');
    page.ReactNativeWebView.postMessage(JSON.stringify({ SteamId: STEAM_ID, Token: 'tok.en' }));

    assert.strictEqual(requests.length, 1);
    assert.strictEqual(requests[0].method, 'POST');
    assert.strictEqual(requests[0].url, 'http://10.0.0.5:3001/api/relay-token/push');
    assert.deepStrictEqual(JSON.parse(requests[0].data), { key: KEY, token: 'tok.en' });
});

test('the userscript ignores messages without a token and shows the token if the push fails', () => {
    const { page, requests, nodes } = run(
        { baseUrl: 'http://10.0.0.5:3001', key: KEY, steamId: STEAM_ID },
        (request) => request.onerror());

    page.ReactNativeWebView.postMessage('not json');
    page.ReactNativeWebView.postMessage(JSON.stringify({ hello: 'world' }));
    assert.strictEqual(requests.length, 0);

    page.ReactNativeWebView.postMessage({ Token: 'tok.en' });
    assert.strictEqual(requests.length, 1);
    const banner = nodes[0];
    assert.ok(banner.children.some(c => c.value === 'tok.en'), 'the token is offered for manual copy');
});

test('only the push endpoint is reachable without a WebUI session', () => {
    process.env.RPP_WEBUI_PASSWORD = 'pw';
    const auth = new Auth({ log: () => {} });
    const check = (path, method = 'POST') => {
        const res = { status(c) { this.code = c; return this; }, json() { return this; }, redirect() { return this; } };
        let passed = false;
        auth.requireAuth()({ path, method, headers: {}, socket: { remoteAddress: '203.0.113.7' } }, res, () => { passed = true; });
        return passed;
    };
    assert.strictEqual(check('/api/relay-token/push'), true);
    assert.strictEqual(check('/api/credentials', 'GET'), false);
    assert.strictEqual(check('/api/credentials/1/76561198000000001/userscript'), false);
    assert.strictEqual(check('/api/credentials/1/76561198000000001/token'), false);
});
