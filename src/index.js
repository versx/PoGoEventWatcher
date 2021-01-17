'use strict';

const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');
const client = new Discord.Client();
client.commands = new Discord.Collection();
const Mustache = require('mustache');

const config = require('./config.json');
const CommandHandler = require('./handlers/commands.js');
const sendDirectMessage = require('./handlers/dm.js');
const EmbedHandler = require('./handlers/embeds.js');
const PokemonEvents = require('./models/events.js');
const UrlWatcher = require('./services/url-watcher.js');
const utils = require('./services/utils.js');

const urlToWatch = 'https://raw.githubusercontent.com/ccev/pogoinfo/info/events/active.json';
const intervalM = 1 * 10 * 1000;
const NotAvailable = 'N/A';
const existingEventChannels = {};
let started = false;

// TODO: Show time when event expires that day

// Discord initialization
if (config.token) {
    // Load commands in 'commands' folder
    const commandsFolder = path.resolve(__dirname, './commands');
    // Read all files in our commands folder that end with `.js` extension
    const commandFiles = fs.readdirSync(commandsFolder).filter(x => x.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        client.commands.set(command.name, command);
    }
    client.on('ready', async () => {
        console.log(`Logged in as ${client.user.tag}!`);
        // Once the bot is ready we can start updating the voice channels
        await startActiveEventsUpdater();
        // Create channels as soon as Discord guild is available
        await createChannels();
    });
    client.on('message', CommandHandler);
    client.login(config.token);
}

const startActiveEventsUpdater = async () => {
    const createChannels = async () => {
        // Get all active events
        const activeEvents = await PokemonEvents.getActiveEvents(true);
        // Loop all specified guilds
        for (const guildInfo of config.guilds) {
            await createVoiceChannels(guildInfo, activeEvents);
        }
    };
    // Prevent multiple
    if (started) return;

    setInterval(async () => {
        started = true;
        await createChannels();
    }, intervalM);
};

const createVoiceChannels = async (guildInfo, activeEvents) => {
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
    const permissions = [{
        id: everyoneRole.id,
        allow: ['VIEW_CHANNEL'],
        deny: ['CONNECT'],
    }];
    // Get event category channel from id
    const channelCategory = guild.channels.cache.get(guildInfo.eventsCategoryId);
    if (!channelCategory) {
        console.error(`Failed to get channel category by id ${guildInfo.eventsCategoryId} from guild ${guildInfo.id}`);
        return;
    }
    // Update permissions for event category channel
    await channelCategory.updateOverwrite(everyoneRole, permissions);

    const now = new Date();
    // Loop all active events
    for (const event of activeEvents) {
        // Format event ends date
        const eventEndDate = event.end ? new Date(event.end) : NotAvailable;
        // Get channel name from event name and ends date
        const channelName = Mustache.render(config.channelNameFormat, {
            month: eventEndDate !== NotAvailable ? eventEndDate.getMonth() + 1 : NotAvailable,
            day: eventEndDate !== NotAvailable ? eventEndDate.getDate() : '',
            name: event.name,
        });
        const channel = await createVoiceChannel(guild, channelName, channelCategory, permissions);
        existingEventChannels[channel.id] = event;

        // Check for expired event channels via `existingEventChannels`
        if (eventEndDate !== NotAvailable) {
            if (eventEndDate <= now) {
                // TODO: Delete channel
                await deleteChannel(guild, channel);
            }
        }
    }
};

const createVoiceChannel = async (guild, channelName, channelCategory, permissions) => {
    let channel = guild.channels.cache.find(x => x.name.toLowerCase() === channelName.toLowerCase());
    // Check if channel does not exist
    if (!channel) {
        // Create voice channel with permissions
        channel = await guild.channels.create(channelName, {
            type: 'voice',
            parent: channelCategory,
            permissionOverwrites: permissions,
        });
        console.info('Event voice channel', channel.name, 'created');
    }
    return channel;
};

const deleteChannel = async (guild, channelId) => {
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
        console.error(`Failed to find expired event channel ${channelId} to delete.`);
        return;
    }
    await channel.delete();
};

UrlWatcher(urlToWatch, intervalM, async () => {
    const event = await PokemonEvents.buildActiveEvent();
    const payload = EmbedHandler.createEmbedFromNewEvent(event);
    // Send webhook notifications
    if (config.webhooks && config.webhooks.length > 0) {
        for (const webhook of config.webhooks) {
            // Delete previous event messages if set
            if (config.deletePreviousEvents) {
                const whData = utils.getWebhookData(webhook);
                if (whData) {
                    const guild = client.guilds.cache.get(whData.guild_id);
                    if (guild) {
                        const channel = guild.channels.cache.get(whData.channel_id);
                        if (channel) {
                            await channel.bulkDelete(100);
                        }
                    }
                }
                await utils.post(webhook, payload);
            }
        }
    }
    // If bot token set we're logged into Discord bot
    if (config.token) {
        const embed = EmbedHandler.createActiveEventEmbed(event);
        // Send direct message to users
        for (const userId of config.userIds) {
            const member = client.users.cache.get(userId);
            await sendDirectMessage(member, { embed: embed });
            console.info(`New event direct message sent to ${member.username} (${member.id})`);
        }
    }
});