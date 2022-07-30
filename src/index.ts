'use strict';

import { readdirSync } from 'fs';
import { resolve } from 'path';
import {
    CategoryChannel,
    CategoryChannelResolvable,
    Client,
    Guild,
    GuildBasedChannel,
    GuildChannel,
    Intents,
    TextChannel,
} from 'discord.js';
import { render } from 'mustache';

const config = require('../src/config.json');
import { commands, handleCommand } from './handlers/commands';
import { sendDm } from './handlers/dm';
import { createActiveEventEmbed, createEmbedFromNewEvent } from './handlers/embeds';
import { PokemonEvents } from './models/events';
import { UrlWatcher } from  './services/url-watcher';
import { post, getWebhookData } from './services/utils';
import { ActiveEvent } from './types/events';

const client = new Client({
    intents: [
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.GUILD_WEBHOOKS,
    ],
    partials: [
        'CHANNEL',
        'GUILD_MEMBER',
        'MESSAGE',
        'USER',
    ],
});

const urlToWatch = 'https://raw.githubusercontent.com/ccev/pogoinfo/v2/active/events.json';
const intervalM = 1 * 60 * 1000; // 60 seconds
const NotAvailable = 'N/A';
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
        // Prevent multiple
        if (started) return;

        setInterval(async () => {
            started = true;
            await createChannels();
        }, intervalM);
        // Create channels as soon as Discord guild is available
        await createChannels();
    });
    client.on('messageCreate', handleCommand);
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

const createVoiceChannels = async (guildInfo: any, activeEvents: ActiveEvent[]): Promise<void> => {
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

    // Get event category channel from id
    const channelCategory = await guild.channels.fetch(guildInfo.eventsCategoryId);
    if (!channelCategory) {
        console.error(`Failed to get channel category by id ${guildInfo.eventsCategoryId} from guild ${guildInfo.id}`);
        return;
    }

    // Set role permissions for event channel category
    await setChannelPermissions(guild, channelCategory);

    // Loop all active events
    for (const event of activeEvents) {
        // Get channel name from event name and ends date
        const channelName = formatEventName(event);
        // Check if channel name matches event name, if not delete channel
        const channel = await createVoiceChannel(guild, channelName, channelCategory);
        if (channel == null) {
            // Failed to delete channel, continue on to the next
            continue;
        }
        // Attempt to delete any expired event channels
        await deleteExpiredEvents(channelCategory, activeEvents);
    }
};

const createVoiceChannel = async (guild: Guild,
                            channelName: string,
                        channelCategory: GuildChannel): Promise<GuildBasedChannel | undefined> => {
    // Attempt to find channel from ChannelManager cache
    let channel = guild.channels.cache.find((x: any) => x.name.toLowerCase() === channelName.toLowerCase());
    // Check if channel already exists
    if (channel) {
        return channel;
    }

    try {
        // Channel does not exist, create voice channel with permissions
        const permissions = getDefaultPermissions(guild.id, client.user!.id);
        channel = await guild.channels.create(channelName, {
            permissionOverwrites: permissions,
            parent: <CategoryChannelResolvable>channelCategory,
            type: 'GUILD_VOICE',
        });

        console.info('Event voice channel', channel?.name, 'created');
        return channel;
    } catch (e) {
        console.error('createVoiceChannel:', e);
    }
    return undefined;
};

const deleteChannel = async (guild: Guild, channelId: string): Promise<void> => {
    // Fetch channel by id from ChannelManager cache
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
        console.error(`Failed to find expired event channel ${channelId} to delete.`);
        return;
    }
    // Only delete voice channels
    if (channel.type !== 'GUILD_VOICE') {
        return;
    }
    try {
        // Delete expired event channel
        await channel.delete('Event has expired');
        console.log('Event voice channel', channel.name, 'deleted');
    } catch (e) {
        console.error(`Failed to delete channel ${channel.id}: ${e}`);
    }
};

