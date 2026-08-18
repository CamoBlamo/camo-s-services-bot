const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');
const { readInfractions, writeInfractions } = require('../utils/infractionManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('infraction')
        .setDescription('Infraction management')
        .addSubcommand(sub =>
            sub.setName('issue')
                .setDescription('Issue an infraction to a user')
                .addUserOption(o => o.setName('user').setDescription('User to infract').setRequired(true))
                .addStringOption(o => o.setName('reason').setDescription('Reason for the infraction').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('void')
                .setDescription('Void an infraction')
                .addUserOption(o => o.setName('user').setDescription('User to void infraction for').setRequired(true))
                .addIntegerOption(o => o.setName('number').setDescription('Infraction number from /infraction history').setRequired(true))
                .addStringOption(o => o.setName('reason').setDescription('Reason for voiding').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('history')
                .setDescription('View infraction history for a user')
                .addUserOption(o => o.setName('user').setDescription('User to view').setRequired(true))
        ),

    async execute(interaction) {
        const allowed = interaction.member.roles.cache.some(r => r.name === 'temp');
        if (!allowed) return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const data = readInfractions();

        if (sub === 'issue') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');

            if (!data.infractions[user.id]) data.infractions[user.id] = [];

            const infractionId = Date.now().toString();
            const infraction = {
                id: infractionId,
                reason,
                issuedBy: interaction.user.username,
                issuedById: interaction.user.id,
                issuedAt: new Date().toISOString(),
                voided: false
            };

            data.infractions[user.id].push(infraction);
            writeInfractions(data);

            const activeCount = data.infractions[user.id].filter(i => !i.voided).length;
            const totalCount = data.infractions[user.id].length;

            const logChannel = interaction.guild.channels.cache.find(c => c.name === data.logChannelName);
            if (logChannel) {
                const logContainer = new ContainerBuilder()
                    .addTextDisplayComponents(t => t.setContent(`## ⚠️ Infraction Issued`))
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t =>
                        t.setContent(
                            `**User:** <@${user.id}> (${user.username})\n` +
                            `**Reason:** ${reason}\n` +
                            `**Issued By:** <@${interaction.user.id}>\n` +
                            `**Active Infractions:** ${activeCount}\n` +
                            `**Total Infractions:** ${totalCount}`
                        )
                    )
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t => t.setContent(`-# ID: ${infractionId} • ${new Date().toLocaleString()}`));

                await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
            }

            try {
                const dmContainer = new ContainerBuilder()
                    .addTextDisplayComponents(t => t.setContent(`## ⚠️ You have received an infraction`))
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t =>
                        t.setContent(
                            `**Reason:** ${reason}\n` +
                            `**Issued By:** ${interaction.user.username}\n` +
                            `**Active Infractions:** ${activeCount}`
                        )
                    )
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t => t.setContent(`-# If you believe this is a mistake, please contact a manager.`));

                await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
            } catch {}

            return interaction.reply({
                content: `Issued infraction to <@${user.id}>. They now have **${activeCount}** active infraction(s).`,
                ephemeral: true
            });
        }

        if (sub === 'void') {
            const user = interaction.options.getUser('user');
            const number = interaction.options.getInteger('number') - 1;
            const voidReason = interaction.options.getString('reason') ?? 'No reason provided';

            if (!data.infractions[user.id] || data.infractions[user.id].length === 0) {
                return interaction.reply({ content: `<@${user.id}> has no infractions.`, ephemeral: true });
            }

            const active = data.infractions[user.id].filter(i => !i.voided);

            if (number < 0 || number >= active.length) {
                return interaction.reply({ content: `Invalid infraction number. <@${user.id}> has **${active.length}** active infraction(s).`, ephemeral: true });
            }

            const target = active[number];
            const realIndex = data.infractions[user.id].findIndex(i => i.id === target.id);
            data.infractions[user.id][realIndex].voided = true;
            data.infractions[user.id][realIndex].voidedBy = interaction.user.username;
            data.infractions[user.id][realIndex].voidedById = interaction.user.id;
            data.infractions[user.id][realIndex].voidedAt = new Date().toISOString();
            data.infractions[user.id][realIndex].voidReason = voidReason;
            writeInfractions(data);

            const remainingActive = data.infractions[user.id].filter(i => !i.voided).length;

            const logChannel = interaction.guild.channels.cache.find(c => c.name === data.logChannelName);
            if (logChannel) {
                const logContainer = new ContainerBuilder()
                    .addTextDisplayComponents(t => t.setContent(`## ✅ Infraction Voided`))
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t =>
                        t.setContent(
                            `**User:** <@${user.id}> (${user.username})\n` +
                            `**Original Reason:** ${target.reason}\n` +
                            `**Void Reason:** ${voidReason}\n` +
                            `**Voided By:** <@${interaction.user.id}>\n` +
                            `**Remaining Active Infractions:** ${remainingActive}`
                        )
                    )
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t => t.setContent(`-# ID: ${target.id} • ${new Date().toLocaleString()}`));

                await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
            }

            try {
                const dmContainer = new ContainerBuilder()
                    .addTextDisplayComponents(t => t.setContent(`## ✅ An infraction has been voided`))
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t =>
                        t.setContent(
                            `**Original Reason:** ${target.reason}\n` +
                            `**Void Reason:** ${voidReason}\n` +
                            `**Voided By:** ${interaction.user.username}\n` +
                            `**Remaining Active Infractions:** ${remainingActive}`
                        )
                    )
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t => t.setContent(`-# ${new Date().toLocaleString()}`));

                await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
            } catch {}

            return interaction.reply({
                content: `Voided infraction #${number + 1} for <@${user.id}>. They now have **${remainingActive}** active infraction(s).`,
                ephemeral: true
            });
        }

        if (sub === 'history') {
            const user = interaction.options.getUser('user');

            if (!data.infractions[user.id] || data.infractions[user.id].length === 0) {
                return interaction.reply({ content: `<@${user.id}> has no infractions on record.`, ephemeral: true });
            }

            const all = data.infractions[user.id];
            const active = all.filter(i => !i.voided);
            const voided = all.filter(i => i.voided);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## ⚠️ Infractions — <@${user.id}>`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(`**Active:** ${active.length} | **Voided:** ${voided.length} | **Total:** ${all.length}`)
                );

            if (active.length > 0) {
                container
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t => t.setContent(
                        `**Active Infractions:**\n` +
                        active.map((inf, i) =>
                            `**#${i + 1}** — ${inf.reason}\n> By: ${inf.issuedBy} | <t:${Math.floor(new Date(inf.issuedAt).getTime() / 1000)}:D>`
                        ).join('\n\n')
                    ));
            }

            if (voided.length > 0) {
                container
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t => t.setContent(
                        `**Voided Infractions:**\n` +
                        voided.map(inf =>
                            `~~${inf.reason}~~ — voided by ${inf.voidedBy}\n> Void reason: ${inf.voidReason}`
                        ).join('\n\n')
                    ));
            }

            container
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# ${active.length} active | ${voided.length} voided`));

            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }
    }
};