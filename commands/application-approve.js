const {
    SlashCommandBuilder,
    ContainerBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    MessageFlags,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('application-status')
        .setDescription('Approve or deny an application')
        .addUserOption(o =>
            o
                .setName('user')
                .setDescription('the user you are approving the application for')
                .setRequired(true)
        )
        .addStringOption(o =>
            o
                .setName('application')
                .setDescription('the application they applied for')
                .setRequired(true)
        )
        .addStringOption(o =>
            o
                .setName('status')
                .setDescription('whether the user passed or failed')
                .setRequired(true)
                .addChoices(
                    { name: 'Passed', value: 'passed' },
                    { name: 'Failed', value: 'failed' }
                )
        )
        .addStringOption(o =>
            o
                .setName('reason')
                .setDescription('reason for choice on pass or fail')
                .setRequired(true)
        )
        .addStringOption(o =>
            o
                .setName('notes')
                .setDescription('any notes you have for them based on the application')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(null) 
        .setContexts(0), //guild only

    async execute(interaction) {
        // ---- config ----
        const STAFF_ROLE_ID = '1518092846559920238'
        const RESULTS_CHANNEL_NAME = 'application-results'
        const APPROVED_HEADER_IMAGE = 'https://yumi.onl/api/files/6a696220f3edd421876bf0d6/raw'
        const APPROVED_FOOTER_IMAGE = 'https://yumi.onl/api/files/6a7a8632c797709683b672a4/raw'
        const DENIED_HEADER_IMAGE = 'https://yumi.onl/api/files/6a696220f3edd421876bf0d6/raw' // swap for a "denied" banner if you have one
        const DENIED_FOOTER_IMAGE = 'https://yumi.onl/api/files/6a7a8632c797709683b672a4/raw'
        const SERVER_INVITE_URL = 'https://discord.gg/mode2026'
        const DOCS_URL = 'https://yumi.onl'
        const ACCENT_COLOR_PASS = 0x57f287 // Discord green, remove if not wanted
        const ACCENT_COLOR_FAIL = 0xed4245 // Discord red, remove if not wanted
        // ---- end config ----

        const targetUser = interaction.options.getUser('user')
        const application = interaction.options.getString('application')
        const staffNotes = interaction.options.getString('notes')
        const appStatus = interaction.options.getString('status') 
        const statusReason = interaction.options.getString('reason')

        const isPassed = appStatus === 'passed'
        const statusLabel = isPassed ? 'Passed' : 'Failed'

        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
            return interaction.reply({
                content: `You do not have permission to run this command. Required Role: <@&${STAFF_ROLE_ID}>`,
                flags: [MessageFlags.Ephemeral]
            })
        }

        const resultsChannel = interaction.guild.channels.cache.find(
            c => c.name === RESULTS_CHANNEL_NAME
        )

        if (!resultsChannel) {
            return interaction.reply({
                content: `Could not find a channel named \`${RESULTS_CHANNEL_NAME}\`. Create it or update the channel name in the command config.`,
                flags: [MessageFlags.Ephemeral]
            })
        }

        if (!resultsChannel.permissionsFor(interaction.client.user)?.has(PermissionFlagsBits.SendMessages)) {
            return interaction.reply({
                content: `I don't have permission to send messages in ${resultsChannel}.`,
                flags: [MessageFlags.Ephemeral]
            })
        }

        if (staffNotes && staffNotes.length > 1000) {
            return interaction.reply({
                content: 'Notes are too long — please keep them under 1000 characters.',
                flags: [MessageFlags.Ephemeral]
            })
        }

       
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] })

        
        const linkButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Join Our Server')
                .setStyle(ButtonStyle.Link)
                .setURL(SERVER_INVITE_URL),
            new ButtonBuilder()
                .setLabel('View Documentation')
                .setStyle(ButtonStyle.Link)
                .setURL(DOCS_URL)
        )

        
        const dmIntro = isPassed
            ? `**Congratulations, ${targetUser}!**\nAfter reviewing your application, we're happy to let you know you **passed** your application for **${application}**.`
            : `Hey ${targetUser},\nAfter reviewing your application, we regret to inform you that you did **not pass** your application for **${application}**.`

        const channelIntro = isPassed
            ? `**Congratulations, ${targetUser}!**\nYou have **passed** your application for **${application}**. Please check your DMs for details.`
            : `${targetUser} has **failed** their application for **${application}**. They have been notified via DM.`

        const reviewNotesMessage = 'Please review the notes our staff provided based on your application.'

        
        const channelContainer = new ContainerBuilder()
            .setAccentColor(isPassed ? ACCENT_COLOR_PASS : ACCENT_COLOR_FAIL)
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder({
                        media: { url: isPassed ? APPROVED_HEADER_IMAGE : DENIED_HEADER_IMAGE }
                    })
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${application} — Application ${statusLabel}`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(channelIntro)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# reviewed by ${interaction.user.tag} • <t:${Math.floor(Date.now() / 1000)}:R>`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder({
                        media: { url: isPassed ? APPROVED_FOOTER_IMAGE : DENIED_FOOTER_IMAGE }
                    })
                )
            )

        
        const dmContainer = new ContainerBuilder()
            .setAccentColor(isPassed ? ACCENT_COLOR_PASS : ACCENT_COLOR_FAIL)
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder({
                        media: { url: isPassed ? APPROVED_HEADER_IMAGE : DENIED_HEADER_IMAGE }
                    })
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## Application ${statusLabel}`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(dmIntro)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Reason:** ${statusReason}`)
            )

        if (staffNotes) {
            dmContainer
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(reviewNotesMessage),
                    new TextDisplayBuilder().setContent(staffNotes)
                )
        }

        dmContainer
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# reviewed by ${interaction.user.tag}`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder({
                        media: { url: isPassed ? APPROVED_FOOTER_IMAGE : DENIED_FOOTER_IMAGE }
                    })
                )
            )

      
        try {
            await resultsChannel.send({
                components: [channelContainer],
                flags: [MessageFlags.IsComponentsV2]
            })
        } catch (err) {
            console.error('Failed to post results to channel:', err)
            return interaction.editReply({
                content: `Failed to post the results message in ${resultsChannel}. Check my permissions and try again.`
            })
        }


        let dmFailed = false
        try {
            await targetUser.send({
                components: [dmContainer, linkButtons],
                flags: [MessageFlags.IsComponentsV2]
            })
        } catch (err) {
            console.error(`Failed to DM ${targetUser.tag}:`, err)
            dmFailed = true
        }

        return interaction.editReply({
            content: dmFailed
                ? `⚠️ Application results posted, but the DM to ${targetUser.tag} failed to send (they may have DMs disabled or have blocked the bot).`
                : `Successfully posted results and sent the DM (${statusLabel}) ${staffNotes ? 'with' : 'without'} notes.`
        })
    }
}