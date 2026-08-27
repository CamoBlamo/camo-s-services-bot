const { ActivityType } = require('discord.js')

const statuses = [
    { text: 'watching commissions', type: ActivityType.Custom },
    { text: 'https://yumi.onl', type: ActivityType.Custom },
    { text: '{members} members', type: ActivityType.Custom },
    { text: 'open a ticket | #support', type: ActivityType.Custom }
];

const ROTATE_INTERVAL_MS = 15_000

function formatText(client, text) {
    return text
        .replace('{members}', client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0).toLocaleString())
        .replace('{servers}', client.guilds.cache.size.toLocaleString())
}

function startStatusRotator(client) {
    let index = 0

    const setStatus = () => {
        const status = statuses[index]
        client.user.setPresence({
            activities: [{ name: formatText(client, status.text), type: status.type }],
            status: 'online'
        })
        index = (index + 1) % statuses.length
    }

    setStatus()
    const interval = setInterval(setStatus, ROTATE_INTERVAL_MS)
    return interval
}

module.exports = { startStatusRotator }