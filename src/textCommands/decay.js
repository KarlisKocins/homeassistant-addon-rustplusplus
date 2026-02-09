const Client = require('../../index');
const Timer = require('../util/timer');

module.exports = {
    key: 'decay',
    execute: async (rustplus, client, command) => {
        const prefix = rustplus.generalSettings.prefix;
        const commandDecay = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxDecay')}`;
        const commandDecayEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxDecay')}`;

        if (command.toLowerCase().startsWith(`${commandDecay} `)) {
            command = command.slice(`${commandDecay} `.length).trim();
        }
        else {
            command = command.slice(`${commandDecayEn} `.length).trim();
        }

        const words = command.split(' ');
        const lastWord = words[words.length - 1];
        const lastWordLength = lastWord.length;
        const restString = command.slice(0, -(lastWordLength)).trim();

        let decayItemName = null, decayItemHp = null;
        if (isNaN(lastWord)) {
            decayItemName = command;
        }
        else {
            decayItemName = restString;
            decayItemHp = parseInt(lastWord);
        }

        let itemId = null;
        let type = 'items';

        let foundName = null;
        if (!foundName) {
            foundName = Client.client.rustlabs.getClosestOtherNameByName(decayItemName);
            if (foundName) {
                if (Client.client.rustlabs.decayData['other'].hasOwnProperty(foundName)) {
                    type = 'other';
                }
                else {
                    foundName = null;
                }
            }
        }

        if (!foundName) {
            foundName = Client.client.rustlabs.getClosestBuildingBlockNameByName(decayItemName);
            if (foundName) {
                if (Client.client.rustlabs.decayData['buildingBlocks'].hasOwnProperty(foundName)) {
                    type = 'buildingBlocks';
                }
                else {
                    foundName = null;
                }
            }
        }

        if (!foundName) {
            foundName = Client.client.items.getClosestItemIdByName(decayItemName);
            if (foundName) {
                if (!Client.client.rustlabs.decayData['items'].hasOwnProperty(foundName)) {
                    foundName = null;
                }
            }
        }

        if (!foundName) {
            const str = Client.client.intlGet(rustplus.guildId, 'noItemWithNameFound', {
                name: decayItemName
            });
            return str;
        }
        itemId = foundName;

        let itemName = null;
        let decayDetails = null;
        if (type === 'items') {
            itemName = Client.client.items.getName(itemId);
            decayDetails = Client.client.rustlabs.getDecayDetailsById(itemId);
        }
        else {
            itemName = itemId;
            decayDetails = Client.client.rustlabs.getDecayDetailsByName(itemId);
        }

        if (decayDetails === null) {
            const str = Client.client.intlGet(rustplus.guildId, 'couldNotFindDecayDetails', {
                name: itemName
            });
            return str;
        }

        const details = decayDetails[3];

        const hp = decayItemHp === null ? details.hp : decayItemHp;
        if (hp > details.hp) {
            const str = client.intlGet(rustplus.guildId, 'hpExceedMax', {
                hp: hp,
                max: details.hp
            });
            return str;
        }

        const decayMultiplier = hp / details.hp;

        let decayString = `${itemName} (${hp}/${details.hp}) `;
        const decayStrings = [];
        if (details.decayString !== null) {
            let str = `${Client.client.intlGet(rustplus.guildId, 'decay')}: `;
            if (hp === details.hp) {
                decayStrings.push(`${str}${details.decayString}`);
            }
            else {
                const time = Timer.secondsToFullScale(Math.floor(details.decay * decayMultiplier));
                decayStrings.push(`${str}${time}`);
            }
        }

        if (details.decayOutsideString !== null) {
            let str = `${Client.client.intlGet(rustplus.guildId, 'outside')}: `;
            if (hp === details.hp) {
                decayStrings.push(`${str}${details.decayOutsideString}`);
            }
            else {
                const time = Timer.secondsToFullScale(Math.floor(details.decayOutside * decayMultiplier));
                decayStrings.push(`${str}${time}`);
            }
        }

        if (details.decayInsideString !== null) {
            let str = `${Client.client.intlGet(rustplus.guildId, 'inside')}: `;
            if (hp === details.hp) {
                decayStrings.push(`${str}${details.decayInsideString}`);
            }
            else {
                const time = Timer.secondsToFullScale(Math.floor(details.decayInside * decayMultiplier));
                decayStrings.push(`${str}${time}`);
            }
        }

        if (details.decayUnderwaterString !== null) {
            let str = `${Client.client.intlGet(rustplus.guildId, 'underwater')}: `;
            if (hp === details.hp) {
                decayStrings.push(`${str}${details.decayUnderwaterString}`);
            }
            else {
                const time = Timer.secondsToFullScale(Math.floor(details.decayUnderwater * decayMultiplier));
                decayStrings.push(`${str}${time}`);
            }
        }
        decayString += `${decayStrings.join(', ')}.`;

        return decayString;
    }
};
