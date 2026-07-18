/*
    Unit tests for StatisticsDatabase query additions (node --test).
    Uses a temp on-disk SQLite DB (better-sqlite3).
*/

const { test } = require('node:test');
const assert = require('node:assert');
const Os = require('os');
const Path = require('path');
const Fs = require('fs');

const StatisticsDatabase = require('../src/statistics/StatisticsDatabase.js');

const tmpPath = Path.join(Os.tmpdir(), `rpp-test-${process.pid}-${Date.now()}.db`);
const db = new StatisticsDatabase(tmpPath);

const now = Math.floor(Date.now() / 1000);
const insertDeath = db.db.prepare(`
    INSERT INTO player_deaths (guild_id, server_id, steam_id, player_name, x, y, death_time)
    VALUES (?, ?, ?, ?, 0, 0, ?)
`);
insertDeath.run('g1', 's1', '111', 'Alice', now - 100);
insertDeath.run('g1', 's1', '222', 'Bob', now - 200);
insertDeath.run('g1', 's2', '111', 'Alice', now - 300);
insertDeath.run('g2', 's1', '333', 'Carol', now - 100);

test('getDeathsFiltered: guild only', () => {
    const rows = db.getDeathsFiltered('g1', null, null, null, null);
    assert.strictEqual(rows.length, 3);
});

test('getDeathsFiltered: server filter', () => {
    const rows = db.getDeathsFiltered('g1', 's1', null, null, null);
    assert.strictEqual(rows.length, 2);
});

test('getDeathsFiltered: steamId filter', () => {
    const rows = db.getDeathsFiltered('g1', null, ['111'], null, null);
    assert.strictEqual(rows.length, 2);
    assert.ok(rows.every(r => r.steam_id === '111'));
});

test('getDeathsFiltered: time range', () => {
    const rows = db.getDeathsFiltered('g1', null, null, now - 250, now - 50);
    assert.strictEqual(rows.length, 2); /* -100 and -200, not -300 */
});

test('getDeathsFiltered: combined filters match JS-filter semantics', () => {
    const rows = db.getDeathsFiltered('g1', 's1', ['111', '222'], now - 150, null);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].player_name, 'Alice');
});

test('positions retention deletes old rows only', () => {
    const insertPos = db.db.prepare(`
        INSERT INTO player_positions (guild_id, server_id, steam_id, x, y, timestamp, is_alive)
        VALUES ('g1', 's1', '111', 1, 1, ?, 1)
    `);
    insertPos.run(now - 20 * 24 * 3600); /* 20 days old - beyond 14d default */
    insertPos.run(now - 2 * 24 * 3600);  /* 2 days old - kept */

    process.env.RPP_POSITIONS_RETENTION_DAYS = '14';
    db.performMaintenance();

    const remaining = db.db.prepare(`SELECT COUNT(*) c FROM player_positions`).get().c;
    assert.strictEqual(remaining, 1);
});

test('getActivityByHourOfWeek aggregates per dow/hour cell', () => {
    const insertConn = db.db.prepare(`
        INSERT INTO connection_stats (guild_id, server_id, timestamp, online_players, max_players)
        VALUES ('g9', 's1', ?, ?, 100)
    `);
    /* Two samples in the same UTC dow/hour cell (avg 4), one in another */
    const base = Date.UTC(2026, 0, 5, 18, 10) / 1000; /* Mon 2026-01-05 18:10 UTC */
    insertConn.run(base, 2);
    insertConn.run(base + 600, 6);
    insertConn.run(Date.UTC(2026, 0, 6, 9, 0) / 1000, 3); /* Tue 09:00 */

    const days = Math.ceil((Date.now() / 1000 - base) / 86400) + 1;
    const rows = db.getActivityByHourOfWeek('g9', 's1', days, 0);
    const mon18 = rows.find(r => r.dow === 1 && r.hour === 18);
    const tue9 = rows.find(r => r.dow === 2 && r.hour === 9);

    assert.ok(mon18, 'Mon 18h cell exists');
    assert.strictEqual(mon18.avgPlayers, 4);
    assert.strictEqual(mon18.maxPlayers, 6);
    assert.strictEqual(mon18.samples, 2);
    assert.strictEqual(tue9.avgPlayers, 3);
});

test('getActivityByHourOfWeek applies tz offset', () => {
    /* +2h offset moves the Mon 18:10 samples into the 20h cell */
    const days = 400;
    const rows = db.getActivityByHourOfWeek('g9', 's1', days, 2 * 3600);
    const mon20 = rows.find(r => r.dow === 1 && r.hour === 20);
    assert.ok(mon20, 'shifted cell exists');
    assert.strictEqual(mon20.avgPlayers, 4);
});

test('getForecastData returns forecast for today dow plus today actuals', () => {
    const nowH = new Date();
    const insertConn = db.db.prepare(`
        INSERT INTO connection_stats (guild_id, server_id, timestamp, online_players, max_players)
        VALUES ('g10', 's1', ?, ?, 100)
    `);
    insertConn.run(Math.floor(Date.now() / 1000) - 60, 5); /* just now */

    const tz = -nowH.getTimezoneOffset() * 60;
    const data = db.getForecastData('g10', 's1', 4, tz);
    assert.strictEqual(typeof data.dow, 'number');
    assert.ok(Array.isArray(data.forecast));
    assert.ok(Array.isArray(data.today));
    assert.ok(data.today.length >= 1, 'today has at least the just-inserted sample');
});

test.after(() => {
    db.db.close();
    try { Fs.unlinkSync(tmpPath); } catch (e) { /* WAL files may linger on Windows */ }
});
