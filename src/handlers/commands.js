'use strict';

const config = require('../config.json');

/**
 * Parse and validate Discord commands handler
 * @param {*} message 
 */
module.exports = (message) => {
    // Skip bot messages and messages that don't start with our prefix
    if (!message.content.startsWith(config.prefix) || message.author.bot)
        return;
    // Skip messages not in our allowed bot command channels unless it's a DM
    if (!config.botChannelIds.includes(message.channel.id) && message.channel.type !== 'dm')
        return;

    // Trim prefix and split remaining by space to get our args provided, and command (if any)
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    // Remove first arg to get our command name
    const commandName = args.shift().toLowerCase();
    // Try and get our command by name otherwise check if it's an alias
    const command = message.client.commands.get(commandName) 
        || message.client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    // Check if specified command/aliased command exists
    if (!command)
        return;

    // Check if owner only command
    if (command.ownerOnly && message.author.id !== config.ownerId)
        return message.reply({ embed: { description: ':x: **Access Not Granted** You do not have permission to execute this command.', color: 0xff1100 }});

    // Check if guild only command that does not support DMs
    if (command.guildOnly && message.channel.type === 'dm') {
        return message.reply({ embed: { description: 'Command does not support DM messages!', color: 0xff1100} });
    }

    // Check if command needs arguments set and if they aren't set
    if (command.args && !args.length) {
        let reply = `You didn't provide any arguments, ${message.author}!`;
        if (command.usage) {
            reply += `\nThe proper usage would be: \`${config.prefix}${command.name} ${command.usage}\``;
        }
        return message.channel.send({ embed: { description: reply, color: 0xff1100} });
    }
    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply({ embed: { description: 'There was an error trying to execute that command!', color: 0xff1100} });
    }
};
