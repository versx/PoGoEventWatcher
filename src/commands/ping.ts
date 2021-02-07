'use strict';

import { Channel, Message } from 'discord.js';

export = {
    name: 'ping',
    aliases: ['p'],
    description: 'Ping!',
    /* eslint-disable-next-line no-unused-vars */
    execute(message: Message, args: string[]) {
        message.channel.send('Pong.');
    },
}