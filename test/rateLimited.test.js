const test = require('node:test');
const assert = require('node:assert');

const Config = require('../config');
const rateLimited = require('../src/discordEvents/rateLimited.js');

const ORIGINAL_LEVEL = Config.general.logLevel;
test.after(() => { Config.general.logLevel = ORIGINAL_LEVEL; });

function run(info) {
    const logged = [];
    const client = { log: (title, text) => logged.push(text), intlGet: () => 'RATELIMITED' };
    return rateLimited.execute(client, {
        timeToReset: 4354, limit: 5, method: 'POST', url: 'https://discord.com/api/v10/channels/1/messages',
        route: '/channels/:id/messages', global: false, ...info
    }).then(() => logged);
}

test('short per-route rate limits are not logged at info level', async () => {
    Config.general.logLevel = 'info';
    assert.strictEqual((await run({})).length, 0);
});

test('short per-route rate limits are logged at debug level', async () => {
    Config.general.logLevel = 'debug';
    assert.strictEqual((await run({})).length, 1);
});

test('global rate limits are always logged', async () => {
    Config.general.logLevel = 'info';
    assert.strictEqual((await run({ global: true })).length, 1);
});

test('long waits are always logged', async () => {
    Config.general.logLevel = 'info';
    assert.strictEqual((await run({ timeToReset: 60000 })).length, 1);
});
