const {SlashCommandBuilder, EmbedBuilder, ContainerBuilder, MessageFlags} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('priority-order')
        .setDescription('Mark an order as priority')
        .addStringOption(option =>
            option.setName('order-id')
                .setDescription('The ID of the order to mark as priority')
                .setRequired(true)
        ),
    async execute(interaction) {
        
            
            


            const PriorityOrderContainer = new ContainerBuilder()
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(`The order has been marked as priority by <@${interaction.user.id}>.`),
                
                )
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(`**Status:** Priority`)
                )
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(`Your order has been marked as priority. We will begin on your order as soon as possible.`)
                );

                await interaction.channel.send({
                    components: [PriorityOrderContainer],
                    flags: MessageFlags.IsComponentsV2
                });
        }
};


// const PriorityOrderEmbed = new EmbedBuilder()
 //           .setColor(0x00FF00)
 //           .setTitle('Order Marked as Priority')
  //          .setDescription(`The order has been marked as priority by <@${interaction.user.id}>.`)
     //           .addFields(
      //              { name: 'Status', value: 'Priority' },
      //              { name: 'Information', value: 'Your order has been marked as priority. We will begin on your order as soon as possible.' }
         //       );