const deleteExpiredEvents = async (eventCategoryChannel: GuildChannel, activeEvents: any): Promise<void> => {
    // Check if channels in category exists in active events, if so, keep it, otherwise delete it.
    const channelChildren = (<CategoryChannel>eventCategoryChannel).children;
    const activeEventNames = activeEvents.map((x: ActiveEvent) => formatEventName(x));
    for (const [channelId, childChannel] of channelChildren) {
        if (!childChannel) {
            continue;
        }
        // Check if channel does not exist in formatted active event names
        if (!activeEventNames.includes(childChannel?.name)) {
            // Delete channel if it's not an active event
            await deleteChannel(eventCategoryChannel.guild, channelId);
        }
    }
};

const formatEventName = (event: ActiveEvent): string => {
    // Format event ends date
    const eventEndDate = event.end ? new Date(event.end) : NotAvailable;
    // Get channel name from event name and ends date
    // Use mustache to template the channel's naming scheme 
    const channelName = render(config.channelNameFormat, {
        month: eventEndDate !== NotAvailable
            ? eventEndDate.getMonth() + 1
            : NotAvailable,
        day: eventEndDate !== NotAvailable
            ? eventEndDate.getDate()
            : '',
        name: event.name,
    });
    return channelName;
};

const setChannelPermissions = async (guild: Guild, channel: GuildChannel) => {
    const everyoneId = guild.id;
    const botId = client.user!.id;
    const permissions = getDefaultPermissions(everyoneId, botId);
    await channel.permissionOverwrites.set(permissions);
};

const getDefaultPermissions = (everyoneId: string, botId: string): any => {
    const permissions = [{
        id: everyoneId,
        allow: ['VIEW_CHANNEL'],
        deny: ['CONNECT'],
    }, {
        id: botId,
        allow: [
            'VIEW_CHANNEL',
            'CONNECT',
            'MANAGE_CHANNELS',
            'MANAGE_MESSAGES',
            'MANAGE_ROLES',
        ],
    }];
    return permissions;
};

UrlWatcher(urlToWatch, intervalM, async (): Promise<void> => {
    const activeEvents = await PokemonEvents.getAll(false, true);
    for (const event of activeEvents) {
        const payload = await createEmbedFromNewEvent(event);
        // Send webhook notifications
        if (config.webhooks && config.webhooks.length > 0) {
            for (const webhook of config.webhooks) {
                // Delete previous event messages if set
                if (config.deletePreviousEvents) {
                    // Get information returned about webhook
                    const webhookData = await getWebhookData(webhook);
                    if (!webhookData) {
                        // Failed to get webhook result data from response
                        console.error(`Failed to get webhook data from ${webhook}`);
                        continue;
                    }
                    // Check if webhook result response has 
                    if (!webhookData?.guild_id || !webhookData?.channel_id) {
                        // Missing required information from webhook data response
                        continue;
                    }
                    const guild = client.guilds.cache.get(webhookData.guild_id);
                    if (guild) {
                        const channel = guild.channels.cache.get(webhookData.channel_id);
                        try {
                            // Ensure we only try to delete messages from text channels
                            if (channel?.type == 'GUILD_TEXT') {
                                (channel as TextChannel).bulkDelete(100);
                            }
                        } catch (err) {
                            // Fails if messages to delete are older than 14 days
                            console.error('Error:', err);
                        }
                    }
                }
                await post(<string>webhook, payload);
            }
        }
        // Check that bot token and user ids list are set
        if (config.token && config.userIds.length) {
            // Create Discord embed that'll be sent to users
            const embed = await createActiveEventEmbed(event);
            // Send direct message to users
            for (const userId of config.userIds) {
                const member = client.users.cache.get(userId);
                if (!member || member == null) {
                    console.error(`Failed to get member by id ${userId}`);
                    continue;
                }
                // Send DM info about event to Discord user
                await sendDm(member, { embed });
                console.info(`New event direct message sent to ${member?.username} (${member?.id})`);
            }
        }
    }
});
