const {SlashCommandBuilder, ContainerBuilder, MessageFlags} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('paid-order')
        .setDescription('Mark an order as paid')
        .addStringOption(option =>
            option.setName('order-id')
                .setDescription('The ID of the order to mark as paid')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('The amount paid for the order')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('payment-method')
                .setDescription('The payment method used for the order')
                .setRequired(true)
        ),
    async execute(interaction) {
        const orderId = interaction.options.getString('order-id');
        const amount = interaction.options.getString('amount');
        const paymentMethod = interaction.options.getString('payment-method');
        const channel = interaction.channel;

        const PaidOrderContainer = new ContainerBuilder()
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(`The order has been marked as paid by <@${interaction.user.id}>.`)
            )
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(`**Status:** Paid`)
            )
                .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(`Your order has been marked as paid. We will begin processing your order as soon as possible.`)
            )
            .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(`**Amount Paid:** ${amount}`)
            )
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(`**Payment Method:** ${paymentMethod}`)
            );

        await channel.send({
            components: [PaidOrderContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
};