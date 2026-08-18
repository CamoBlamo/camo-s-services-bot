const { SlashCommandBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('review')
        .setDescription('Submit a review for our services')
        .addStringOption(option =>
            option.setName('star-rating')
                .setDescription('Your star rating')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('review-text')
                .setDescription('Your review text')
                .setRequired(true)
        ),

    async execute(interaction) {
        const starRating = interaction.options.getString('star-rating');
        const reviewText = interaction.options.getString('review-text');

        const reviewContainer = new ContainerBuilder()
            .addTextDisplayComponents((t) =>
                t.setContent(`## Review — ${interaction.user.username}`)
            )
            .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((t) =>
                t.setContent(`**Star Rating:** ${starRating}`)
            )
            .addTextDisplayComponents((t) =>
                t.setContent(`**Review:** ${reviewText}`)
            )
            .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((t) =>
                t.setContent(`-# Submitted by <@${interaction.user.id}> • ${new Date().toLocaleString()}`)
            );

        const reviewChannel = interaction.guild.channels.cache.get('1517691547305644107');
        if (!reviewChannel) return interaction.reply({ content: 'Review channel not found.', ephemeral: true });

        await reviewChannel.send({
            components: [reviewContainer],
            flags: MessageFlags.IsComponentsV2
        });

        await interaction.reply({ content: 'Your review has been submitted!', ephemeral: true });
    }
};