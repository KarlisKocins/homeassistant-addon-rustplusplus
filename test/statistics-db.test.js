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

test.after(() => {
    db.db.close();
    try { Fs.unlinkSync(tmpPath); } catch (e) { /* WAL files may linger on Windows */ }
});
