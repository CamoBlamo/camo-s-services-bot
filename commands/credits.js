const {SlashCommandBuilder, MessageFlags, ContainerBuilder} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('credits')
        .setDescription('Check the credits of the bot'),
    async execute(interaction) {
        const creditsContainer = new ContainerBuilder()
            .addTextDisplayComponents((t) =>
                t.setContent(`## Bot Credits`)
            )
            .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((t) =>
                t.setContent(`**Developer:** Camo`)
            )
            .addTextDisplayComponents((t) =>
                t.setContent(`**Contributors:** krish - command testing and stuff`)
            )
            .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((t) =>
                t.setContent(`-# Credits checked by <@${interaction.user.id}> • ${new Date().toLocaleString()}`)
            );

        await interaction.reply({
            components: [creditsContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
};