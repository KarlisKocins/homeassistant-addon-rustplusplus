/*
    Rust+ auth tokens: storing them, reporting their health and warning their owner.

    The token lives in the guild's credentials file as credentials[steamId].rustplus_auth_token.
    Discord (/credentials) and the WebUI both go through saveAuthToken(), so validation, the
    reconnect and the Home Assistant update behave the same wherever the token comes from.
    The token is a login secret and is never logged or returned by any API.
*/

const Crypto = require('crypto');

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

/* The credential entry of an account, or null. steamId often comes straight from a request, so it
   must be a 17-digit id and an own property: credentials['__proto__'] would otherwise return
   Object.prototype and let a write modify it. */
function getAccount(credentials, steamId) {
    if (!credentials || !/^\d{17}$/.test(`${steamId}`)) return null;
    return Object.hasOwn(credentials, steamId) ? credentials[steamId] : null;
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
    const credential = getAccount(credentials, steamId);
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

/*
    Push keys let the companion userscript store a token without a WebUI login: the userscript runs
    on the Facepunch login page, outside any session. A key belongs to one account and can do one
    thing, store a token for that account (which still has to be a valid, unexpired token for that
    Steam id). Only a hash is stored; the key itself exists in the downloaded script. Creating a new
    key replaces the old one.
*/
function hashPushKey(key) {
    return Crypto.createHash('sha256').update(key).digest('hex');
}

function createPushKey(guildId, steamId) {
    const credentials = readCredentials(guildId);
    const account = getAccount(credentials, steamId);
    if (!account) return null;

    const key = `${guildId}.${steamId}.${Crypto.randomBytes(24).toString('hex')}`;
    account.rustplus_push_key = hashPushKey(key);
    InstanceUtils.writeCredentialsFile(guildId, credentials);
    return key;
}

/* The account a push key belongs to, or null if the key is malformed, unknown or replaced. */
function verifyPushKey(key) {
    if (typeof key !== 'string' || key.length > 256) return null;
    const match = key.match(/^(\d{1,32})\.(\d{17})\.[0-9a-f]{48}$/);
    if (!match) return null;

    const [, guildId, steamId] = match;
    const credentials = readCredentials(guildId);
    const account = getAccount(credentials, steamId);
    const stored = account ? account.rustplus_push_key : null;
    if (typeof stored !== 'string') return null;

    const expected = Buffer.from(stored, 'hex');
    const actual = Buffer.from(hashPushKey(key), 'hex');
    if (expected.length !== actual.length || !Crypto.timingSafeEqual(expected, actual)) return null;
    return { guildId, steamId };
}

/* Store a token on behalf of the userscript. Returns { ok, error, status } with an HTTP status. */
function pushToken(client, key, rawToken) {
    const owner = verifyPushKey(key);
    if (!owner) return { ok: false, status: 401, error: 'Unknown or replaced push key.' };

    const saved = saveAuthToken(client, owner.guildId, owner.steamId, rawToken);
    return saved.ok ? { ...saved, status: 200 } : { ...saved, status: 400 };
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
            rejected: health.rejected,
            autoPush: typeof getAccount(credentials, steamId).rustplus_push_key === 'string'
        };
    });
}

function publishAccountHealth(guildId, steamId) {
    const Client = getClient();
    if (!Client.ha || typeof Client.ha.publishAccountHealth !== 'function') return;
    Client.ha.publishAccountHealth(steamId, getAccountHealth(guildId, steamId));
}

/*
    Check a pasted token for an account without storing anything. Returns { ok: true, token,
    expiresAt } or { ok: false, error } with a short, user-facing sentence.
*/
function validateAuthToken(steamId, rawToken) {
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
    return { ok: true, token: token, expiresAt: parsed.expiresAt };
}

