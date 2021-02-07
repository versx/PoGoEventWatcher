'use strict';

const config = require('../../src/config.json');
import { getPokemonName } from '../services/locale';
import { ActiveEvent, EventSpawn } from '../types/events';

const pogoIconUrl = 'https://www.creativefreedom.co.uk/wp-content/uploads/2016/07/pokemon1.png';
const embedSettings = {
    username: 'Pokemon Go Event Watcher',
    title: '**New Event Found**',
};

/**
 * Create Discord webhook payload embed from event object
 * @param {*} event 
 */
export const createEmbedFromNewEvent = (event: ActiveEvent) => {
    let content = config.mention ? `<${config.mention}>` : null;
    const payload = {
        username: embedSettings.username,
        avatar_url: pogoIconUrl,
        content: content,
        embeds: [
            createActiveEventEmbed(event)
        ]
    };
    return payload;
}

/**
 * Create Discord embed from event object
 * @param {*} event 
 */
export const createActiveEventEmbed = (event: ActiveEvent) => {
    // TODO: Get nests
    // TODO: Get raids
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
            value: `- ${(event.bonuses || []).join('\n- ')}`,
            inline: false,
        },{
            name: 'Last Nest Migration',
            value: 'N/A',// TODO: event.lastNestMigration,
            inline: true,
        },/*{
            name: 'Nesting Pokemon Species',
            value: event.nests.sort((a: number, b: number) => a - b).map((x: number) => getPokemonName(x)).join(', '),
            inline: false,
        },*/{
            name: 'Event Pokemon Spawns',
            value: event.spawns.map((x: EventSpawn) => x.id)
                               .sort((a: number, b: number) => a - b)
                               .map((x: number) => getPokemonName(x))
                               .join(', '),
            inline: true,
        },{
            name: 'Event Hatchable Eggs',
            value: event.eggs.map(x => x.id)
                             .sort((a: number, b: number) => a - b)
                             .map((x: number) => getPokemonName(x))
                             .join(', '),
            inline: true,
        }/*,{
            name: 'Event Raids',
            value: event.raids.join('\n'),
            inline: false,
        }*/],
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