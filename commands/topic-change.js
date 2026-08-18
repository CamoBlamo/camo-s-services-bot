const { SlashCommandBuilder, ContainerBuilder, MediaGalleryBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder, TextDisplayComponent, MessageFlags, TextChannel } = require('discord.js')
const { execute } = require('./suggest')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('topic-change')
        .setDescription('request a topic change request')
        .addChannelOption(o => 
            o.setName('channel')
            .setDescription('the channel to send this request to.')
            .setRequired(true)
        )
        .addStringOption(o => 
            o.setName('question')
            .setDescription('ask a question to start a new conversation')
            .setRequired(false)
        ),

        async execute(interaction) {
            const targetChannel = interaction.options.getChannel('channel')
            const questionAsked = interaction.options.getString('question')

            const mainContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('**Topic Change Requested**')
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Large)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('> A high ranking member of the staff team has requested a topic change for the current conversation going on in this channel. Failure to change the topic may request in moderation action taken against your account. Please remember to ensure that all conversations follow the server rules.')
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**${questionAsked}**` || `No question was asked`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Large)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# This topic change request was initatied by ${interaction.user.tag}`)
            )

            const secondaryContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('**Topic Change Requested**')
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Large)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('> A high ranking member of the staff team has requested a topic change for the current conversation going on in this channel. Failure to change the topic may request in moderation action taken against your account. Please remember to ensure that all conversations follow the server rules.')
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Large)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# This topic change request was initatied by ${interaction.user.tag}`)
            )

            if (questionAsked) {
            const mainMsg = await targetChannel.send({
                components: [mainContainer],
                flags: [MessageFlags.IsComponentsV2]
            })
        }

        if (!questionAsked) {
            const secondaryMsg = await targetChannel.send({
                components: [secondaryContainer],
                flags: [MessageFlags.IsComponentsV2]
            })
        }
            await interaction.reply({
                content: 'Sucessfully sent topic change request.',
                flags: [MessageFlags.Ephemeral]
            })
        }
}