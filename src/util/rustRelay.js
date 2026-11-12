/*
    Rust+ relay support: pure helpers.

    Since the 2026-11-05 Rust update game servers drop direct ws://<ip>:<app.port> connections.
    Clients connect through the Facepunch relay instead:

        wss://companion-rust.facepunch.com/socket/<relayServerId>?v=<ms>
        subprotocols: ["rustplus.auth.v1", base64url(<Rust+ auth token>)]
        origin:       https://app.playrust.com

    - relayServerId is the "id" field of the in-game pairing notification. It identifies the
      server and stays the same across wipes.
    - The auth token is the Rust+ (Steam login) token, not the FCM credentials. It is stored per
      steamId in the credentials file and is valid for about 14 days.

    This module has no dependency on the bot (index.js), so everything here can be unit tested.
    Callers pass in the instance/credentials objects they already hold.
*/

const RELAY_BASE_URL = 'wss://companion-rust.facepunch.com';
const RELAY_ORIGIN = 'https://app.playrust.com';
const RELAY_SUBPROTOCOL = 'rustplus.auth.v1';

/* serverIp used for servers that were only ever seen through a relay pairing notification. */
const RELAY_SERVER_IP = 'relay';

/* Warn the credential owner when the token has less than this left. */
const EXPIRY_WARNING_MS = 3 * 24 * 60 * 60 * 1000;

/* After this many failed relay attempts in a row (and no success yet) a server with a real
   address gets one direct attempt, in case it has not moved to the relay. */
const DIRECT_FALLBACK_AFTER = 3;

/* ---------------------------------------------------------------------------------------------
   Auth token
   --------------------------------------------------------------------------------------------- */

