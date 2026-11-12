/*
    Rust+ auth tokens: storing them, reporting their health and warning their owner.

    The token lives in the guild's credentials file as credentials[steamId].rustplus_auth_token.
    Discord (/credentials) and the WebUI both go through saveAuthToken(), so validation, the
    reconnect and the Home Assistant update behave the same wherever the token comes from.
    The token is a login secret and is never logged or returned by any API.
*/

const InstanceUtils = require('./instanceUtils.js');
const RustRelay = require('./rustRelay.js');

const WATCH_INTERVAL_MS = 60 * 60 * 1000;

/* Order matters: a stored marker at or above a kind means that kind was already sent. */
const NOTICE_RANK = { expiring: 1, missing: 1, rejected: 2, expired: 3 };

function getClient() {
    return require('../../index.js');
}

function isAccountKey(key) {
    return key !== 'hoster';
}

function readCredentials(guildId) {
    try {
        return InstanceUtils.readCredentialsFile(guildId);
    }
    catch (e) {
        return null;
    }
}

/*
    Health of one account's token, combining what is stored with what the relay said.
        status    missing | invalid | expired | expiring | ok  (see RustRelay.tokenStatus)
        rejected  the relay refused the token since it was stored
        problem   the token needs replacing now (not just soon)
*/
function getAccountHealth(guildId, steamId, credentials = readCredentials(guildId)) {
    const credential = credentials ? credentials[steamId] : null;
    const token = credential ? credential.rustplus_auth_token : null;
    const { status, expiresAt } = RustRelay.tokenStatus(token);
    const rejected = RustRelay.isAuthRejected(guildId, steamId);

    return {
        guildId: `${guildId}`,
        steamId: `${steamId}`,
        status: status,
        expiresAt: expiresAt,
        rejected: rejected,
        problem: rejected || status === 'expired' || status === 'invalid' || status === 'missing'
    };
}

/* Accounts (without secrets) of a guild, for the WebUI. */
function listAccounts(guildId) {
    const credentials = readCredentials(guildId);
    if (!credentials) return [];

    return Object.keys(credentials).filter(isAccountKey).map((steamId) => {
        const health = getAccountHealth(guildId, steamId, credentials);
        return {
            steamId: steamId,
            hoster: credentials.hoster === steamId,
            status: health.status,
            expiresAt: health.expiresAt,
            rejected: health.rejected
        };
    });
}

function publishAccountHealth(guildId, steamId) {
    const Client = getClient();
    if (!Client.ha || typeof Client.ha.publishAccountHealth !== 'function') return;
    Client.ha.publishAccountHealth(steamId, getAccountHealth(guildId, steamId));
}

/*
    Store a new token for an account. Returns { ok: true, expiresAt } or { ok: false, error }.
    error is a short, user-facing sentence. Nothing is written unless the token is valid, belongs
    to the account and has not expired.
*/
function saveAuthToken(client, guildId, steamId, rawToken) {
    if (!/^\d{17}$/.test(`${steamId}`)) return { ok: false, error: 'steam_id must be a 17-digit SteamID64.' };

    const token = RustRelay.normaliseAuthToken(rawToken);
    const parsed = token ? RustRelay.parseAuthToken(token) : null;
    if (!parsed) return { ok: false, error: 'Invalid Rust+ auth token.' };

    if (parsed.steamId && parsed.steamId !== `${steamId}`) {
        return { ok: false, error: `Rust+ auth token belongs to ${parsed.steamId}, not ${steamId}.` };
    }
    if (parsed.expiresAt && parsed.expiresAt * 1000 <= Date.now()) {
        return { ok: false, error: 'Rust+ auth token has already expired. Log in again for a new one.' };
    }

    const credentials = readCredentials(guildId);
    if (!credentials || !isAccountKey(steamId) || !credentials[steamId]) {
        return { ok: false, error: `No FCM credentials are registered for ${steamId}.` };
    }

    credentials[steamId].rustplus_auth_token = token;
    delete credentials[steamId].rustplus_auth_token_notified;
    InstanceUtils.writeCredentialsFile(guildId, credentials);

    RustRelay.clearAuthBlocks(guildId, steamId);
    publishAccountHealth(guildId, steamId);
    reconnectAfterTokenChange(client, guildId, steamId);

    return { ok: true, expiresAt: parsed.expiresAt };
}

