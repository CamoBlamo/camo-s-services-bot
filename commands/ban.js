const { SlashCommandBuilder, MessageFlags, ContainerBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the ban')
                .setRequired(false)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ content: 'You do not have permission to ban members.', ephemeral: true });
        }

        if (!member) {
            return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
        }

        if (!member.bannable) {
            return interaction.reply({ content: 'I cannot ban that user. They may have a higher role than me.', ephemeral: true });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({ content: 'You cannot ban yourself.', ephemeral: true });
        }

        // DM before banning
        try {
            const dmContainer = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## 🔨 You have been banned`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(
                        `**Server:** ${interaction.guild.name}\n` +
                        `**Reason:** ${reason}\n` +
                        `**Banned By:** ${interaction.user.username}`
                    )
                )
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# ${new Date().toLocaleString()}`));

            await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
        } catch {}

        // Ban the user
        await member.ban({ reason });

        // Log to #bot-logs
        const logChannel = interaction.guild.channels.cache.find(c => c.name === 'bot-logs');
        if (logChannel) {
            const logContainer = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## 🔨 Member Banned`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(
                        `**User:** <@${user.id}> (${user.username})\n` +
                        `**Reason:** ${reason}\n` +
                        `**Banned By:** <@${interaction.user.id}>`
                    )
                )
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# ${new Date().toLocaleString()}`));

            await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
        }

        // Reply in channel
        const banContainer = new ContainerBuilder()
            .addTextDisplayComponents(t => t.setContent(`## 🔨 User Banned`))
            .addSeparatorComponents(s => s)
            .addTextDisplayComponents(t =>
                t.setContent(
                    `**User:** <@${user.id}>\n` +
                    `**Reason:** ${reason}\n` +
                    `**Banned By:** <@${interaction.user.id}>`
                )
            )
            .addSeparatorComponents(s => s)
            .addTextDisplayComponents(t => t.setContent(`-# ${new Date().toLocaleString()}`));

        return interaction.reply({ components: [banContainer], flags: MessageFlags.IsComponentsV2 });
    }
};