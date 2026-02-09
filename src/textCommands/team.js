const Client = require('../../index');

module.exports = {
    key: 'team',
    execute: async (rustplus) => {
        let string = '';
        for (const player of rustplus.team.players) {
            string += `${player.name}, `;
        }

        return string !== '' ? `${string.slice(0, -2)}.` : null;
    }
};
