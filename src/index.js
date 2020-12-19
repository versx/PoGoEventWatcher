'use strict';

const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');
const client = new Discord.Client();
client.commands = new Discord.Collection();

const config = require('./config.json');
const CommandHandler = require('./handlers/commands.js');
const DmHandler = require('./handlers/dm.js');
const EmbedHandler = require('./handlers/embeds.js');
const PokemonEvents = require('./models/events.js');
const UrlWatcher = require('./services/url-watcher.js');
const utils = require('./services/utils.js');

const urlToWatch = 'https://raw.githubusercontent.com/ccev/pogoinfo/info/events/active.json';
const intervalM = 15 * 60 * 1000;

if (config.token) {
    // Load commands in 'commands' folder
    const commandsFolder = path.resolve(__dirname, './commands');
    const commandFiles = fs.readdirSync(commandsFolder).filter(x => x.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        client.commands.set(command.name, command);
    }
    client.on('ready', () => console.log(`Logged in as ${client.user.tag}!`));
    client.on('message', CommandHandler);
    client.login(config.token);
}

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