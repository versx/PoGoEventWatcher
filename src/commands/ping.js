'use strict';

module.exports = {
    name: 'ping',
    aliases: ['p'],
    description: 'Ping!',
    /* eslint-disable no-unused-vars */
    execute(message, args) {
    /* eslint-enable no-unused-vars */
        message.channel.send('Pong.');
    },
};