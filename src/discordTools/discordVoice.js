/*
    Copyright (C) 2022 Alexander Emanuelsson (alexemanuelol)
    Copyright (C) 2023 FaiThiX

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
const { getVoiceConnection, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const Path = require('path');
const Actors = require('../staticFiles/actors.json');
const Client = require('../../index.js');

const ALARM_SIREN_FILE = Path.join(__dirname, '..', 'resources', 'sounds', 'alarm-siren.mp3');
const ALARM_SIREN_COOLDOWN_MS = 15000;
const lastAlarmSirenAt = {};

module.exports = {
    ALARM_SIREN_FILE: ALARM_SIREN_FILE,
    ALARM_SIREN_COOLDOWN_MS: ALARM_SIREN_COOLDOWN_MS,

    /* Plays the alarm siren in the voice channel the bot is in. Returns true if it started playing. Does nothing
       when the bot is not in a voice channel, or when a siren already played for this guild within the cooldown
       (several alarms triggering together should not restart the sound over and over). */
    playAlarmSiren: function (guildId, now = Date.now()) {
        const connection = getVoiceConnection(guildId);
        if (!connection) return false;

        if (now - (lastAlarmSirenAt[guildId] ?? 0) < ALARM_SIREN_COOLDOWN_MS) return false;
        lastAlarmSirenAt[guildId] = now;

        const player = createAudioPlayer();
        /* An AudioPlayer throws if an 'error' event has no listener. */
        player.on('error', (error) => {
            Client.client.log(Client.client.intlGet(null, 'errorCap'),
                `Alarm siren playback failed: ${error.message}`, 'error');
        });
        connection.subscribe(player);
        player.play(createAudioResource(ALARM_SIREN_FILE));
        return true;
    },

    sendDiscordVoiceMessage: async function (guildId, text) {
        const connection = getVoiceConnection(guildId);
        const voice = await this.getVoice(guildId);
        const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(text)}`;

        if (connection) {
            let stream = (await (await fetch(url)).blob()).stream()
            const resource = createAudioResource(stream);
            const player = createAudioPlayer();
            connection.subscribe(player);
            player.play(resource);
        }
    },

    getVoice: async function (guildId) {
        const instance = Client.client.getInstance(guildId);
        const gender = instance.generalSettings.voiceGender;
        const language = instance.generalSettings.language;

        if (Actors[language]?.[gender] === null || Actors[language]?.[gender] === undefined) {
            return Actors[language]?.[gender === 'male' ? 'female' : 'male'];
        }
        else {
            return Actors[language]?.[gender];
        }
    },
}