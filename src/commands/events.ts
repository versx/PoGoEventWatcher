'use strict';

import { Channel, Client, TextChannel, Message, MessageEmbed, } from 'discord.js';

import { createActiveEventEmbed } from '../handlers/embeds';
import { PokemonEvents } from '../models/events';

const DiscordColors = {
    Default: 0,
    Aqua: 1752220,
    Green: 3066993,
    Blue: 3447003,
    Purple: 10181046,
    Gold: 15844367,
    Orange: 15105570,
    Red: 15158332,
    Grey: 9807270,
    DarkerGrey: 8359053,
    Navy: 3426654,
    DarkAqua: 1146986,
    DarkGreen: 2067276,
    DarkBlue: 2123412,
    DarkPurple: 7419530,
    DarkGold: 12745742,
    DarkOrange: 11027200,
    DarkRed: 10038562,
    DarkGrey: 9936031,
    LightGrey: 12370112,
    DarkNavy: 2899536,
    LuminousVividPink: 16580705,
    DarkVividPink: 12320855
};

export = {
    name: 'events',
    aliases: ['e'],
    ownerOnly: true,
    usage: '<#9832798478924> [active]\n\t\t<#9832798478924>',
    args: true,
    description: 'Post all Pokemon events or provide `active` as an argument for only active events to a specific channel.',
    async execute(message: Message, args: string[]): Promise<void> {
        let channelId: string = '';
        let activeOnly = false;
        switch (args.length) {
            case 1:
                // channel id
                channelId = args[0];
                break;
            case 2:
                // channel id and active
                channelId = args[0];
                activeOnly = args[1].toLowerCase() === 'active';
                break;
        }
        const channel = getChannelFromMention(message.client, channelId);
        if (!channel) {
            message.reply({ embed: { description: `Failed to find channel with id ${channelId}`, color: 0xff1100 }});
            return;
        }
        await postEvents(message, channel, activeOnly);
    },
};

const getChannelFromMention = (client: Client, mention: string): TextChannel | undefined => {
    // The id is the first and only match found by the RegEx.
    const matches = mention.match(/^<#?(\d+)>$/);

    // If supplied variable was not a mention, matches will be null instead of an array.
    if (!matches) return undefined;

    // However the first element in the matches array will be the entire mention, not just the ID,
    // so use index 1.
    const id = matches[1];
    return client.channels.cache.get(id) as TextChannel;
};

const postEvents = async (message: Message, channel: TextChannel | null = null, activeOnly = false): Promise<void> => {
    let allEvents = await PokemonEvents.getAll();
    allEvents.sort((a: any, b: any) => new Date(a.end).getTime() - new Date(b.end).getTime());

    const now = new Date().getTime() / 1000;
    if (activeOnly)
    {
        allEvents = allEvents.filter((x: any) => new Date(x.start).getTime() / 1000 < now && now < new Date(x.end).getTime() / 1000);
    }
    for (let event of allEvents) {
        const embed = await createActiveEventEmbed(event);
        if (embed === null) {
            continue;
        }
        if (embed.fields.length > 0) {
            if (channel) {
                // Send to specific channel
                channel.send({ embed: embed });
            } else {
                // Reply to current channel
                message.channel.send({ embed: embed });
            }
        }
    }
};