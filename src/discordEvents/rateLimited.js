/*
    Copyright (C) 2022 Alexander Emanuelsson (alexemanuelol)

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

const Config = require('../../config');

/* Per-route limits reset within seconds, so a wait longer than this is worth reporting. */
const LONG_WAIT_MS = 30000;

module.exports = {
    name: 'rateLimited',
    async execute(client, info) {
        /* discord.js queues and retries rate-limited requests by itself. Short per-route waits are
           routine, e.g. the dozens of messages posted while setting up the settings channel for a new
           server hit the 5-messages-per-channel limit every few seconds, so only show them in debug.
           Global limits and long waits always point at a real problem. */
        if (!info.global && info.timeToReset < LONG_WAIT_MS && Config.general.logLevel !== 'debug') return;

        client.log(
            client.intlGet(null, 'ratelimited'),
            `Timeout: ${info.timeToReset}, ` +
            `Limit: ${info.limit}, ` +
            `Method: ${info.method}, ` +
            `Path: ${info.url}, ` +
            `Route: ${info.route}, ` +
            `Global: ${info.global}`);
    },
}