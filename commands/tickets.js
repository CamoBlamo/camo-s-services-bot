const {
    SlashCommandBuilder,
    ContainerBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { readTickets, writeTickets } = require('../utils/ticketManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket system management')
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Send the ticket panels (owner only)')
                .addChannelOption(o => o.setName('main-panel-channel').setDescription('Channel for General Support + Commission Inquiry panel').setRequired(true))
                .addChannelOption(o => o.setName('client-panel-channel').setDescription('Channel for Client Support panel').setRequired(true))
                .addChannelOption(o => o.setName('transcript-channel').setDescription('Channel to save transcripts').setRequired(true))
                .addRoleOption(o => o.setName('staff-role').setDescription('Role that can see all tickets').setRequired(true))
                .addChannelOption(o => o.setName('category').setDescription('Category to create ticket channels under').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('close')
                .setDescription('Close the current ticket')
        )
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a user to the current ticket')
                .addUserOption(o => o.setName('user').setDescription('User to add').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a user from the current ticket')
                .addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('blacklist')
                .setDescription('Blacklist or unblacklist a user from opening tickets')
                .addUserOption(o => o.setName('user').setDescription('User to blacklist/unblacklist').setRequired(true))
                .addStringOption(o => o.setName('reason').setDescription('Reason for blacklist').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('blacklist-list')
                .setDescription('View all blacklisted users')
        )
        .addSubcommand(sub =>
            sub.setName('claim')
                .setDescription('claim the current ticket (staff only)')
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const data = readTickets();

        if (sub === 'setup') {
            if (interaction.user.id !== interaction.guild.ownerId) {
                return interaction.reply({ content: 'Only the server owner can run setup.', ephemeral: true });
            }

            const mainPanelChannel   = interaction.options.getChannel('main-panel-channel');
            const clientPanelChannel = interaction.options.getChannel('client-panel-channel');
            const transcriptChannel  = interaction.options.getChannel('transcript-channel');
            const staffRole          = interaction.options.getRole('staff-role');
            const category           = interaction.options.getChannel('category');

            data.transcriptChannelId  = transcriptChannel.id;
            data.staffRoleId          = staffRole.id;
            data.categoryId           = category.id;

            const mainPanelContainer = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## 🎫 Support Tickets`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(
                        `Need help? Open a ticket below and our team will assist you.\n\n` +
                        `> 🔵 **General Support** — General questions and help\n` +
                        `> 🟣 **Commission Inquiry** — Questions about commissions`
                    )
                )
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# Please only open a ticket if you have a genuine inquiry.`));

            const mainRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_open_general')
                    .setLabel('General Support')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('ticket_open_commission')
                    .setLabel('Commission Inquiry')
                    .setStyle(ButtonStyle.Secondary)
            );

            const clientPanelContainer = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## 🟢 Client Support`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(
                        `Are you an existing client? Open a ticket below for dedicated support.\n\n` +
                        `> 🟢 **Client Support** — Support for existing clients`
                    )
                )
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# Please only open a ticket if you are an existing client.`));

            const clientRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_open_client')
                    .setLabel('Client Support')
                    .setStyle(ButtonStyle.Success)
            );

            const mainMsg = await mainPanelChannel.send({
                components: [mainPanelContainer, mainRow],
                flags: MessageFlags.IsComponentsV2
            });

            const clientMsg = await clientPanelChannel.send({
                components: [clientPanelContainer, clientRow],
                flags: MessageFlags.IsComponentsV2
            });

            data.panelChannelId       = mainPanelChannel.id;
            data.panelMessageId       = mainMsg.id;
            data.clientPanelChannelId = clientPanelChannel.id;
            data.clientPanelMessageId = clientMsg.id;
            writeTickets(data);

            return interaction.reply({ content: '✅ Both ticket panels sent!', ephemeral: true });
        }

        if (sub === 'close') {
            const ticket = Object.values(data.tickets).find(t => t.channelId === interaction.channel.id && t.open);
            if (!ticket) return interaction.reply({ content: 'This is not an open ticket channel.', ephemeral: true });

            const isStaff = interaction.member.roles.cache.has(data.staffRoleId);
            const isOwner = ticket.openedBy === interaction.user.id;
            if (!isStaff && !isOwner) return interaction.reply({ content: 'You do not have permission to close this ticket.', ephemeral: true });

            const confirmContainer = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## 🔒 Close Ticket`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`Are you sure you want to close this ticket? A transcript will be saved.`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# This action cannot be undone.`));

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ticket_confirm_close_${ticket.id}`)
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('ticket_cancel_close')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

            return interaction.reply({ components: [confirmContainer, row], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }

        if (sub === 'add') {
            const ticket = Object.values(data.tickets).find(t => t.channelId === interaction.channel.id && t.open);
            if (!ticket) return interaction.reply({ content: 'This is not an open ticket channel.', ephemeral: true });

            const isStaff = interaction.member.roles.cache.has(data.staffRoleId);
            if (!isStaff) return interaction.reply({ content: 'Only staff can add users to tickets.', ephemeral: true });

            const user = interaction.options.getUser('user');
            await interaction.channel.permissionOverwrites.create(user.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            return interaction.reply({ content: `Added <@${user.id}> to the ticket.` });
        }

        if (sub === 'remove') {
            const ticket = Object.values(data.tickets).find(t => t.channelId === interaction.channel.id && t.open);
            if (!ticket) return interaction.reply({ content: 'This is not an open ticket channel.', ephemeral: true });

            const isStaff = interaction.member.roles.cache.has(data.staffRoleId);
            if (!isStaff) return interaction.reply({ content: 'Only staff can remove users from tickets.', ephemeral: true });

            const user = interaction.options.getUser('user');
            if (user.id === ticket.openedBy) return interaction.reply({ content: 'You cannot remove the ticket opener.', ephemeral: true });

            await interaction.channel.permissionOverwrites.delete(user.id);
            return interaction.reply({ content: `Removed <@${user.id}> from the ticket.` });
        }

        if (sub === 'blacklist') {
            const isStaff = interaction.member.roles.cache.has(data.staffRoleId);
            if (!isStaff && interaction.user.id !== interaction.guild.ownerId) {
                return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            }

            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') ?? 'No reason provided';

            if (!data.blacklist) data.blacklist = {};

            if (data.blacklist[user.id]) {
                delete data.blacklist[user.id];
                writeTickets(data);
                return interaction.reply({ content: `Removed <@${user.id}> from the ticket blacklist.`, ephemeral: true });
            }

            data.blacklist[user.id] = {
                reason,
                blacklistedBy: interaction.user.username,
                blacklistedAt: new Date().toISOString()
            };
            writeTickets(data);

            try {
                const dmContainer = new ContainerBuilder()
                    .addTextDisplayComponents(t => t.setContent(`## 🚫 Ticket Blacklist`))
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t =>
                        t.setContent(
                            `You have been blacklisted from opening tickets.\n\n` +
                            `**Reason:** ${reason}\n` +
                            `**Blacklisted By:** ${interaction.user.username}`
                        )
                    )
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t => t.setContent(`-# If you believe this is a mistake, please contact a staff member.`));

                await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
            } catch {}

            return interaction.reply({ content: `Blacklisted <@${user.id}> from opening tickets. Reason: **${reason}**`, ephemeral: true });
        }

        if (sub === 'blacklist-list') {
            const isStaff = interaction.member.roles.cache.has(data.staffRoleId);
            if (!isStaff && interaction.user.id !== interaction.guild.ownerId) {
                return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            }

            const blacklist = data.blacklist ?? {};
            const entries = Object.entries(blacklist);

            if (entries.length === 0) {
                return interaction.reply({ content: 'No users are currently blacklisted.', ephemeral: true });
            }

            const container = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## 🚫 Ticket Blacklist`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(entries.map(([userId, entry]) =>
                        `> <@${userId}> — ${entry.reason}\n> By: ${entry.blacklistedBy} | <t:${Math.floor(new Date(entry.blacklistedAt).getTime() / 1000)}:D>`
                    ).join('\n\n'))
                )
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# ${entries.length} blacklisted user(s)`));

            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }

        if (sub === 'claim') {
            const ticket = Object.values(data.tickets).find(t => t.channelId === interaction.channel.id && t.open);
            if (!ticket) return interaction.reply({ content: 'This is not an open ticket channel.', ephemeral: true });

            const isStaff = interaction.member.roles.cache.has(data.staffRoleId);
            if (!isStaff) return interaction.reply({ content: 'Only staff can claim tickets.', ephemeral: true });

            if (ticket.claimedBy) {
                return interaction.reply({ content: `This ticket has already been claimed by <@${ticket.claimedBy}>.`, ephemeral: true });
            }

            ticket.claimedBy = interaction.user.id;
            writeTickets(data);

            const claimContainer = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## 🟢 Ticket Claimed`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(
                        `This ticket has been claimed by <@${interaction.user.id}>.\n\n` +
                        `**Claimed By:** <@${interaction.user.id}>`
                    )
                )
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# ${new Date().toLocaleString()}`));

            await interaction.channel.send({ components: [claimContainer], flags: MessageFlags.IsComponentsV2 });
            return interaction.reply({ content: `You have claimed this ticket.`, ephemeral: true });
        }
    }
};