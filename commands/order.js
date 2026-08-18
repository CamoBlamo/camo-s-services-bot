const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('order')
        .setDescription('Start a new order'),

    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('orderModal')
            .setTitle('New Order');

        const nameInput = new TextInputBuilder()
            .setCustomId('nameInput')
            .setLabel('Your Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const contactInput = new TextInputBuilder()
            .setCustomId('contactInput')
            .setLabel('Contact Information')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const serviceInput = new TextInputBuilder()
            .setCustomId('serviceInput')
            .setLabel('Service Requested')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const detailsInput = new TextInputBuilder()
            .setCustomId('detailsInput')
            .setLabel('Additional Details')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(contactInput),
            new ActionRowBuilder().addComponents(serviceInput),
            new ActionRowBuilder().addComponents(detailsInput),
        );

        await interaction.showModal(modal);

        const submitted = await interaction.awaitModalSubmit({ time: 300_000 }).catch(() => null);
        if (!submitted) return;

        const name = submitted.fields.getTextInputValue('nameInput');
        const contact = submitted.fields.getTextInputValue('contactInput');
        const service = submitted.fields.getTextInputValue('serviceInput');
        const details = submitted.fields.getTextInputValue('detailsInput') || 'None';

        const orderContainer = new ContainerBuilder()
            .addTextDisplayComponents((t) =>
                t.setContent(`## New Order Received`)
            )
            .addTextDisplayComponents((t) =>
                t.setContent(`A new order has been submitted by <@${interaction.user.id}>.`)
            )
            .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((t) =>
                t.setContent(`**Name:** ${name}`)
            )
            .addTextDisplayComponents((t) =>
                t.setContent(`**Contact:** ${contact}`)
            )
            .addTextDisplayComponents((t) =>
                t.setContent(`**Service:** ${service}`)
            )
            .addTextDisplayComponents((t) =>
                t.setContent(`**Details:** ${details}`)
            )
            .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((t) =>
                t.setContent(`-# Review and process this order. • ${new Date().toLocaleString()}`)
            );

        await submitted.reply({ content: 'Your order has been submitted!', ephemeral: true });
        await interaction.channel.send({
            components: [orderContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
};