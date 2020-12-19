'use strict';

module.exports = {
    name: 'ping',
    aliases: ['p'],
	description: 'Ping!',
	execute(message, args) {
		message.channel.send('Pong.');
	},
};