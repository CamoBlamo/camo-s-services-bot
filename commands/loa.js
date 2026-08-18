const { SlashCommandBuilder, MessageFlags, ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readLoa, writeLoa } = require('../utils/loaManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loa')
        .setDescription('LOA')
        .addSubcommand(subcommand =>
            subcommand
                .setName('request')
                .setDescription('Request a leave of absence')
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('The reason for the leave of absence')
                        .setRequired(true)
                )
                .addNumberOption(option =>
                    option.setName('duration')
                        .setDescription('The duration of the leave of absence in days')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('manager')
                .setDescription('Manage leave of absence requests')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('The action to take on the request')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Approve', value: 'approve' },
                            { name: 'Deny', value: 'deny' },
                            { name: 'End', value: 'end' }
                        )
                )
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user whose request to manage')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all pending LOA requests')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('active')
                .setDescription('List all active LOAs')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('View LOA history for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to view history for')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Check your current LOA status')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const data = readLoa();

        if (subcommand === 'request') {
            const reason = interaction.options.getString('reason');
            const duration = interaction.options.getNumber('duration');
            const returnDate = new Date();
            returnDate.setDate(returnDate.getDate() + duration);

            if (data.requests[interaction.user.id]) {
                return interaction.reply({ content: 'You already have a pending LOA request.', ephemeral: true });
            }

            if (data.active[interaction.user.id]) {
                return interaction.reply({ content: 'You are already on an active LOA.', ephemeral: true });
            }

            data.requests[interaction.user.id] = {
                userId: interaction.user.id,
                username: interaction.user.username,
                reason,
                duration,
                returnDate: returnDate.toISOString(),
                requestedAt: new Date().toISOString()
            };
            writeLoa(data);

            const loaChannel = interaction.guild.channels.cache.find(c => c.name === 'loa-requests');
            if (!loaChannel) {
                return interaction.reply({ content: 'Could not find the loa-requests channel.', ephemeral: true });
            }

            const requestContainer = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## 🏖️ LOA Request`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(
                        `**Staff Member:** <@${interaction.user.id}>\n` +
                        `**Reason:** ${reason}\n` +
                        `**Duration:** ${duration} day(s)\n` +
                        `**Return Date:** <t:${Math.floor(returnDate.getTime() / 1000)}:D>\n` +
                        `**Status:** ⏳ Pending Approval`
                    )
                )
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# Submitted: ${new Date().toLocaleString()}`));

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`loa_approve_${interaction.user.id}_${duration}`)
                    .setLabel('Approve')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`loa_deny_${interaction.user.id}`)
                    .setLabel('Deny')
                    .setStyle(ButtonStyle.Danger)
            );

            await loaChannel.send({ components: [requestContainer, row], flags: MessageFlags.IsComponentsV2 });
            return interaction.reply({ content: `Your LOA request for **${duration}** day(s) has been submitted and is pending approval.`, ephemeral: true });
        }

        if (subcommand === 'manager') {
            const allowed = interaction.member.roles.cache.some(r => r.name === 'temp');
            if (!allowed) return interaction.reply({ content: 'You do not have permission to manage LOA requests.', ephemeral: true });

            const action = interaction.options.getString('action');
            const user = interaction.options.getUser('user');

            if (action === 'approve') {
                const request = data.requests[user.id];
                if (!request) return interaction.reply({ content: `<@${user.id}> has no pending LOA request.`, ephemeral: true });

                const returnDate = new Date(request.returnDate);

                data.active[user.id] = {
                    ...request,
                    approvedBy: interaction.user.username,
                    approvedAt: new Date().toISOString()
                };
                delete data.requests[user.id];
                writeLoa(data);

                const logChannel = interaction.guild.channels.cache.find(c => c.name === 'loa-logs');
                if (logChannel) {
                    const logContainer = new ContainerBuilder()
                        .addTextDisplayComponents(t => t.setContent(`## ✅ LOA Approved`))
                        .addSeparatorComponents(s => s)
                        .addTextDisplayComponents(t =>
                            t.setContent(
                                `**Staff Member:** <@${user.id}>\n` +
                                `**Return Date:** <t:${Math.floor(returnDate.getTime() / 1000)}:D>\n` +
                                `**Approved By:** ${interaction.user.username}`
                            )
                        )
                        .addSeparatorComponents(s => s)
                        .addTextDisplayComponents(t => t.setContent(`-# ${new Date().toLocaleString()}`));

                    await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
                }

                try {
                    const dmContainer = new ContainerBuilder()
                        .addTextDisplayComponents(t => t.setContent(`## ✅ Your LOA has been approved`))
                        .addSeparatorComponents(s => s)
                        .addTextDisplayComponents(t =>
                            t.setContent(
                                `**Return Date:** <t:${Math.floor(returnDate.getTime() / 1000)}:D>\n` +
                                `**Approved By:** ${interaction.user.username}`
                            )
                        );
                    await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
                } catch {}

                return interaction.reply({ content: `Approved <@${user.id}>'s LOA.`, ephemeral: true });
            }

            if (action === 'deny') {
                const request = data.requests[user.id];
                if (!request) return interaction.reply({ content: `<@${user.id}> has no pending LOA request.`, ephemeral: true });

                data.history.push({
                    ...request,
                    status: 'denied',
                    actionedBy: interaction.user.username,
                    actionedAt: new Date().toISOString()
                });
                delete data.requests[user.id];
                writeLoa(data);

                const logChannel = interaction.guild.channels.cache.find(c => c.name === 'loa-logs');
                if (logChannel) {
                    const logContainer = new ContainerBuilder()
                        .addTextDisplayComponents(t => t.setContent(`## ❌ LOA Denied`))
                        .addSeparatorComponents(s => s)
                        .addTextDisplayComponents(t =>
                            t.setContent(
                                `**Staff Member:** <@${user.id}>\n` +
                                `**Denied By:** ${interaction.user.username}`
                            )
                        )
                        .addSeparatorComponents(s => s)
                        .addTextDisplayComponents(t => t.setContent(`-# ${new Date().toLocaleString()}`));

                    await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
                }

                try {
                    await user.send({ content: `Your LOA request was **denied** by **${interaction.user.username}**.` });
                } catch {}

                return interaction.reply({ content: `Denied <@${user.id}>'s LOA request.`, ephemeral: true });
            }

            if (action === 'end') {
                const active = data.active[user.id];
                if (!active) return interaction.reply({ content: `<@${user.id}> is not currently on LOA.`, ephemeral: true });

                data.history.push({
                    ...active,
                    status: 'ended',
                    endedBy: interaction.user.username,
                    endedAt: new Date().toISOString()
                });
                delete data.active[user.id];
                writeLoa(data);

                const logChannel = interaction.guild.channels.cache.find(c => c.name === 'loa-logs');
                if (logChannel) {
                    const logContainer = new ContainerBuilder()
                        .addTextDisplayComponents(t => t.setContent(`## 🔄 LOA Ended`))
                        .addSeparatorComponents(s => s)
                        .addTextDisplayComponents(t =>
                            t.setContent(
                                `**Staff Member:** <@${user.id}>\n` +
                                `**Ended By:** ${interaction.user.username}`
                            )
                        )
                        .addSeparatorComponents(s => s)
                        .addTextDisplayComponents(t => t.setContent(`-# ${new Date().toLocaleString()}`));

                    await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
                }

                try {
                    const dmContainer = new ContainerBuilder()
                        .addTextDisplayComponents(t => t.setContent(`## 🔄 Your LOA has been ended`))
                        .addSeparatorComponents(s => s)
                        .addTextDisplayComponents(t =>
                            t.setContent(`**Ended By:** ${interaction.user.username}`)
                        );
                    await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
                } catch {}

                return interaction.reply({ content: `Ended <@${user.id}>'s LOA.`, ephemeral: true });
            }
        }

        if (subcommand === 'list') {
            const pending = Object.values(data.requests);

            if (pending.length === 0) {
                return interaction.reply({ content: 'No pending LOA requests.', ephemeral: true });
            }

            const container = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## ⏳ Pending LOA Requests (${pending.length})`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(pending.map(r =>
                        `> <@${r.userId}> — ${r.duration} day(s)\n` +
                        `> Reason: ${r.reason}\n` +
                        `> Submitted: <t:${Math.floor(new Date(r.requestedAt).getTime() / 1000)}:R>`
                    ).join('\n\n'))
                );

            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }

        if (subcommand === 'active') {
            const active = Object.values(data.active);

            if (active.length === 0) {
                return interaction.reply({ content: 'No staff members are currently on LOA.', ephemeral: true });
            }

            const container = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## 🏖️ Active LOAs (${active.length})`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(active.map(r =>
                        `> <@${r.userId}> — Returns <t:${Math.floor(new Date(r.returnDate).getTime() / 1000)}:D>\n` +
                        `> Reason: ${r.reason}\n` +
                        `> Approved By: ${r.approvedBy}`
                    ).join('\n\n'))
                );

            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }

        if (subcommand === 'history') {
            const user = interaction.options.getUser('user');
            const userHistory = data.history.filter(r => r.userId === user.id);

            if (userHistory.length === 0) {
                return interaction.reply({ content: `<@${user.id}> has no LOA history.`, ephemeral: true });
            }

            const container = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## 📋 LOA History — <@${user.id}>`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(userHistory.slice(-10).reverse().map((r, i) => {
                        const statusEmoji = r.status === 'ended' ? '🔄' : '❌';
                        return `**#${i + 1}** ${statusEmoji} ${r.status.toUpperCase()}\n` +
                            `> Reason: ${r.reason} | Duration: ${r.duration} day(s)\n` +
                            `> <t:${Math.floor(new Date(r.requestedAt).getTime() / 1000)}:D> → <t:${Math.floor(new Date(r.returnDate).getTime() / 1000)}:D>`;
                    }).join('\n\n'))
                )
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# ${userHistory.length} total entries`));

            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }

        if (subcommand === 'check') {
            const pending = data.requests[interaction.user.id];
            const active = data.active[interaction.user.id];
            const userHistory = data.history.filter(r => r.userId === interaction.user.id);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## 🏖️ Your LOA Status`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(
                        active
                            ? `**Status:** ✅ On Active LOA\n**Reason:** ${active.reason}\n**Return Date:** <t:${Math.floor(new Date(active.returnDate).getTime() / 1000)}:D>\n**Approved By:** ${active.approvedBy}`
                            : pending
                            ? `**Status:** ⏳ Pending Approval\n**Reason:** ${pending.reason}\n**Duration:** ${pending.duration} day(s)\n**Submitted:** <t:${Math.floor(new Date(pending.requestedAt).getTime() / 1000)}:R>`
                            : `**Status:** ✅ Active — Not on LOA`
                    )
                )
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# Total LOA history: ${userHistory.length} entries`));

            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }
    }
};