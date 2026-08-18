const {SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for warning the user')
                .setRequired(true)
        ),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ content: 'You do not have permission to warn members.', ephemeral: true });
        }

        if (!member) {
            return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({ content: 'You cannot warn yourself.', ephemeral: true });
        }

        
        try {
            const dmContainer = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## ⚠️ You have been warned`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(
                        `**Server:** ${interaction.guild.name}\n` +
                        `**Reason:** ${reason}\n` +
                        `**Warned By:** ${interaction.user.username}`
                    )
                )
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# ${new Date().toLocaleString()}`));

            await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
        } catch {}

        // Log to #bot-logs
        const logChannel = interaction.guild.channels.cache.find(c => c.name === 'bot-logs');
        if (logChannel) {
            const logContainer = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## ⚠️ Member Warned`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(
                        `**User:** <@${user.id}> (${user.username})\n` +
                        `**Reason:** ${reason}\n` +
                        `**Warned By:** <@${interaction.user.id}>`
                    )
                )
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# ${new Date().toLocaleString()}`));

            await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
        }

        return interaction.reply({
            content: `Successfully warned **${user.username}**. Reason: ${reason}`,
            ephemeral: true
        });
    }
};