/*
    Store a new token for an account. Returns { ok: true, expiresAt } or { ok: false, error }.
    error is a short, user-facing sentence. Nothing is written unless the token is valid, belongs
    to the account and has not expired.
*/
function saveAuthToken(client, guildId, steamId, rawToken) {
    const validated = validateAuthToken(steamId, rawToken);
    if (!validated.ok) return validated;
    const token = validated.token;

    const credentials = readCredentials(guildId);
    const account = getAccount(credentials, steamId);
    if (!account) {
        return { ok: false, error: `No FCM credentials are registered for ${steamId}.` };
    }

    account.rustplus_auth_token = token;
    delete account.rustplus_auth_token_notified;
    InstanceUtils.writeCredentialsFile(guildId, credentials);

    RustRelay.clearAuthBlocks(guildId, steamId);
    publishAccountHealth(guildId, steamId);
    reconnectAfterTokenChange(client, guildId, steamId);

    return { ok: true, expiresAt: validated.expiresAt };
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

/* Tell the credential owner, once per token and severity: by direct message, or by mentioning them
   in the guild's activity channel when their DMs are closed. The "already told" marker is only
   written after a message went out, so a failed delivery is tried again on the next check.
   Returns true if the owner was told. Never throws. */
async function notifyOwner(client, guildId, steamId, kind) {
    const credentials = readCredentials(guildId);
    const credential = getAccount(credentials, steamId);
    if (!credential) return false;

    const expiresAt = RustRelay.tokenStatus(credential.rustplus_auth_token).expiresAt || 0;
    const marker = `${kind}:${expiresAt}`;
    const previous = `${credential.rustplus_auth_token_notified || ''}`.split(':');
    if (previous[1] === `${expiresAt}` && (NOTICE_RANK[previous[0]] || 0) >= NOTICE_RANK[kind]) return false;

    const text = client.intlGet(guildId, NOTICE_TEXT[kind], {
        steamId: steamId,
        url: RustRelay.LOGIN_URL,
        date: expiresAt ? new Date(expiresAt * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '-'
    });
    client.log(client.intlGet(null, 'warningCap'), text, 'warn');

    let delivered = false;
    try {
        const user = await client.users.fetch(credential.discord_user_id);
        await user.send(text);
        delivered = true;
    }
    catch (e) {
        client.log(client.intlGet(null, 'warningCap'),
            `Could not DM the Rust+ token notice to ${credential.discord_user_id}: ${e.message}`, 'warn');
    }

    if (!delivered) {
        try {
            const instance = client.getInstance(guildId);
            const DiscordMessages = require('../discordTools/discordMessages.js');
            await DiscordMessages.sendMessage(guildId,
                { content: `<@${credential.discord_user_id}> ${text}` }, null, instance.channelId.activity);
            delivered = true;
        }
        catch (e) {
            client.log(client.intlGet(null, 'warningCap'),
                `Could not post the Rust+ token notice in the activity channel: ${e.message}`, 'warn');
        }
    }

    if (delivered) {
        credential.rustplus_auth_token_notified = marker;
        InstanceUtils.writeCredentialsFile(guildId, credentials);
    }
    return delivered;
}

/* A connection stopped because the relay needs a token that is missing, expired or rejected. */
async function onRelayBlocked(client, guildId, steamId, error) {
    publishAccountHealth(guildId, steamId);

    let kind = 'rejected';
    if (error.relayReason === 'expired') kind = 'expired';
    else if (error.relayReason === 'no auth token') kind = 'missing';
    await notifyOwner(client, guildId, steamId, kind);
}

/* Whether this account has paired a server, i.e. there is something the missing token blocks. */
function hasPairedServer(instance, steamId) {
    if (!instance) return false;
    const owns = (entry) => entry && `${entry.steamId}` === `${steamId}`;
    return Object.values(instance.serverList || {}).some(owns) ||
        Object.values(instance.serverListLite || {}).some(lites => Object.values(lites || {}).some(owns));
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
            else if (health.status === 'missing' && hasPairedServer(client.getInstance(guildId), steamId)) {
                await notifyOwner(client, guildId, steamId, 'missing');
            }
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
    validateAuthToken,
    getAccountHealth,
    listAccounts,
    publishAccountHealth,
    saveAuthToken,
    createPushKey,
    verifyPushKey,
    pushToken,
    notifyOwner,
    onRelayBlocked,
    checkAllTokens,
    startTokenWatcher
};
