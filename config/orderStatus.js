const SERVICES = [
    { key: 'liveries', label: 'Liveries' },
    { key: 'clothing', label: 'Graphics' },
    { key: 'discord', label: 'Discord Server' },
    { key: 'photography', label: 'Photography' },
    { key: 'bot-development', label: 'Bot Development' },
    { key: 'gfx', label: 'GFX' },
]

const STATUS = {
    OPEN: 'open',
    CLOSED: 'closed',
    DELAYED: 'delayed'
}

const EMOJIS = {
    HEADER: '<:emoji:1538247091976151070>',
    [STATUS.OPEN]: '<:open:1538245974185738381>',
    [STATUS.CLOSED]: '<:closee:1538246056457011220>',
    [STATUS.DELAYED]: '<:delay:1538246156566667464>',
}

//const STATUS_MANAGER_ROLE = 'your role id here'

module.exports = { SERVICES, STATUS, EMOJIS }