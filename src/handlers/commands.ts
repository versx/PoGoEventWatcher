'use strict';

import { Collection, Message } from 'discord.js';
import { Command } from '../types/command';

const config = require('../../src/config.json');

export const commands = new Collection<string, Command>();

/**
 * Parse and validate Discord commands handler
 * @param {*} message 
 */
export const handleCommand = async (message: Message<boolean>): Promise<void> => {
    // Skip bot messages and messages that don't start with our prefix
    if (!message.content.startsWith(config.prefix) || message.author.bot)
        return;

    // Skip messages not in our allowed bot command channels unless it's a DM
    if (!config.botChannelIds.includes(message.channel.id) && message.channel.type !== 'DM')
        return;

    // Trim prefix and split remaining by space to get our args provided, and command (if any)
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    // Remove first arg to get our command name
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) {
        // No command found
        return;
    }

    // Try and get our command by name otherwise check if it's an alias
    const command = commands.get(commandName) 
        ?? commands.find((cmd: Command) => cmd.aliases && cmd.aliases.includes(commandName));
    // Check if specified command/aliased command exists
    if (!command)
        return;

    // Check if owner only command
    if (command.ownerOnly && !config.adminIds.includes(message.author.id))
        message.reply({ embeds: [{ description: ':x: **Access Not Granted** You do not have permission to execute this command.', color: 0xff1100 }] });

    // Check if guild only command that does not support DMs
    if (command.guildOnly && message.channel.type === 'DM') {
        message.reply({ embeds: [{ description: 'Command does not support DM messages!', color: 0xff1100}] });
    }

    // Check if command needs arguments set and if they aren't set
    if (command.args && !args.length) {
        let reply = `You didn't provide any arguments, ${message.author}!`;
        if (command.usage) {
            reply += `\nThe proper usage would be: \`${config.prefix}${command.name} ${command.usage}\``;
        }
        message.channel.send({ embeds: [{ description: reply, color: 0xff1100}] });
    }

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply({ embeds: [{ description: 'There was an error trying to execute that command!', color: 0xff1100}] });
    }
}