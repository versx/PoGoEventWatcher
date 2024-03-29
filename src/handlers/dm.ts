'use strict';

import { User } from 'discord.js';

/**
 * Send Discord direct message to member
 * @param {*} member 
 * @param {*} data 
 */
export const sendDm = async (member: User, data: any): Promise<void> => {
    if (!member) {
        console.error('Failed to find Discord member', member);
        return;
    }
    if (!data) {
        console.warn('DM data is null, cannot send direct message');
        return;
    }
    const dm = await member.createDM();
    if (!dm) {
        console.error('Failed to create DM with user', member.username);
        return;
    }
    try {
        await dm.send(data);
    } catch (err) {
        console.error('Failed to send message to user', member, '\nError:', err);
    }
}