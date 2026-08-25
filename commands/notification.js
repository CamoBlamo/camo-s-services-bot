const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags, ComponentType } = require('discord.js')

const NOTIFICATION_LABELS = [
    { label: 'Announcements', description: 'Get pinged for server announcements', value: 'announcements', roleId: '1541622633886519366', emoji: '📢' },
    { label: 'Giveaways', description: 'Get pinged when a giveaway starts', value: 'giveaways', roleId: '1541622727247536138', emoji: '🎉' },
    { label: 'Events', description: 'Get pinged for server events', value: 'events', roleId: '1541622767521370112', emoji: '📅' },
    { label: 'Updates', description: 'Get pinged for bot/site updates', value: 'updates', roleId: '1541622580547424266', emoji: '🛠️' },
]

function buildContainer(member) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## Notifications'),
            new TextDisplayBuilder().setContent('-# Choose the roles you recieve notifications for')
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Large)
        )
        
        const select = new StringSelectMenuBuilder()
            .setCustomId('notifications_select')
            .setPlaceholder('Choose your notification roles')
            .setMinValues(0)
            .setMaxValues(NOTIFICATION_LABELS.length)
            .addOptions(
                NOTIFICATION_LABELS.map((r) => ({
                    label: r.label,
                    description: r.description,
                    value: r.value,
                    emoji: r.emoji,
                    default: member.roles.cache.has(r.roleId),
                }))
            )

        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(select)
        )

        return container
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('notifications')
        .setDescription('choose what you get notified for'),

    async execute(interaction) {
        const container = buildContainer(interaction.member)

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        })
    }
}