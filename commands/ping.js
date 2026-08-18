const { 
    SlashCommandBuilder, 
    ContainerBuilder, 
    MessageFlags 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction) {
        const sent = await interaction.reply({
            components: [
                new ContainerBuilder()
                    .addTextDisplayComponents((t) =>
                        t.setContent('🏓 Pinging...')
                    )
            ],
            flags: MessageFlags.IsComponentsV2,
            withResponse: true
        });

        const latency = sent.interaction.createdTimestamp - interaction.createdTimestamp;
        const wsLatency = interaction.client.ws.ping;

        await interaction.editReply({
            components: [
                new ContainerBuilder()
                    .addTextDisplayComponents((t) =>
                        t.setContent(`🏓 Pong!\n> Roundtrip: **${latency}ms**\n> Websocket: **${wsLatency}ms**`)
                    )
            ],
            flags: MessageFlags.IsComponentsV2
        });
    }
};