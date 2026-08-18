const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Send feedback to the staff team')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Staff member to send feedback to')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('feedback')
                .setDescription('The feedback to send')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('rating')
                .setDescription('The rating for the feedback (1-5)')
                .setRequired(true)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const feedback = interaction.options.getString('feedback');
        const rating = interaction.options.getString('rating');

        const feedbackChannel = interaction.guild.channels.cache.find(c => c.name === 'staff-feedback');
        if (!feedbackChannel) {
            return interaction.reply({ content: 'Could not find the staff-feedback channel.', ephemeral: true });
        }

        const feedbackContainer = new ContainerBuilder()
            .addTextDisplayComponents(t => t.setContent(`## 💬 Staff Feedback`))
            .addSeparatorComponents(s => s)
            .addTextDisplayComponents(t =>
                t.setContent(
                    `**Staff Member:** <@${user.id}>\n` +
                    `**Rating:** ${rating}\n` +
                    `**Feedback:** ${feedback}\n` +
                    `**Submitted By:** <@${interaction.user.id}>`
                )
            )
            .addSeparatorComponents(s => s)
            .addTextDisplayComponents(t => t.setContent(`-# ${new Date().toLocaleString()}`));

        await feedbackChannel.send({ components: [feedbackContainer], flags: MessageFlags.IsComponentsV2 });
        return interaction.reply({ content: `Your feedback has been submitted!`, ephemeral: true });
    }
};