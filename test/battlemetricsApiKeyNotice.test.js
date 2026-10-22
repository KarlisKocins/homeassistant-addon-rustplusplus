const test = require('node:test');
const assert = require('node:assert');
const Path = require('path');
const Module = require('module');

const NOTICE = 'battlemetricsApiKeyRequired';

/* index.js boots the Discord bot on require, so stub it before the handlers pull it in. */
const indexPath = require.resolve(Path.join(__dirname, '..', 'index.js'));
if (!require.cache[indexPath]) {
    const stub = new Module(indexPath, null);
    stub.filename = indexPath;
    stub.loaded = true;
    stub.exports = { client: { log: () => { }, intlGet: (guildId, id) => id } };
    require.cache[indexPath] = stub;
}

const buttonHandler = require('../src/handlers/buttonHandler.js');
const playerCommand = require('../src/textCommands/player.js');

const ORIGINAL_KEY = process.env.RPP_BATTLEMETRICS_API_KEY;

function setKey(value) {
    if (value === null) delete process.env.RPP_BATTLEMETRICS_API_KEY;
    else process.env.RPP_BATTLEMETRICS_API_KEY = value;
}

test.after(() => setKey(ORIGINAL_KEY === undefined ? null : ORIGINAL_KEY));
test.beforeEach(() => setKey(null));

function createClient() {
    const replies = [];
    const instance = {
        blacklist: { discordIds: [] },
        trackers: {},
        serverList: {},
        generalSettings: {}
    };
    return {
        replies: replies,
        rustplusInstances: {},
        getInstance: () => instance,
        setInstance: () => { },
        logInteraction: () => { },
        isAdministrator: () => true,
        log: () => { },
        intlGet: (guildId, id) => id,
        interactionReply: async (interaction, content) => { replies.push(content); },
        interactionUpdate: async () => { }
    };
}

function createInteraction(customId) {
    return {
        customId: customId,
        guildId: 'guild',
        user: { id: 'user', username: 'user' },
        member: { permissions: { has: () => false } },
        deferUpdate: () => { },
        message: { delete: async () => { } }
    };
}

function noticeText(reply) {
    return reply?.embeds?.[0]?.data?.description ?? '';
}

for (const customId of [
    'CreateTracker{"serverId":"s"}',
    'TrackerEdit{"trackerId":1}',
    'TrackerAddPlayer{"trackerId":1}',
    'BattlemetricsGlobalLogin',
    'DisplayInformationBattlemetricsAllOnlinePlayers'
]) {
    test(`${customId} answers with the API key notice when no key is set`, async () => {
        const client = createClient();
        await buttonHandler(client, createInteraction(customId));

        assert.strictEqual(client.replies.length, 1);
        assert.ok(noticeText(client.replies[0]).includes(NOTICE));
        assert.strictEqual(client.replies[0].ephemeral, true);
    });
}

test('TrackerDelete is not blocked, so old trackers can still be removed', async () => {
    const client = createClient();
    /* With no such tracker the handler just deletes the message; no notice is sent. */
    await buttonHandler(client, createInteraction('TrackerDelete{"trackerId":1}'));
    assert.strictEqual(client.replies.length, 0);
});

test('tracker buttons are not intercepted when a key is set', async () => {
    setKey('token-abc');
    const client = createClient();
    /* The server does not exist, so CreateTracker just deletes the message. */
    await buttonHandler(client, createInteraction('CreateTracker{"serverId":"missing"}'));
    assert.strictEqual(client.replies.length, 0);
});

test('in-game player command explains that an API key is needed', async () => {
    const reply = await playerCommand.execute({ guildId: 'guild' }, null, '!player test');
    assert.strictEqual(reply, NOTICE);
});
