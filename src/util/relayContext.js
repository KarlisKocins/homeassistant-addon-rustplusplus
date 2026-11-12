/*
    Bridges the bot's stored data to the relay transport (structures/RelayRustPlus.js).
*/

const Client = require('../../index.js');
const InstanceUtils = require('./instanceUtils.js');

/* The instance and credentials of a guild, or null if the guild has no instance. A missing or
   unreadable credentials file gives credentials: null (the connection then goes direct). */
function loadRelayContext(guildId) {
    const instance = Client.client.getInstance(guildId);
    if (!instance) return null;

    let credentials = null;
    try {
        credentials = InstanceUtils.readCredentialsFile(guildId);
    }
    catch (e) {
        credentials = null;
    }
    return { guildId: guildId, instance: instance, credentials: credentials };
}

module.exports = { loadRelayContext };
