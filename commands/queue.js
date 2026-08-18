const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { readQueue, writeQueue, buildQueueContainer, updateQueueMessage } = require('../utils/queueManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Manage the commission queue')
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Send the queue embed to this channel')
        )
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a user to the queue')
                .addUserOption(o => o.setName('user').setDescription('User to add').setRequired(true))
                .addStringOption(o => o.setName('service').setDescription('Service requested').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a user from the queue')
                .addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const data = readQueue();

        if (sub === 'setup') {
            if (interaction.user.id !== interaction.guild.ownerId) {
                return interaction.reply({ content: 'Only the server owner can use this command.', ephemeral: true });
            }

            const container = buildQueueContainer(data.entries);
            const msg = await interaction.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            data.messageId = msg.id;
            data.channelId = interaction.channel.id;
            writeQueue(data);

            return interaction.reply({ content: 'Queue message sent!', ephemeral: true });
        }

        const allowed = interaction.member.roles.cache.some(r => r.name === 'temp');
        if (!allowed) return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });

        if (sub === 'add') {
            const user = interaction.options.getUser('user');
            const service = interaction.options.getString('service');

            if (data.entries.find(e => e.userId === user.id)) {
                return interaction.reply({ content: 'That user is already in the queue.', ephemeral: true });
            }

            data.entries.push({ userId: user.id, service, status: '⏳ Pending' });
            writeQueue(data);
            await updateQueueMessage(interaction.client);

            return interaction.reply({ content: `Added <@${user.id}> to the queue.`, ephemeral: true });
        }

        if (sub === 'remove') {
            const user = interaction.options.getUser('user');
            data.entries = data.entries.filter(e => e.userId !== user.id);
            writeQueue(data);
            await updateQueueMessage(interaction.client);

            return interaction.reply({ content: `Removed <@${user.id}> from the queue.`, ephemeral: true });
        }
    }
};