/*
    Unit tests for the WebUI auth module (node --test, no framework).
*/

const { test } = require('node:test');
const assert = require('node:assert');

process.env.RPP_WEBUI_PASSWORD = 'unit-test-password';

const Auth = require('../src/webserver/Auth.js');

const mockClient = { log: () => {} };
const auth = new Auth(mockClient);

test('signToken/verifyToken round-trip', () => {
    const token = auth.signToken('session', Date.now() + 60000);
    assert.strictEqual(auth.verifyToken('session', token), true);
});

test('expired token is rejected', () => {
    const token = auth.signToken('session', Date.now() - 1000);
    assert.strictEqual(auth.verifyToken('session', token), false);
});

test('tampered token is rejected', () => {
    const token = auth.signToken('session', Date.now() + 60000);
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
    assert.strictEqual(auth.verifyToken('session', tampered), false);
});

test('scope isolation: session token is not a stats token', () => {
    const token = auth.signToken('session', Date.now() + 60000);
    assert.strictEqual(auth.verifyToken('stats:guild1', token), false);
});

test('stats token bound to its guild', () => {
    const token = auth.signToken('stats:guild1', Date.now() + 60000);
    assert.strictEqual(auth.verifyToken('stats:guild1', token), true);
    assert.strictEqual(auth.verifyToken('stats:guild2', token), false);
});

test('checkPassword accepts configured password only', () => {
    assert.strictEqual(auth.checkPassword('unit-test-password'), true);
    assert.strictEqual(auth.checkPassword('wrong'), false);
    assert.strictEqual(auth.checkPassword(''), false);
    assert.strictEqual(auth.checkPassword(undefined), false);
});

test('parseCookies handles normal and malformed headers', () => {
    assert.deepStrictEqual(auth.parseCookies('a=1; b=2'), { a: '1', b: '2' });
    assert.deepStrictEqual(auth.parseCookies(undefined), {});
    assert.deepStrictEqual(auth.parseCookies('malformed'), {});
});

test('isSameOrigin', () => {
    assert.strictEqual(auth.isSameOrigin({ headers: { host: 'x.com' } }), true);
    assert.strictEqual(auth.isSameOrigin({ headers: { origin: 'https://x.com', host: 'x.com' } }), true);
    assert.strictEqual(auth.isSameOrigin({ headers: { origin: 'https://evil.com', host: 'x.com' } }), false);
    assert.strictEqual(auth.isSameOrigin({ headers: { origin: 'not a url', host: 'x.com' } }), false);
});

test('ingress addresses recognized', () => {
    assert.strictEqual(auth.isIngressRequest({ socket: { remoteAddress: '172.30.32.2' } }), true);
    assert.strictEqual(auth.isIngressRequest({ socket: { remoteAddress: '::ffff:172.30.32.2' } }), true);
    assert.strictEqual(auth.isIngressRequest({ socket: { remoteAddress: '203.0.113.7' } }), false);
});
