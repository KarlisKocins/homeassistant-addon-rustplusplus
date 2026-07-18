/*
    Copyright (C) 2026 Alexander Emanuelsson (alexemanuelol)

    WebUI authentication for the RustPlusPlus Home Assistant add-on.

    - Stateless HMAC-signed session cookies (no session store, no new deps).
    - Requests arriving through Home Assistant ingress (source 172.30.32.2)
      are pre-authenticated by HA and bypass the password check.
    - A per-install session secret is generated once and persisted so
      sessions survive add-on restarts.
*/

const Crypto = require('crypto');
const Fs = require('fs');
const Path = require('path');

const Config = require('../../config');

const SESSION_COOKIE = 'rpp_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;      /* 7 days */
const STATS_TTL_MS = 12 * 60 * 60 * 1000;            /* 12 hours */
const HA_INGRESS_ADDRESSES = ['172.30.32.2', '::ffff:172.30.32.2'];

class Auth {
    constructor(client) {
        this.client = client;
        this.secret = this.loadOrCreateSecret();
        this.password = this.resolvePassword();
    }

    /* Persist a random secret under /data so cookies stay valid across restarts */
    loadOrCreateSecret() {
        const dir = Path.join(__dirname, '..', '..', 'instances');
        const file = Path.join(dir, 'webui_secret.json');

        try {
            const parsed = JSON.parse(Fs.readFileSync(file, 'utf8'));
            if (typeof parsed.secret === 'string' && parsed.secret.length >= 32) {
                return parsed.secret;
            }
        }
        catch (error) {
            /* Missing or corrupt - regenerate below */
        }

        const secret = Crypto.randomBytes(32).toString('hex');
        try {
            if (!Fs.existsSync(dir)) Fs.mkdirSync(dir, { recursive: true });
            Fs.writeFileSync(file, JSON.stringify({ secret: secret }), { mode: 0o600 });
        }
        catch (error) {
            this.client.log('WARNING', `WebUI auth: could not persist session secret: ${error.message}`);
        }
        return secret;
    }

    /* Configured password, or an auto-generated token logged at startup */
    resolvePassword() {
        const configured = Config.webui.password;
        if (typeof configured === 'string' && configured.length > 0) {
            return configured;
        }

        const generated = Crypto.randomBytes(18).toString('base64url');
        this.client.log('WARNING', '='.repeat(72));
        this.client.log('WARNING', 'WebUI: no webui_password configured.');
        this.client.log('WARNING', `WebUI: generated access token: ${generated}`);
        this.client.log('WARNING', 'WebUI: use this token to log in, or set webui_password in the add-on');
        this.client.log('WARNING', 'WebUI: configuration. A new token is generated on every restart.');
        this.client.log('WARNING', '='.repeat(72));
        return generated;
    }

    hmac(payload) {
        return Crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
    }

    signToken(scope, expiresAt) {
        return `${expiresAt}.${this.hmac(`${scope}:${expiresAt}`)}`;
    }

    verifyToken(scope, token) {
        if (typeof token !== 'string') return false;
        const dot = token.indexOf('.');
        if (dot <= 0) return false;

        const expiresAt = parseInt(token.slice(0, dot), 10);
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;

        const expected = this.hmac(`${scope}:${expiresAt}`);
        const actual = token.slice(dot + 1);
        if (expected.length !== actual.length) return false;
        return Crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
    }

    checkPassword(candidate) {
        if (typeof candidate !== 'string' || candidate.length === 0) return false;
        const a = Buffer.from(candidate);
        const b = Buffer.from(this.password);
        if (a.length !== b.length) {
            /* Compare against self to keep timing uniform, then fail */
            Crypto.timingSafeEqual(a, a);
            return false;
        }
        return Crypto.timingSafeEqual(a, b);
    }

    parseCookies(cookieHeader) {
        const cookies = {};
        if (typeof cookieHeader !== 'string') return cookies;
        for (const part of cookieHeader.split(';')) {
            const eq = part.indexOf('=');
            if (eq <= 0) continue;
            cookies[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
        }
        return cookies;
    }

    /* HA ingress requests are pre-authenticated by Home Assistant */
    isIngressRequest(req) {
        const address = req.socket?.remoteAddress;
        return HA_INGRESS_ADDRESSES.includes(address);
    }

    isAuthenticated(req) {
        if (this.isIngressRequest(req)) return true;
        const cookies = this.parseCookies(req.headers?.cookie);
        return this.verifyToken('session', cookies[SESSION_COOKIE]);
    }

    sessionCookieValue(req) {
        const expiresAt = Date.now() + SESSION_TTL_MS;
        const token = this.signToken('session', expiresAt);
        const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
        return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; ` +
            `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`;
    }

    clearSessionCookieValue() {
        return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
    }

    statsCookieName(guildId) {
        return `rpp_stats_${guildId}`;
    }

    statsCookieValue(req, guildId) {
        const expiresAt = Date.now() + STATS_TTL_MS;
        const token = this.signToken(`stats:${guildId}`, expiresAt);
        const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
        return `${this.statsCookieName(guildId)}=${token}; HttpOnly; SameSite=Lax; Path=/; ` +
            `Max-Age=${Math.floor(STATS_TTL_MS / 1000)}${secure}`;
    }

    hasStatsAccess(req, guildId) {
        const cookies = this.parseCookies(req.headers?.cookie);
        return this.verifyToken(`stats:${guildId}`, cookies[this.statsCookieName(guildId)]);
    }

    /* Cheap CSRF check: mutating requests must not come from a foreign origin */
    isSameOrigin(req) {
        const origin = req.headers.origin;
        if (!origin) return true; /* same-origin fetches and curl omit Origin */
        try {
            return new URL(origin).host === req.headers.host;
        }
        catch (error) {
            return false;
        }
    }

    /* Express middleware protecting everything except the allowlist */
    requireAuth() {
        const publicPaths = new Set([
            '/login.html',
            '/style.css',
            '/api/auth/login',
            '/api/auth/status',
            '/api/health'
        ]);

        return (req, res, next) => {
            if (publicPaths.has(req.path)) return next();

            if (!this.isAuthenticated(req)) {
                if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io')) {
                    return res.status(401).json({ success: false, error: 'Authentication required' });
                }
                return res.redirect('login.html');
            }

            if (req.method !== 'GET' && req.method !== 'HEAD' && !this.isSameOrigin(req)) {
                return res.status(403).json({ success: false, error: 'Cross-origin request rejected' });
            }

            next();
        };
    }

    /* socket.io middleware (io.use) applying the same rules to websockets */
    socketAuth() {
        return (socket, next) => {
            const address = socket.request?.socket?.remoteAddress;
            if (HA_INGRESS_ADDRESSES.includes(address)) return next();

            const cookies = this.parseCookies(socket.handshake?.headers?.cookie);
            if (this.verifyToken('session', cookies[SESSION_COOKIE])) return next();

            next(new Error('Authentication required'));
        };
    }
}

module.exports = Auth;
