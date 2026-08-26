const fs = require('node:fs')
const path = require('node:path')
const {
    ContainerBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder
} = require('discord.js')

const DATA_PATH = path.join(__dirname, '..', 'data', 'honeypot.json')

//set these to your images. if your using yumi, copy the raw link.
const HEADER_IMAGE_URL = 'https://yumi.onl/api/files/6a696220f3edd421876bf0d6/raw'
const FOOTER_IMAGE_URL = 'https://yumi.onl/api/files/6a7a8632c797709683b672a4/raw'

function readHoneypot() {
    if (!fs.existsSync(DATA_PATH)) {
        return { guilds: {} }
    }
    try {
        return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
    } catch {
        return { guilds: {} }
    }
}

function writeHoneypot(data) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true })
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
}

function buildHoneypotContainer(softbanCount) {
    const container = new ContainerBuilder()
        .addMediaGalleryComponents(gallery =>
            gallery.addItems(item => item.setURL(HEADER_IMAGE_URL))
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Large)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## Automated Server Security')
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Large)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('**⚠️ Do Not Send Any Messages Here**'),
            new TextDisplayBuilder().setContent('This channel is apart of our automated server security system. Desgined to help prevent members of our server being exposed scams.')
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Large)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('> **Warning:** Any user who sends a message will be softbanned from the server. Please keep this channel clear.')
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Large)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('honeypot_counter')
                    .setEmoji('⚠️')
                    .setLabel(`${softbanCount} softban${softbanCount === 1 ? '' : 's'}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            )
        )
        .addMediaGalleryComponents(gallery => 
            gallery.addItems(item => item.setURL(FOOTER_IMAGE_URL))
        )

        return container
}

async function postHoneypot(channel) {
    const data = readHoneypot()
    const existing = data.guilds[channel.guild.id]
    const softbanCount = existing?.softbanCount ?? 0

    const message = await channel.send({
        components: [buildHoneypotContainer(softbanCount)],
        flags: MessageFlags.IsComponentsV2
    })

    data.guilds[channel.guild.id] = {
        channelId: channel.id,
        messageId: message.id,
        softbanCount
    }
    writeHoneypot(data)

    return { message, softbanCount }
}

async function handleMessage(message) {
    //if (message.author.bot || !message.guild) return false

    const data = readHoneypot()
    const entry = data.guilds[message.guild.id]
    if (!entry || message.channel.id !== entry.channelId) return false

    await message.delete().catch(() => {})

    const member = message.member
    if (!member) return true

    await message.guild.members
        .ban(member.id, { deleteMessageSeconds: 60 * 60 * 24 * 7, reason: 'Honeypot Trigger' })
        .catch(() => {})
    await message.guild.members.unban(member.id, 'Honeypot softban').catch(() => {})

    entry.softbanCount = (entry.softbanCount ?? 0) + 1
    data.guilds[message.guild.id] = entry
    writeHoneypot(data)

    try {
        const channel = await message.guild.channels.fetch(entry.channelId)
        const honeypotMessage = await channel.messages.fetch(entry.messageId)
        await honeypotMessage.edit({
            components: [buildHoneypotContainer(entry.softbanCount)],
            flags: MessageFlags.IsComponentsV2
        })
    } catch(err) {
        console.log('error occured.', err)
    }

    return true
}

module.exports = {
    readHoneypot,
    writeHoneypot,
    buildHoneypotContainer,
    postHoneypot,
    handleMessage
}