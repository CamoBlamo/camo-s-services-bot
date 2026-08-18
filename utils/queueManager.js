const fs = require('fs');
const path = require('path');
const { ContainerBuilder, MessageFlags } = require('discord.js');

const DATA_PATH = path.join(__dirname, '../data/queue.json');

function readQueue() {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function writeQueue(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function buildQueueContainer(entries) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents((t) =>
            t.setContent(`## 📋 Commission Queue`)
        )
        .addTextDisplayComponents((t) =>
            t.setContent(`**${entries.length}** commission(s) in queue.`)
        )
        .addSeparatorComponents((s) => s)
        .addTextDisplayComponents((t) =>
            t.setContent("**Status Legend:**\n> ⏳ Pending: Order is waiting to be processed.\n> ✅ Completed: Order has been completed.\n> ⚠️ Priority: Order is marked as priority.\n> ❌ Cancelled: Order has been cancelled.\n> 👀 In Review: Order is currently being reviewed.\n-# All orders are regularly given a status update. If you don't see your order on this board then please let a staff member know.")
        )
        .addSeparatorComponents((s) => s);

    if (entries.length === 0) {
        container.addTextDisplayComponents((t) =>
            t.setContent(`*The queue is currently empty.*`)
        );
    } else {
        entries.forEach((entry, index) => {
            container.addTextDisplayComponents((t) =>
                t.setContent(
                    `**${index + 1}.** <@${entry.userId}>\n` +
                    `> **Service:** ${entry.service}\n` +
                    `> **Status:** ${entry.status}`
                )
            );
        });
    }

    container.addSeparatorComponents((s) => s)
        .addTextDisplayComponents((t) =>
            t.setContent(`-# Last updated: ${new Date().toLocaleString()}`)
        );

    return container;
}

async function updateQueueMessage(client) {
    const data = readQueue();
    if (!data.messageId || !data.channelId) return;

    const channel = await client.channels.fetch(data.channelId).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(data.messageId).catch(() => null);
    if (!message) return;

    await message.edit({
        components: [buildQueueContainer(data.entries)],
        flags: MessageFlags.IsComponentsV2
    });
}

module.exports = { readQueue, writeQueue, buildQueueContainer, updateQueueMessage };