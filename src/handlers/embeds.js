'use strict';

const config = require('../config.json');
const locale = require('../services/locale.js');

const pogoIconUrl = 'https://www.creativefreedom.co.uk/wp-content/uploads/2016/07/pokemon1.png';
const embedSettings = {
    username: 'Pokemon Go Event Watcher',
    title: '**New Event Found**',
};

module.exports = {
    /**
     * Create Discord webhook payload embed from event object
     * @param {*} event 
     */
    createEmbedFromNewEvent: (event) => {
        let content = config.mention ? `<${config.mention}>` : null;
        const payload = {
            username: embedSettings.username,
            avatar_url: pogoIconUrl,
            content: content,
            embeds: [
                module.exports.createActiveEventEmbed(event)
            ]
        };
        return payload;
    },
    /**
     * Create Discord embed from event object
     * @param {*} event 
     */
    createActiveEventEmbed: (event) => {
        let description = `**Name:** ${event.name}\n`;
        if (event.start) {
            description += `**Starts:** ${event.start}\n`;
        }
        description += `**Ends:** ${event.end}\n`;
        const embed = {
            title: embedSettings.title,
            //url: "",
            description: description,
            color: 0x0099ff,
            fields: [{
                name: 'Event Bonuses',
                value: `- ${event.bonuses}`,
                inline: false,
            },{
                name: 'Last Nest Migration',
                value: event.lastNestMigration,
                inline: true,
            },{
                name: 'Nesting Pokemon Species',
                value: event.nests.sort((a, b) => a - b).map(x => locale.getPokemonName(x)).join(', '),
                inline: false,
            },{
                name: 'Event Pokemon Spawns',
                value: event.spawns.sort((a, b) => a - b).map(x => locale.getPokemonName(x)).join(', '),
                inline: true,
            },{
                name: 'Event Hatchable Eggs',
                value: event.eggs.sort((a, b) => a - b).map(x => locale.getPokemonName(x)).join(', '),
                inline: true,
            },{
                name: 'Event Raids',
                value: event.raids.join('\n'),
                inline: false,
            }],
            /*
            thumbnail: {
                url: ""
            },
            image: {
                url: ""
            },
            */
            footer: {
                text: new Date().toLocaleString(),
                icon_url: pogoIconUrl,
            }
        };
        return embed;
    }
};