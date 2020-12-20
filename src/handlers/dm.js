'use strict';

module.exports = {
    /**
     * Send Discord direct message to list of users
     * @param {*} client 
     * @param {*} userIds 
     * @param {*} embed 
     */
    sendDirectMessages: async (client, userIds, embed) => {
        // Send direct message to users
        for (const userId of userIds) {
            const member = client.users.cache.get(userId);
            await this.sendDirectMessage(member, { embed: embed });
            console.info(`New event direct message sent to ${member.username} (${member.id})`);
        }
    },
    /**
     * Send Discord direct message to user
     * @param {*} userId 
     * @param {*} data 
     */
    sendDirectMessage: async (member, data) => {
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
    }
};