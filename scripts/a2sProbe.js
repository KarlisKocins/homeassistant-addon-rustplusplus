#!/usr/bin/env node
/*
    Copyright (C) 2023 Alexander Emanuelsson (alexemanuelol)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

    https://github.com/alexemanuelol/rustplusplus

*/

/**
 *  Check whether a Rust server answers A2S queries with a usable player list, before relying on it
 *  as a Battlemetrics replacement.
 *
 *  Usage: node scripts/a2sProbe.js <host> [port]
 */

const A2S = require('../src/util/a2s.js');

async function main() {
    const host = process.argv[2];
    const port = process.argv[3] ? parseInt(process.argv[3]) : A2S.DEFAULT_QUERY_PORT;

    if (!host) {
        console.error('Usage: node scripts/a2sProbe.js <host> [port]');
        console.error(`Port defaults to ${A2S.DEFAULT_QUERY_PORT}, the Rust game port, NOT the Rust+ app port.`);
        process.exit(2);
    }

    console.log(`Querying ${host}:${port} ...\n`);

    let info = null;
    try {
        info = await A2S.queryInfo(host, port);
        console.log('A2S_INFO   OK');
        console.log(`  name        ${info.name}`);
        console.log(`  map         ${info.map}`);
        console.log(`  players     ${info.players}/${info.maxPlayers}`);
    }
    catch (e) {
        console.log(`A2S_INFO   FAILED: ${e.message}`);
        console.log('\nThe server did not answer at all. Common causes:');
        console.log('  - Wrong port. This must be the game/query port (usually 28015), not the');
        console.log('    Rust+ companion port (usually 28082) that the addon stores in serverList.');
        console.log('  - The host firewalls its query port, or blocks queries from this machine.');
        process.exit(1);
    }

    let players = null;
    try {
        players = await A2S.queryPlayers(host, port);
        console.log('\nA2S_PLAYER OK');
        console.log(`  returned    ${players.length} named player(s)`);
    }
    catch (e) {
        console.log(`\nA2S_PLAYER FAILED: ${e.message}`);
        console.log('Server details work but the player list does not, so trackers cannot use this server.');
        process.exit(1);
    }

    const sample = players.slice()
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10);

    for (const player of sample) {
        const hours = Math.floor(player.duration / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((player.duration / 60) % 60).toString().padStart(2, '0');
        console.log(`    [${hours}:${minutes}] ${player.name}`);
    }

    console.log('');

    /* The player count from A2S_INFO and the player list often disagree, which decides usability. */
    if (players.length === 0 && info.players > 0) {
        console.log(`VERDICT: unusable. The server reports ${info.players} players online but returns no`);
        console.log('names, so it hides its player list. Trackers cannot work against this server.');
        process.exit(1);
    }

    if (info.players > 0 && players.length < info.players / 2) {
        console.log(`VERDICT: partial. ${info.players} players online but only ${players.length} named.`);
        console.log('Trackers will miss players. Treat results from this server as unreliable.');
        process.exit(1);
    }

    console.log(`VERDICT: usable. Set queryPort to ${port} on this server in the addon and`);
    console.log("set the playerSource general setting to 'a2s' (or leave it on 'auto').");
}

main().catch((e) => {
    console.error(`Unexpected failure: ${e.message}`);
    process.exit(1);
});
