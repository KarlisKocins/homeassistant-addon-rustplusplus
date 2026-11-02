/*
    Unit tests for the request-level auth paths of the WebUI (node --test, no framework):
    who counts as authenticated, the cookie flags, and the Express / socket.io middleware.
*/

const { test } = require('node:test');
const assert = require('node:assert');

process.env.RPP_WEBUI_PASSWORD = 'unit-test-password';

const Auth = require('../src/webserver/Auth.js');

const auth = new Auth({ log: () => {} });

const OUTSIDE = '203.0.113.7';
const INGRESS = '172.30.32.2';

function makeReq(overrides = {}) {
    return {
        path: '/api/switches/1',
        method: 'GET',
        headers: {},
        socket: { remoteAddress: OUTSIDE },
        ...overrides
    };
}

function makeRes() {
    const res = { statusCode: null, body: null, redirectedTo: null };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    res.redirect = (url) => { res.redirectedTo = url; return res; };
    return res;
}

function runMiddleware(req) {
    const res = makeRes();
    let nextCalled = false;
    auth.requireAuth()(req, res, () => { nextCalled = true; });
    return { res, nextCalled };
}

/* "rpp_session=<token>" taken from a freshly issued Set-Cookie value */
function validSessionCookie() {
    return auth.sessionCookieValue({ headers: {} }).split(';')[0];
}

test('requests from outside without a cookie are not authenticated', () => {
    assert.strictEqual(auth.isAuthenticated(makeReq()), false);
});

test('a valid session cookie authenticates', () => {
    const req = makeReq({ headers: { cookie: validSessionCookie() } });
    assert.strictEqual(auth.isAuthenticated(req), true);
});

test('an expired session cookie does not authenticate', () => {
    const name = validSessionCookie().split('=')[0];
    const expired = auth.signToken('session', Date.now() - 1000);
    const req = makeReq({ headers: { cookie: `${name}=${expired}` } });
    assert.strictEqual(auth.isAuthenticated(req), false);
});

test('a cookie signed for another scope does not authenticate', () => {
    const name = validSessionCookie().split('=')[0];
    const statsToken = auth.signToken('stats:123', Date.now() + 60000);
    const req = makeReq({ headers: { cookie: `${name}=${statsToken}` } });
    assert.strictEqual(auth.isAuthenticated(req), false);
});

test('Home Assistant ingress is authenticated without a cookie', () => {
    assert.strictEqual(auth.isAuthenticated(makeReq({ socket: { remoteAddress: INGRESS } })), true);
});

test('the session cookie is HttpOnly and SameSite=Lax, and Secure only behind https', () => {
    const plain = auth.sessionCookieValue({ headers: {} });
    assert.match(plain, /; HttpOnly;/);
    assert.match(plain, /; SameSite=Lax;/);
    assert.match(plain, /; Max-Age=604800/);
    assert.doesNotMatch(plain, /Secure/);

    const behindHttps = auth.sessionCookieValue({ headers: { 'x-forwarded-proto': 'https' } });
    assert.match(behindHttps, /; Secure$/);
});

test('clearing the session cookie expires it immediately', () => {
    assert.match(auth.clearSessionCookieValue(), /; Max-Age=0$/);
});

test('stats access is limited to the guild the cookie was issued for', () => {
    const cookie = auth.statsCookieValue({ headers: {} }, '111').split(';')[0];
    const req = makeReq({ headers: { cookie } });
    assert.strictEqual(auth.hasStatsAccess(req, '111'), true);
    assert.strictEqual(auth.hasStatsAccess(req, '222'), false);
    assert.strictEqual(auth.hasStatsAccess(makeReq(), '111'), false);
});

test('requireAuth lets the public paths through without a login', () => {
    for (const path of ['/login.html', '/style.css', '/api/auth/login', '/api/auth/status', '/api/health']) {
        const { nextCalled, res } = runMiddleware(makeReq({ path }));
        assert.strictEqual(nextCalled, true, path);
        assert.strictEqual(res.statusCode, null, path);
    }
});

test('requireAuth answers 401 JSON to unauthenticated API and socket.io requests', () => {
    for (const path of ['/api/switches/1', '/socket.io/?EIO=4']) {
        const { nextCalled, res } = runMiddleware(makeReq({ path }));
        assert.strictEqual(nextCalled, false, path);
        assert.strictEqual(res.statusCode, 401, path);
        assert.strictEqual(res.body.success, false, path);
    }
});

test('requireAuth redirects unauthenticated page requests to the login page', () => {
    const { nextCalled, res } = runMiddleware(makeReq({ path: '/index.html' }));
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.redirectedTo, 'login.html');
});

test('requireAuth lets an authenticated GET through', () => {
    const { nextCalled } = runMiddleware(makeReq({ headers: { cookie: validSessionCookie() } }));
    assert.strictEqual(nextCalled, true);
});

test('requireAuth rejects an authenticated POST from a foreign origin', () => {
    const { nextCalled, res } = runMiddleware(makeReq({
        method: 'POST',
        headers: { cookie: validSessionCookie(), origin: 'https://evil.example', host: 'rust.local' }
    }));
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
});

test('requireAuth accepts an authenticated POST from the same origin or with no Origin header', () => {
    const sameOrigin = runMiddleware(makeReq({
        method: 'POST',
        headers: { cookie: validSessionCookie(), origin: 'https://rust.local', host: 'rust.local' }
    }));
    assert.strictEqual(sameOrigin.nextCalled, true);

    const noOrigin = runMiddleware(makeReq({ method: 'POST', headers: { cookie: validSessionCookie() } }));
    assert.strictEqual(noOrigin.nextCalled, true);
});

test('requireAuth lets an unauthenticated POST from outside get a 401, not a pass', () => {
    const { nextCalled, res } = runMiddleware(makeReq({ method: 'POST' }));
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
});

test('requireAuth trusts the Home Assistant ingress address', () => {
    const { nextCalled } = runMiddleware(makeReq({ socket: { remoteAddress: INGRESS } }));
    assert.strictEqual(nextCalled, true);
});

function runSocket(socket) {
    let result = 'pending';
    auth.socketAuth()(socket, (error) => { result = error || null; });
    return result;
}

test('socketAuth accepts ingress and a valid session cookie', () => {
    assert.strictEqual(runSocket({ request: { socket: { remoteAddress: INGRESS } }, handshake: { headers: {} } }), null);
    assert.strictEqual(runSocket({
        request: { socket: { remoteAddress: OUTSIDE } },
        handshake: { headers: { cookie: validSessionCookie() } }
    }), null);
});

test('socketAuth rejects a socket with no valid cookie', () => {
    const error = runSocket({ request: { socket: { remoteAddress: OUTSIDE } }, handshake: { headers: {} } });
    assert.ok(error instanceof Error);
    assert.strictEqual(error.message, 'Authentication required');
});
