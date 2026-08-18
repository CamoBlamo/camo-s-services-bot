const {SlashCommandBuilder, MessageFlags, ContainerBuilder} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('payment-methods')
        .setDescription('Check the available payment methods'),
    async execute(interaction) {
        const paymentMethodsContainer = new ContainerBuilder()
            .addTextDisplayComponents((t) =>
                t.setContent(`## Payment Methods`)
            )
            .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((t) =>
                t.setContent(`**Available Payment Methods:**\n- Robux\n- TBD\n- TBD\n- TBD`)
            )
            .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((t) =>
                t.setContent(`-# Payment methods checked by <@${interaction.user.id}> • ${new Date().toLocaleString()}`)
            );

        await interaction.reply({
            components: [paymentMethodsContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
};  