function b64url(str) {
    return Buffer.from(str, 'utf8').toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* Accept the token the way users paste it: bare, URL-encoded, quoted, or as the whole
   .../callback?token=... URL the credentials page redirects to. */
function normaliseAuthToken(token) {
    if (typeof token !== 'string') return null;
    let normalised = token.trim().replace(/^["']+|["']+$/g, '');

    const match = normalised.match(/[?&]token=([^&#\s]+)/);
    if (match) normalised = match[1];

    if (normalised.includes('%')) {
        try { normalised = decodeURIComponent(normalised); } catch (e) { /* keep as is */ }
    }
    return normalised.length > 0 ? normalised : null;
}

/* Token format: base64(json payload).signature, payload = { steamId, version, iss, exp }.
   iss/exp are unix seconds. Returns null when the token is not in that format. */
function parseAuthToken(token) {
    if (typeof token !== 'string' || !token.includes('.')) return null;
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString('utf8'));
        if (!payload || typeof payload !== 'object') return null;
        return {
            steamId: payload.steamId ? `${payload.steamId}` : null,
            issuedAt: Number(payload.iss) || null,
            expiresAt: Number(payload.exp) || null
        };
    }
    catch (e) {
        return null;
    }
}

/*
    Health of a stored token. status is one of:
        missing   - no token stored
        invalid   - stored, but not a parseable token
        expired   - past its expiry
        expiring  - valid for less than EXPIRY_WARNING_MS more
        ok        - valid (also used when the token carries no expiry)
    expiresAt is unix seconds or null.
*/
function tokenStatus(token, now = Date.now()) {
    const normalised = normaliseAuthToken(token);
    if (!normalised) return { status: 'missing', expiresAt: null, steamId: null };

    const parsed = parseAuthToken(normalised);
    if (!parsed) return { status: 'invalid', expiresAt: null, steamId: null };

    const result = { status: 'ok', expiresAt: parsed.expiresAt, steamId: parsed.steamId };
    if (parsed.expiresAt) {
        const left = parsed.expiresAt * 1000 - now;
        if (left <= 0) result.status = 'expired';
        else if (left < EXPIRY_WARNING_MS) result.status = 'expiring';
    }
    return result;
}

/* ---------------------------------------------------------------------------------------------
   Pairing: which server entry does a notification belong to?
   --------------------------------------------------------------------------------------------- */

function isRelayId(value) {
    return value !== undefined && value !== null && `${value}`.length > 0;
}

function findServerKeyByRelayId(instance, relayServerId) {
    for (const [serverId, server] of Object.entries(instance.serverList || {})) {
        if (server && server.relayServerId === relayServerId) return serverId;
    }
    for (const [serverId, lites] of Object.entries(instance.serverListLite || {})) {
        for (const lite of Object.values(lites || {})) {
            if (lite && lite.relayServerId === relayServerId) return serverId;
        }
    }
    return null;
}

/* Same server and player as before: the playerToken is unique per (server, player). Only an
   unambiguous match is used. */
function findServerKeyByPlayerToken(instance, playerToken, playerId) {
    if (!playerToken || !playerId) return null;

    const matches = new Set();
    for (const [serverId, server] of Object.entries(instance.serverList || {})) {
        if (server && server.playerToken === playerToken && `${server.steamId}` === `${playerId}`) {
            matches.add(serverId);
        }
    }
    for (const [serverId, lites] of Object.entries(instance.serverListLite || {})) {
        for (const lite of Object.values(lites || {})) {
            if (lite && lite.playerToken === playerToken && `${lite.steamId}` === `${playerId}`) {
                matches.add(serverId);
            }
        }
    }
    return matches.size === 1 ? [...matches][0] : null;
}

function addressOfKey(instance, serverId) {
    const server = (instance.serverList || {})[serverId];
    if (server && server.serverIp) return { serverIp: server.serverIp, appPort: `${server.appPort}` };

    for (const lite of Object.values((instance.serverListLite || {})[serverId] || {})) {
        if (lite && lite.serverIp) return { serverIp: lite.serverIp, appPort: `${lite.appPort}` };
    }
    return null;
}

/*
    Decide which server entry a pairing notification refers to. The key of an entry is always
    `${serverIp}-${appPort}`: Home Assistant entity ids, MQTT topics and the RustPlus instance
    all derive from it, so an existing entry must never be re-keyed.

    1. The notification carries ip and port: use them (the legacy path).
    2. Otherwise match an existing entry on the relay id, then on playerToken + steamId, and keep
       that entry's key and address.
    3. Only a server never seen before gets the key `relay-<relayServerId>`.

    Returns { serverIp, appPort, serverId, relayServerId, adopted } or null if the notification
    has neither an address nor a relay id. adopted is true when an existing entry was matched on
    playerToken (so the relay id is new to it and should be stamped on, see stampRelayId).
*/
function resolvePairing(instance, body) {
    if (!body) return null;
    const relayServerId = isRelayId(body.id) ? `${body.id}` : null;

    if (body.ip && body.port) {
        return {
            serverIp: `${body.ip}`,
            appPort: `${body.port}`,
            serverId: `${body.ip}-${body.port}`,
            relayServerId: relayServerId,
            adopted: false
        };
    }
    if (!relayServerId) return null;

    const byRelayId = findServerKeyByRelayId(instance, relayServerId);
    if (byRelayId) {
        const address = addressOfKey(instance, byRelayId);
        if (address) return { ...address, serverId: byRelayId, relayServerId: relayServerId, adopted: false };
    }

    const byToken = findServerKeyByPlayerToken(instance, body.playerToken, body.playerId);
    if (byToken) {
        const address = addressOfKey(instance, byToken);
        if (address) return { ...address, serverId: byToken, relayServerId: relayServerId, adopted: true };
    }

    return {
        serverIp: RELAY_SERVER_IP,
        appPort: relayServerId,
        serverId: `${RELAY_SERVER_IP}-${relayServerId}`,
        relayServerId: relayServerId,
        adopted: false
    };
}

/* Record the relay id on an entry (and the lite entries of the same server), and fold in lite
   entries that were stored under a provisional relay-<id> key before the real key was known.
   Mutates instance. Returns true if anything changed. */
function stampRelayId(instance, pairing) {
    if (!pairing || !pairing.relayServerId) return false;
    let changed = false;
    const { serverId, relayServerId } = pairing;

    const server = instance.serverList ? instance.serverList[serverId] : null;
    if (server && server.relayServerId !== relayServerId) {
        server.relayServerId = relayServerId;
        changed = true;
    }

    const provisionalKey = `${RELAY_SERVER_IP}-${relayServerId}`;
    if (instance.serverListLite) {
        if (serverId !== provisionalKey && instance.serverListLite[provisionalKey]) {
            if (!instance.serverListLite[serverId]) instance.serverListLite[serverId] = new Object();
            for (const [steamId, lite] of Object.entries(instance.serverListLite[provisionalKey])) {
                if (!instance.serverListLite[serverId][steamId]) {
                    const address = addressOfKey(instance, serverId);
                    instance.serverListLite[serverId][steamId] = {
                        ...lite,
                        ...(address ? address : {})
                    };
                }
            }
            delete instance.serverListLite[provisionalKey];
            changed = true;
        }

        for (const lite of Object.values(instance.serverListLite[serverId] || {})) {
            if (lite && lite.relayServerId !== relayServerId) {
                lite.relayServerId = relayServerId;
                changed = true;
            }
        }
    }
    return changed;
}

function resolveAndStamp(instance, body) {
    const pairing = resolvePairing(instance, body);
    if (pairing) stampRelayId(instance, pairing);
    return pairing;
}

/* ---------------------------------------------------------------------------------------------
   Connection choice
   --------------------------------------------------------------------------------------------- */

/* Relay details for a server/player, or null when the server has no relay id. authToken is null
   when the player has no usable token. */
function resolveConnection(instance, credentials, serverIp, appPort, steamId) {
    if (!instance) return null;
    const serverKey = `${serverIp}-${appPort}`;

    let relayServerId = null;
    const server = instance.serverList ? instance.serverList[serverKey] : null;
    if (server && server.relayServerId) relayServerId = server.relayServerId;

    if (!relayServerId && instance.serverListLite && instance.serverListLite[serverKey]) {
        for (const lite of Object.values(instance.serverListLite[serverKey])) {
            if (lite && lite.relayServerId) {
                relayServerId = lite.relayServerId;
                break;
            }
        }
    }
    if (!relayServerId) return null;

    const credential = credentials ? credentials[`${steamId}`] : null;
    const authToken = credential ? normaliseAuthToken(credential.rustplus_auth_token) : null;
    const parsed = authToken ? parseAuthToken(authToken) : null;
    return {
        relayServerId: relayServerId,
        authToken: authToken,
        expiresAt: parsed ? parsed.expiresAt : null
    };
}

/*
    Per (guild, server, steamId) connection memory. The bot builds a fresh RustPlus object on
    every reconnect, so what has worked, what keeps failing, and whether the relay rejected the
    token has to live outside the instance.
*/
const connectionState = new Map();

function stateKey(guildId, serverKey, steamId) {
    return `${guildId}|${serverKey}|${steamId}`;
}

function getState(key) {
    if (!connectionState.has(key)) {
        const [guildId, serverKey, steamId] = key.split('|');
        connectionState.set(key, {
            guildId, serverKey, steamId, lastWorked: null, relayFailures: 0, authBlocked: false, reason: null
        });
    }
    return connectionState.get(key);
}

function markWorked(key, mode) {
    const state = getState(key);
    state.lastWorked = mode;
    state.relayFailures = 0;
    state.authBlocked = false;
    state.reason = null;
}

function markRelayFailure(key) {
    getState(key).relayFailures += 1;
}

function markAuthBlocked(key, reason) {
    const state = getState(key);
    state.authBlocked = true;
    state.reason = reason;
}

/* A new token was stored for this player: let every server try the relay again. */
function clearAuthBlocks(guildId, steamId) {
    for (const state of connectionState.values()) {
        if (state.guildId === `${guildId}` && state.steamId === `${steamId}`) {
            state.authBlocked = false;
            state.reason = null;
            state.relayFailures = 0;
        }
    }
}

/* Whether the relay rejected the token of this player (for the HA problem sensor / WebUI). */
function isAuthRejected(guildId, steamId) {
    for (const state of connectionState.values()) {
        if (state.guildId === `${guildId}` && state.steamId === `${steamId}` && state.authBlocked) return true;
    }
    return false;
}

function resetConnectionState() {
    connectionState.clear();
}

/*
    Pick how to connect. mode is one of:
        relay        - connect through the Facepunch relay
        direct       - legacy ws://ip:port (server without relay id, or relay not working)
        blocked      - the relay needs a token that is expired or was rejected; retrying cannot help
        unavailable  - nothing to connect with (relay-only server without a token)
*/
function chooseTransport({ relay, serverIp, state, now = Date.now() }) {
    const hasAddress = serverIp !== RELAY_SERVER_IP;

    if (!relay) {
        return hasAddress ? { mode: 'direct', reason: 'no relay server id' }
            : { mode: 'unavailable', reason: 'no relay server id' };
    }
    if (!relay.authToken) {
        return hasAddress ? { mode: 'direct', reason: 'no auth token' }
            : { mode: 'unavailable', reason: 'no auth token' };
    }

    const expired = relay.expiresAt ? relay.expiresAt * 1000 <= now : false;
    if (expired || state.authBlocked) {
        if (hasAddress && state.lastWorked === 'direct') return { mode: 'direct', reason: 'direct worked before' };
        return { mode: 'blocked', reason: expired ? 'expired' : (state.reason || 'rejected') };
    }

    if (hasAddress && state.lastWorked !== 'relay' && state.relayFailures >= DIRECT_FALLBACK_AFTER) {
        state.relayFailures = 0;
        return { mode: 'direct', reason: 'relay keeps failing', fallback: true };
    }
    return { mode: 'relay', reason: 'relay server id and token present' };
}

/* 'auth' only for evidence that the token is the problem: expired locally, or the relay answered
   the upgrade with 401/403. Everything else (DNS, timeouts, 5xx, resets) is transient. */
function classifyFailure(error, relay, now = Date.now()) {
    if (error && error.relayAuth) return 'auth';
    if (relay && relay.expiresAt && relay.expiresAt * 1000 <= now) return 'auth';
    const message = error && error.message ? `${error.message}` : `${error}`;
    if (/Unexpected server response: (401|403)\b/.test(message)) return 'auth';
    return 'transient';
}

function buildRelayUrl(baseUrl, relayServerId, now = Date.now()) {
    return `${baseUrl}/socket/${encodeURIComponent(relayServerId)}?v=${now}`;
}

function relaySubprotocols(authToken) {
    return [RELAY_SUBPROTOCOL, b64url(authToken)];
}

module.exports = {
    RELAY_BASE_URL,
    RELAY_ORIGIN,
    RELAY_SUBPROTOCOL,
    RELAY_SERVER_IP,
    EXPIRY_WARNING_MS,
    DIRECT_FALLBACK_AFTER,
    b64url,
    normaliseAuthToken,
    parseAuthToken,
    tokenStatus,
    resolvePairing,
    stampRelayId,
    resolveAndStamp,
    resolveConnection,
    stateKey,
    getState,
    markWorked,
    markRelayFailure,
    markAuthBlocked,
    clearAuthBlocks,
    isAuthRejected,
    resetConnectionState,
    chooseTransport,
    classifyFailure,
    buildRelayUrl,
    relaySubprotocols
};
