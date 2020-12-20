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

if (config.token) {
    // Load commands in 'commands' folder
    const commandsFolder = path.resolve(__dirname, './commands');
    const commandFiles = fs.readdirSync(commandsFolder).filter(x => x.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        client.commands.set(command.name, command);
    }
    client.on('ready', async () => {
        console.log(`Logged in as ${client.user.tag}!`);
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
        // Get all events
        const allEvents = await PokemonEvents.getAll();
        // Now timestamp in seconds
        const now = new Date() / 1000;
        // Filter for only active evnets within todays date
        const activeEvents = allEvents.filter(x => new Date(x.start) / 1000 < now && now < new Date(x.end) / 1000);
        // Check if no active events available
        if (activeEvents.length === 0) {
            // No active events
            return;
        }
        // Sort active events by end date
        activeEvents.sort((a, b) => new Date(a.end) - new Date(b.end));
        // Loop app specified guilds
        for (const guildInfo of config.guilds) {
            // Check if event category id set for guild
            if (!guildInfo.eventsCategoryId) {
                continue;
            }
            // Get guild from id
            const guild = client.guilds.cache.get(guildInfo.id);
            if (!guild) {
                console.error(`Failed to get guild by id ${guildInfo.id}`);
                continue;
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
                continue;
            }
            // TODO: Account for ezpired event channels
            // Update permissions for event category channel
            await channelCategory.updateOverwrite(everyoneRole, permissions);
            // Loop all active events
            for (const event of activeEvents) {
                // Format event ends date
                const eventEndDate = event.end ? new Date(event.end) : 'N/A';
                const ends = eventEndDate !== 'N/A'
                    ? (eventEndDate.getMonth() + 1) + '-' + eventEndDate.getDate()
                    : eventEndDate;
                // Get channel name from event name and ends date
                const channelName = Mustache.render(config.channelNameFormat, {
                    month: eventEndDate.getMonth() + 1,
                    day: eventEndDate.getDate(),
                    name: event.name,
                });
                // Check if channel exists already
                const channelExists = guild.channels.cache.find(x => x.name.toLowerCase() === channelName.toLowerCase());
                // Channel does not exist
                if (!channelExists) {
                    // Create voice channel with permissions
                    const newChannel = await guild.channels.create(channelName, {
                        type: 'voice',
                        parent: channelCategory,
                        permissionOverwrites: permissions,
                    });
                    console.info('Event voice channel', newChannel.name, 'created');
                    continue;
                }
            }
        }
    }, intervalM);
};

UrlWatcher(urlToWatch, intervalM, async () => {
    const event = await PokemonEvents.buildEventObject();
    const payload = EmbedHandler.createEmbedFromNewEvent(event);
    // Send webhook notifications
    if (config.webhooks && config.webhooks.length > 0) {
        for (const webhook of config.webhooks) {
            await utils.post(webhook, payload);
        }
    }
    // If bot token set we're logged into Discord bot
    if (config.token) {
        // Send direct message to users
        const embed = EmbedHandler.createActiveEventEmbed(event);
        await DmHandler.sendDirectMessages(client, config.userIds, embed);
    }
});