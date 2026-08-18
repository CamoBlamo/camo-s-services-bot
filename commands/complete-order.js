const {SlashCommandBuilder, EmbedBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('complete-order')
        .setDescription('Mark an order as completed')
        .addStringOption(option =>
            option.setName('order-id')
                .setDescription('The ID of the order to complete')
                .setRequired(true)
        ),
    async execute(interaction) {
    const CompleteOrderContainer = new ContainerBuilder()
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(`The order has been marked as completed by <@${interaction.user.id}>.`)

                )
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(`**Status:** Completed`)
                )
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(`Your order has been marked as completed. Please leave a review for our services using the /review command.`)
                );

                await interaction.channel.send({
                    components: [CompleteOrderContainer],
                    flags: MessageFlags.IsComponentsV2
                });
        }
}; 

//const CompleteOrderEmbed = new EmbedBuilder()
            //.setColor(0x00FF00)
           // .setTitle('Order Completed')
            //.setDescription(`The order has been marked as completed by <@${interaction.user.id}>.`)
              //  .addFields(
                //   { name: 'Status', value: 'Completed' },
              //      { name: 'Review', value: 'Please leave a review for our services using the /review command.' }
                //);

            //await interaction.reply({ embeds: [CompleteOrderEmbed] });