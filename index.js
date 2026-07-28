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

const Discord = require('discord.js');
const Fs = require('fs');
const Path = require('path');

const DiscordBot = require('./src/structures/DiscordBot');
const Config = require('./config');
const HomeAssistant = require('./src/structures/HomeAssistant');

/* Stable boot marker used by the startup smoke test */
console.log(`rustplusplus starting (node ${process.version})`);

createMissingDirectories();

const client = new DiscordBot({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.GuildVoiceStates],
    retryLimit: 2,
    restRequestTimeout: 60000,
    disableEveryone: false,
    rest: {
        version: '10'
    }
});

client.build();

function createMissingDirectories() {
    const directories = ['logs', 'instances', 'credentials', 'maps'];

    directories.forEach(dir => {
        const dirPath = Path.join(__dirname, dir);
        try {
            // Try to create directory, but ignore errors if it already exists
            // This handles both regular directories and symlinks
            Fs.mkdirSync(dirPath, { recursive: true });
        } catch (error) {
            // Ignore EEXIST errors (directory/symlink already exists)
            if (error.code !== 'EEXIST') {
                console.error(`Failed to create directory ${dirPath}:`, error);
            }
        }
    });
}

process.on('unhandledRejection', error => {
    client.log(client.intlGet(null, 'errorCap'), client.intlGet(null, 'unhandledRejection', {
        error: error
    }), 'error');
    console.log(error);
});

process.on('uncaughtException', error => {
    client.log(client.intlGet(null, 'errorCap'), `uncaughtException: ${error?.stack || error}`, 'error');
    console.error(error);
});

exports.client = client;
exports.ha = new HomeAssistant(client);

/* The Supervisor sends SIGTERM when the add-on is stopped or restarted. Announce 'offline' on the
   MQTT availability topic before exiting so Home Assistant marks the Rust entities unavailable
   immediately instead of waiting for the broker's keepalive timeout to trigger the Last Will. */
let shuttingDown = false;
for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, async () => {
        if (shuttingDown) return;
        shuttingDown = true;

        console.log(`Received ${signal}, shutting down.`);
        try {
            await exports.ha.shutdown();
        } catch (error) {
            console.error(`Error during MQTT shutdown: ${error?.message || error}`);
        }
        process.exit(0);
    });
}
