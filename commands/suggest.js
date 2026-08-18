const { 
    SlashCommandBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    MediaGalleryBuilder, 
    MediaGalleryItemBuilder, 
    SeparatorBuilder, 
    SeparatorSpacingSize, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    MessageFlags 
} = require('discord.js');

const suggestionManager = require('../utils/suggestionManager'); 

// CONFIGURATION
const FORUM_CHANNEL_ID = '1535072415816745052'; 
const TEMP_ROLE_ID = '1518091521830682786'; 

const pendingAttachments = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Submit a suggestion to the community!')
        .addAttachmentOption(option =>
            option
                .setName('media')
                .setDescription('Upload an example image or video (Optional)')
                .setRequired(false)
        ),

    async execute(interaction) {
        if (interaction.replied || interaction.deferred) return;

        const attachment = interaction.options.getAttachment('media');
        if (attachment) {
            pendingAttachments.set(interaction.user.id, attachment.url);
        }

        const modal = new ModalBuilder()
            .setCustomId('suggestion_modal')
            .setTitle('Submit a Suggestion');

        const titleInput = new TextInputBuilder()
            .setCustomId('suggestion_title')
            .setLabel('Suggestion Title')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter a brief title...')
            .setRequired(true);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('suggestion_description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Describe your suggestion in detail...')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descriptionInput)
        );

        await interaction.showModal(modal);
    },

    async handleInteraction(interaction) {
        
        if (interaction.isModalSubmit() && interaction.customId === 'suggestion_modal') {
            try {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const title = interaction.fields.getTextInputValue('suggestion_title');
                const description = interaction.fields.getTextInputValue('suggestion_description');
                
                const mediaUrl = pendingAttachments.get(interaction.user.id) || null;
                pendingAttachments.delete(interaction.user.id); // Clean up memory

                const forumChannel = interaction.guild.channels.cache.get(FORUM_CHANNEL_ID);

                if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
                    return interaction.editReply({ 
                        content: 'Error: Could not find configured Forum Channel.'
                    });
                }

                const record = suggestionManager.create({
                    authorId: interaction.user.id,
                    title,
                    description,
                    media: mediaUrl,
                });

                const container = new ContainerBuilder()
                    .setAccentColor(0x3498db)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## 💡 ${title}`),
                        new TextDisplayBuilder().setContent(`**Submitted by:** ${interaction.user}\n\n${description}`)
                    );

                if (mediaUrl) {
                    container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
                    );
                    container.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                            new MediaGalleryItemBuilder().setURL(mediaUrl)
                        )
                    );
                }

                container.addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
                );

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`approve_suggestion_${record.id}`)
                        .setLabel('Approve')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`deny_suggestion_${record.id}`)
                        .setLabel('Deny')
                        .setStyle(ButtonStyle.Danger)
                );

                container.addActionRowComponents(buttons);

                const thread = await forumChannel.threads.create({
                    name: title,
                    message: {
                        components: [container],
                        flags: [MessageFlags.IsComponentsV2]
                    },
                });

                suggestionManager.update(record.id, { threadId: thread.id });

                return interaction.editReply({
                    content: `Your suggestion has been submitted! View it here: ${thread}`
                });

            } catch (error) {
                console.error('[Modal Submit Error]:', error);
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: `An error occurred while submitting: ${error.message}` });
                }
            }
        }

        
        if (interaction.isButton()) {
            try {
                const [action, type, suggestionId] = interaction.customId.split('_');
                if (type !== 'suggestion') return;

                const member = interaction.member;
                if (!member.roles.cache.has(TEMP_ROLE_ID)) {
                    return interaction.reply({ 
                        content: 'You do not have permission to review suggestions.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }

                await interaction.deferUpdate();

                const suggestion = suggestionManager.get(suggestionId);
                if (!suggestion) {
                    return interaction.followUp({ 
                        content: 'Suggestion record not found in database.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }

                if (suggestion.status !== 'pending') {
                    return interaction.followUp({ 
                        content: `This suggestion has already been ${suggestion.status}.`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }

                const updatedContainer = new ContainerBuilder()
                    .setAccentColor(action === 'approve' ? 0x2ecc71 : 0xe74c3c)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## 💡 ${suggestion.title}`),
                        new TextDisplayBuilder().setContent(`**Submitted by:** <@${suggestion.authorId}>\n\n${suggestion.description}`)
                    );

                if (suggestion.media) {
                    updatedContainer.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
                    );
                    updatedContainer.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                            new MediaGalleryItemBuilder().setURL(suggestion.media)
                        )
                    );
                }

                updatedContainer.addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
                );

                if (action === 'approve') {
                    suggestionManager.update(suggestionId, {
                        status: 'approved',
                        reviewedBy: interaction.user.id,
                        reviewedAt: Date.now()
                    });

                    updatedContainer.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`✅ **Approved by:** ${interaction.user}`)
                    );
                } else if (action === 'deny') {
                    suggestionManager.update(suggestionId, {
                        status: 'denied',
                        reviewedBy: interaction.user.id,
                        reviewedAt: Date.now()
                    });

                    updatedContainer.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`❌ **Denied by:** ${interaction.user}`)
                    );
                }

                await interaction.editReply({ 
                    components: [updatedContainer], 
                    flags: [MessageFlags.IsComponentsV2] 
                });

                await interaction.channel.setArchived(true);

            } catch (error) {
                console.error('[Button Interaction Error]:', error);
            }
        }
    }
};