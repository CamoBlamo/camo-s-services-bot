const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js')
const { postHoneypot } = require('../utils/honeypotManager')

const data = new SlashCommandBuilder()
    .setName('honeypot')
    .setDescription('setup or refresh the honeypot channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

async function execute(interaction) {
    const { message, softbanCount } = await postHoneypot(interaction.channel)

    await interaction.reply({
        content: `honeypot is live in ${interaction.channel} and tracking ${softbanCount} softban(s)`,
        flags: MessageFlags.Ephemeral
    })
}

module.exports = { data, execute }