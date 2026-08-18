const { SlashCommandBuilder, MessageFlags, ContainerBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for kicking the user')
                .setRequired(false)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ content: 'You do not have permission to kick members.', ephemeral: true });
        }

        if (!member) {
            return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
        }

        if (!member.kickable) {
            return interaction.reply({ content: 'I cannot kick that user. They may have a higher role than me.', ephemeral: true });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({ content: 'You cannot kick yourself.', ephemeral: true });
        }

        // DM the user before kicking
        try {
            const dmContainer = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## 👢 You have been kicked`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(
                        `**Server:** ${interaction.guild.name}\n` +
                        `**Reason:** ${reason}\n` +
                        `**Kicked By:** ${interaction.user.username}`
                    )
                )
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# ${new Date().toLocaleString()}`));

            await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
        } catch {}

        // Kick the user
        await member.kick(reason);

        // Log to #bot-logs
        const logChannel = interaction.guild.channels.cache.find(c => c.name === 'bot-logs');
        if (logChannel) {
            const logContainer = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## 👢 Member Kicked`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(
                        `**User:** <@${user.id}> (${user.username})\n` +
                        `**Reason:** ${reason}\n` +
                        `**Kicked By:** <@${interaction.user.id}>`
                    )
                )
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# ${new Date().toLocaleString()}`));

            await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
        }

        return interaction.reply({
            content: `Successfully kicked **${user.username}**. Reason: ${reason}`,
            ephemeral: true
        });
    }
};