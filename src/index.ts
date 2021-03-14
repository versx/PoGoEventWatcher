'use strict';

import { readdirSync } from 'fs';
import { resolve } from 'path';
import { Client, Collection, Guild, GuildChannel, OverwriteResolvable, TextChannel } from 'discord.js';
import { render } from 'mustache';

const config = require('../src/config.json');
import { commands, handleCommand } from './handlers/commands';
import { sendDm } from './handlers/dm';
import { createActiveEventEmbed, createEmbedFromNewEvent } from './handlers/embeds';
import { PokemonEvents } from './models/events';
import { UrlWatcher } from  './services/url-watcher';
import { post, getWebhookData, } from './services/utils';
import { Dictionary } from './types/dictionary';

const client = new Client();
//const urlToWatch = 'https://raw.githubusercontent.com/ccev/pogoinfo/info/events/active.json';
const urlToWatch = 'https://raw.githubusercontent.com/ccev/pogoinfo/v2/active/events.json';
const intervalM = 1 * 60 * 1000;
const NotAvailable = 'N/A';
const existingEventChannels: Dictionary = {};
let started = false;

// TODO: Show time when event expires that day
// TODO: Remove all 'any' types

// Discord initialization
if (config.token) {
    // Load commands in 'commands' folder
    const commandsFolder = resolve(__dirname, './commands');
    // Read all files in our commands folder that end with `.js` extension
    const commandFiles = readdirSync(commandsFolder).filter(x => x.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        commands.set(command.name, command);
    }
    client.on('ready', async () => {
        console.log(`Logged in as ${client.user?.tag}!`);
        // Once the bot is ready we can start updating the voice channels
        await startActiveEventsUpdater();
        // Create channels as soon as Discord guild is available
        await createChannels();
    });
    client.on('message', handleCommand);
    client.login(config.token);
}

const createChannels = async (): Promise<void> => {
    // Get all active events
    const activeEvents = await PokemonEvents.getAll(true, true);
    // Loop all specified guilds
    for (const guildInfo of config.guilds) {
        await createVoiceChannels(guildInfo, activeEvents);
    }
};

const startActiveEventsUpdater = async (): Promise<void> => {
    // Prevent multiple
    if (started) return;

    setInterval(async () => {
        started = true;
        await createChannels();
    }, intervalM);
};

const createVoiceChannels = async (guildInfo: any, activeEvents: any): Promise<void> => {
    // Check if event category id set for guild
    if (!guildInfo.eventsCategoryId) {
        return;
    }
    // Get guild from id
    const guild = client.guilds.cache.get(guildInfo.id);
    if (!guild) {
        console.error(`Failed to get guild by id ${guildInfo.id}`);
        return;
    }
    // Get guild @everyone role from guild id
    const everyoneRole = guild.roles.cache.find(x => x.id === guild.id);
    const permissions: OverwriteResolvable[] = [{
        id: everyoneRole?.id ?? guild.id,
        allow: ['VIEW_CHANNEL'],
    },{
        id: everyoneRole?.id ?? guild.id,
        deny: ['CONNECT'],
    }];
    // Get event category channel from id
    const channelCategory = guild.channels.cache.get(guildInfo.eventsCategoryId);
    if (!channelCategory) {
        console.error(`Failed to get channel category by id ${guildInfo.eventsCategoryId} from guild ${guildInfo.id}`);
        return;
    }
    if (everyoneRole != null) {
        // Update permissions for event category channel
        await channelCategory.updateOverwrite(everyoneRole, { CONNECT: false, VIEW_CHANNEL: true });
    }

    const now = new Date();
    // Loop all active events
    for (const event of activeEvents) {
        // Format event ends date
        const eventEndDate = event.end ? new Date(event.end) : NotAvailable;
        // Get channel name from event name and ends date
        const channelName = render(config.channelNameFormat, {
            month: eventEndDate !== NotAvailable ? eventEndDate.getMonth() + 1 : NotAvailable,
            day: eventEndDate !== NotAvailable ? eventEndDate.getDate() : '',
            name: event.name,
        });
        const channel = await createVoiceChannel(guild, channelName, channelCategory, permissions);
        if (channel == null) {
            continue;
        }
        existingEventChannels[channel.id] = event;

        // Check for expired event channels via `existingEventChannels`
        if (eventEndDate !== NotAvailable) {
            if (eventEndDate <= now) {
                // TODO: Delete channel
                await deleteChannel(guild, channel.id);
            }
        }
    }
};

const createVoiceChannel = async (guild: Guild,
                            channelName: string,
                        channelCategory: GuildChannel,
                            permissions: Collection<string, OverwriteResolvable> | OverwriteResolvable[] | undefined): Promise<GuildChannel | undefined> => {
    let channel = guild.channels.cache.find(x => x.name.toLowerCase() === channelName.toLowerCase());
    // Check if channel does not exist
    if (!channel) {
        // Create voice channel with permissions
        channel = await guild.channels.create(channelName, {
            type: 'voice',
            parent: channelCategory,
            permissionOverwrites: permissions,
        });
        console.info('Event voice channel', channel?.name, 'created');
    }
    return channel;
};

const deleteChannel = async (guild: Guild, channelId: string): Promise<void> => {
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
        console.error(`Failed to find expired event channel ${channelId} to delete.`);
        return;
    }
    await channel.delete();
};

UrlWatcher(urlToWatch, intervalM, async (): Promise<void> => {
    const activeEvents = await PokemonEvents.getAll(true, true);
    for (const event of activeEvents) {
        const payload = await createEmbedFromNewEvent(event);
        // Send webhook notifications
        if (config.webhooks && config.webhooks.length > 0) {
            for (const webhook of config.webhooks) {
                // Delete previous event messages if set
                if (config.deletePreviousEvents) {
                    const whData = await getWebhookData(webhook);
                    if (whData != null) {
                        const guild = client.guilds.cache.get(whData.guild_id);
                        if (guild) {
                            const channel = guild.channels.cache.get(whData.channel_id);
                            if (channel) {
                                try {
                                    (channel as TextChannel).bulkDelete(100);
                                } catch (err) {
                                    console.error('Error:', err);
                                }
                            }
                        }
                    }
                }
                await post(<string>webhook, payload);
            }
        }
        // If bot token set we're logged into Discord bot
        if (config.token) {
            const embed = await createActiveEventEmbed(event);
            // Send direct message to users
            for (const userId of config.userIds) {
                const member = client.users.cache.get(userId);
                if (member == null) {
                    console.error(`Failed to get member by id ${userId}`);
                    continue;
                }
                await sendDm(member, { embed: embed });
                console.info(`New event direct message sent to ${member?.username} (${member?.id})`);
            }
        }
    }
});