'use strict';

const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');
const client = new Discord.Client();
client.commands = new Discord.Collection();
const Mustache = require('mustache');

const config = require('./config.json');
const CommandHandler = require('./handlers/commands.js');
const DmHandler = require('./handlers/dm.js');
const EmbedHandler = require('./handlers/embeds.js');
const PokemonEvents = require('./models/events.js');
const UrlWatcher = require('./services/url-watcher.js');
const utils = require('./services/utils.js');

const urlToWatch = 'https://raw.githubusercontent.com/ccev/pogoinfo/info/events/active.json';
const intervalM = 5 * 60 * 1000;
const NotAvailable = 'N/A';

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
    });
    client.on('message', CommandHandler);
    client.login(config.token);
}

let started = false;
const startActiveEventsUpdater = async () => {
    // Prevent multiple
    if (started) return;
    setInterval(async () => {
        started = true;
        // Get all active events
        const activeEvents = await PokemonEvents.getActive(true);
        // Loop all specified guilds
        for (const guildInfo of config.guilds) {
            createVoiceChannels(guildInfo, activeEvents);
        }
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
    // TODO: Account for ezpired event channels
    // Update permissions for event category channel
    await channelCategory.updateOverwrite(everyoneRole, permissions);
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
        createVoiceChannel(guild, channelName, channelCategory, permissions);
    }
};

const createVoiceChannel = async (guild, channelName, channelCategory, permissions) => {
    const channelExists = guild.channels.cache.find(x => x.name.toLowerCase() === channelName.toLowerCase());
    // Check if channel exists already
    if (channelExists)
        return;

    // Create voice channel with permissions
    const newChannel = await guild.channels.create(channelName, {
        type: 'voice',
        parent: channelCategory,
        permissionOverwrites: permissions,
    });
    console.info('Event voice channel', newChannel.name, 'created');
};

UrlWatcher(urlToWatch, intervalM, async () => {
    const event = await PokemonEvents.buildEventObject();
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
        // Send direct message to users
        const embed = EmbedHandler.createActiveEventEmbed(event);
        await DmHandler.sendDirectMessages(client, config.userIds, embed);
    }
});