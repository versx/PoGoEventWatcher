'use strict';

const config = require('../config.json');

module.exports = {
    name: 'help',
    description: 'List all of my commands or info about a specific command.',
    aliases: ['commands', 'h'],
    usage: '[command name]',
    //cooldown: 5,
    execute(message, args) {
        const data = [];
        const { commands } = message.client;

        if (!args.length) {
            data.push('List of all available commands:');
            data.push(commands.map(command => command.name).join(', '));
            data.push(`\nType \`${config.prefix}help [command name]\` to get info on a specific command.`);
            
            return message.author.send({ embed: { title: 'Help', description: data.join('\n'), color: 0x191919 } })
                .then(() => {
                    if (message.channel.type === 'dm') return;
                    message.reply(`Help message sent to ${message.author.tag} via DM of all available commands.`);
                })
                .catch(error => {
                    console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
                    message.reply('It seems like I can\'t DM you! Do you have DMs disabled?');
                });
        }

        const name = args[0].toLowerCase();
        const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));
        if (!command) {
            return message.reply(`${name} is not a valid command!`);
        }
        
        data.push(`**Name:** ${command.name}`);
        
        if (command.aliases) data.push(`**Aliases:** ${command.aliases.join(', ')}`);
        if (command.description) data.push(`**Description:** ${command.description}`);
        if (command.usage) data.push('**Usage:**\n```' + `${config.prefix}${command.name} ${command.usage}` + '```');
        
        //data.push(`**Cooldown:** ${command.cooldown || 3} second(s)`);
        message.channel.send({ embed: { title: 'Help', description: data.join('\n'), color: 0x191919 } });
    },
};