/* Bring back connections that were waiting for a token. A connection that is up is left alone. */
function reconnectAfterTokenChange(client, guildId, steamId) {
    const instance = client.getInstance(guildId);
    if (!instance) return;

    const rustplus = client.rustplusInstances[guildId];
    if (rustplus) {
        if (rustplus.playerId === steamId && !rustplus.websocket) {
            rustplus.connect();
        }
        if (rustplus.team && rustplus.team.leaderSteamId === steamId &&
            (!rustplus.leaderRustPlusInstance || !rustplus.leaderRustPlusInstance.websocket)) {
            rustplus.updateLeaderRustPlusLiteInstance();
        }
        return;
    }

    const active = instance.activeServer ? instance.serverList[instance.activeServer] : null;
    if (active && active.steamId === steamId && client.activeRustplusInstances[guildId]) {
        if (client.rustplusReconnectTimers[guildId]) {
            clearTimeout(client.rustplusReconnectTimers[guildId]);
            client.rustplusReconnectTimers[guildId] = null;
        }
        client.createRustplusInstance(guildId, active.serverIp, active.appPort, active.steamId, active.playerToken);
    }
}

const NOTICE_TEXT = {
    expiring: 'tokenExpiringSoon',
    expired: 'tokenExpired',
    rejected: 'tokenRejected',
    missing: 'tokenMissing'
};

/* Send the credential owner a direct message, once per token and severity. Returns true if a
   message was sent. A closed DM or an unknown user is logged and never throws. */
async function notifyOwner(client, guildId, steamId, kind) {
    const credentials = readCredentials(guildId);
    const credential = credentials ? credentials[steamId] : null;
    if (!credential) return false;

    const expiresAt = RustRelay.tokenStatus(credential.rustplus_auth_token).expiresAt || 0;
    const marker = `${kind}:${expiresAt}`;
    const previous = `${credential.rustplus_auth_token_notified || ''}`.split(':');
    if (previous[1] === `${expiresAt}` && (NOTICE_RANK[previous[0]] || 0) >= NOTICE_RANK[kind]) return false;

    credential.rustplus_auth_token_notified = marker;
    InstanceUtils.writeCredentialsFile(guildId, credentials);

    const text = client.intlGet(guildId, NOTICE_TEXT[kind], {
        steamId: steamId,
        date: expiresAt ? new Date(expiresAt * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '-'
    });
    client.log(client.intlGet(null, 'warningCap'), text, 'warn');

    try {
        const user = await client.users.fetch(credential.discord_user_id);
        await user.send(text);
        return true;
    }
    catch (e) {
        client.log(client.intlGet(null, 'warningCap'),
            `Could not send the Rust+ token notice to ${credential.discord_user_id}: ${e.message}`, 'warn');
        return false;
    }
}

/* A connection stopped because the relay needs a token that is missing, expired or rejected. */
async function onRelayBlocked(client, guildId, steamId, error) {
    publishAccountHealth(guildId, steamId);

    let kind = 'rejected';
    if (error.relayReason === 'expired') kind = 'expired';
    else if (error.relayReason === 'no auth token') kind = 'missing';
    await notifyOwner(client, guildId, steamId, kind);
}

/* One pass over every guild: refresh the Home Assistant sensors and warn owners whose token is
   about to expire or has expired. */
async function checkAllTokens(client) {
    for (const guildId of Object.keys(client.instances || {})) {
        const credentials = readCredentials(guildId);
        if (!credentials) continue;

        for (const steamId of Object.keys(credentials).filter(isAccountKey)) {
            const health = getAccountHealth(guildId, steamId, credentials);
            publishAccountHealth(guildId, steamId);

            if (health.status === 'expired') await notifyOwner(client, guildId, steamId, 'expired');
            else if (health.status === 'expiring') await notifyOwner(client, guildId, steamId, 'expiring');
        }
    }
}

function startTokenWatcher(client) {
    if (client.tokenWatcher) return;

    const run = () => checkAllTokens(client).catch((e) => {
        client.log(client.intlGet(null, 'errorCap'), `Rust+ token check failed: ${e.message}`, 'error');
    });
    client.tokenWatcher = setInterval(run, WATCH_INTERVAL_MS);
    client.tokenWatcher.unref();
    run();
}

module.exports = {
    getAccountHealth,
    listAccounts,
    publishAccountHealth,
    saveAuthToken,
    notifyOwner,
    onRelayBlocked,
    checkAllTokens,
    startTokenWatcher
};
