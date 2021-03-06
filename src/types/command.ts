'use strict';

import { Message } from 'discord.js';

export interface Command {
    name: string;
    aliases: string[];
    description: string;
    ownerOnly: boolean;
    guildOnly: boolean;
    args: string[];
    usage: string;

    execute(message: Message, args: string[]): Promise<void>;
}