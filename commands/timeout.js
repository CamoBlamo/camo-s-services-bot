const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js')

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000

const DURATIONS = [
    { name: '60 seconds', value: 60 * 1000 },
    { name: '5 minutes', value: 5 * 60 * 1000 },
    { name: '10 minutes', value: 10 * 60 * 1000 },
    { name: '1 hour', value: 60 * 60 * 1000 },
    { name: '1 day', value: 24 * 60 * 60 * 1000 },
    { name: '1 week', value: 7 * 24 * 60 * 60 * 1000 },
    { name: '28 days', value: MAX_TIMEOUT_MS },
]

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('time out a member')
        .addUserOption(opt => 
            opt
                .setName('user')
                .setDescription('the member to timeout')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt
                .setName('duration')
                .setDescription('the duration of the mute')
                .setRequired(true)
                .addChoices(...DURATIONS.map(d => ({ name: d.name, value: String(d.value) })))
        )
        .addStringOption(opt =>
            opt
                .setName('reason')
                .setDescription('the reason for timing the user out')
                .setRequired(false)
        ),

        async execute(interaction) {
            const target = interaction.options.getUser('user')
            const durationMs = Number(interaction.options.getString('duration'))
            const reason = interaction.options.getString('reason') ?? 'No Reason Provided'

            const member = await interaction.guild.members.fetch(target.id).catch(() => null)

            if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                return interaction.reply({ content: 'You do not have permission to ban members.', flags: MessageFlags.Ephemeral });
            }
            
            if (!member) {
                return interaction.reply({
                    content: "That user is not in the server.",
                    flags: MessageFlags.Ephemeral
                })
            }
        }
}