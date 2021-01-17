'use strict';

/**
 * Send Discord direct message to member
 * @param {*} member 
 * @param {*} data 
 */
module.exports = async (member, data) => {
    if (!member || !data) {
        console.warn('Member or data is null, cannot send direct message');
        return;
    }
    if (!member) {
        console.error('Failed to find member', member);
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
};