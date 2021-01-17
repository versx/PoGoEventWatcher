'use strict';

module.exports = {
    name: 'ping',
    aliases: ['p'],
    description: 'Ping!',
    /* eslint-disable-next-line no-unused-vars */
    execute(message, args) {
        message.channel.send('Pong.');
    },
};