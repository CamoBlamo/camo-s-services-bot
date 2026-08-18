const { SlashCommandBuilder } = require('discord.js');
const { readQueue, writeQueue, updateQueueMessage } = require('../utils/queueManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Update the status of a commission')
        .addUserOption(o => o.setName('user').setDescription('User to update').setRequired(true))
        .addStringOption(o =>
            o.setName('status')
                .setDescription('New status')
                .setRequired(true)
                .addChoices(
                    { name: '⏳ Pending', value: '⏳ Pending' },
                    { name: '🔨 In Progress', value: '🔨 In Progress' },
                    { name: '👀 In Review', value: '👀 In Review' },
                    { name: '✅ Completed', value: '✅ Completed' },
                    { name: '❌ Cancelled', value: '❌ Cancelled' },
                    { name: '⚠️ Priority', value: '⚠️ Priority' }
                )
        ),

    async execute(interaction) {
        const allowed = interaction.member.roles.cache.some(r => r.name === 'temp');
        if (!allowed) return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });

        const user = interaction.options.getUser('user');
        const newStatus = interaction.options.getString('status');
        const data = readQueue();

        const entry = data.entries.find(e => e.userId === user.id);
        if (!entry) {
            return interaction.reply({ content: 'That user is not in the queue.', ephemeral: true });
        }

        entry.status = newStatus;
        writeQueue(data);
        await updateQueueMessage(interaction.client);

        return interaction.reply({ content: `Updated <@${user.id}>'s status to **${newStatus}**.`, ephemeral: true });
    }
};