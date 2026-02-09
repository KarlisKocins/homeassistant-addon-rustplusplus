const Client = require('../../index');

module.exports = {
    key: 'research',
    execute: async (rustplus, client, command) => {
        const prefix = rustplus.generalSettings.prefix;
        const commandResearch = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxResearch')}`;
        const commandResearchEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxResearch')}`;

        if (command.toLowerCase().startsWith(`${commandResearch} `)) {
            command = command.slice(`${commandResearch} `.length).trim();
        }
        else {
            command = command.slice(`${commandResearchEn} `.length).trim();
        }
        const itemResearchName = command;

        const item = Client.client.items.getClosestItemIdByName(itemResearchName)
        if (item === null || itemResearchName === '') {
            const str = Client.client.intlGet(rustplus.guildId, 'noItemWithNameFound', {
                name: itemResearchName
            });
            return str;
        }

        const itemId = item;
        const itemName = Client.client.items.getName(itemId);

        const researchDetails = Client.client.rustlabs.getResearchDetailsById(itemId);
        if (researchDetails === null) {
            const str = Client.client.intlGet(rustplus.guildId, 'couldNotFindResearchDetails', {
                name: itemName
            });
            return str;
        }



        let str = `${itemName}: `;
        if (researchDetails[2].researchTable !== null) {
            const researchTable = `${Client.client.intlGet(rustplus.guildId, 'researchTable')}`;
            const scrap = `${researchDetails[2].researchTable}`;
            str += `${researchTable} (${scrap})`
        }
        if (researchDetails[2].workbench !== null) {
            const type = `${Client.client.items.getName(researchDetails[2].workbench.type)}`;
            const scrap = researchDetails[2].workbench.scrap;
            const totalScrap = researchDetails[2].workbench.totalScrap;
            str += `, ${type} (${scrap} (${totalScrap}))`;
        }
        str += '.';

        return str;
    }
};
