const {SlashCommandBuilder, MessageFlags, ContainerBuilder} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bot-status')
        .setDescription('Check the status of the bot'),
    async execute(interaction) {
        const botStatusContainer = new ContainerBuilder()
            .addTextDisplayComponents((t) =>
                t.setContent(`## Bot Status`)
            )
            .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((t) =>
                t.setContent(`**Status:** Online`)
            )
            .addTextDisplayComponents((t) =>
                t.setContent(`**Uptime:** ${process.uptime().toFixed(2)} seconds`)
            )
            .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((t) =>
                t.setContent(`-# Status checked by <@${interaction.user.id}> • ${new Date().toLocaleString()}`)
            );

        await interaction.reply({
            components: [botStatusContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
};