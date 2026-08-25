require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const {
    Client,
    Collection,
    GatewayIntentBits,
    Events,
    REST,
    Routes,
    ContainerBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits,
    AttachmentBuilder,
    ActivityType
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});
client.commands = new Collection();

const commandsArrayForDiscord = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const suggestCommand = require('./commands/suggest');
const reportCommand = require('./commands/game-report');
const { handleNotificationsSelect } = require('./commands/notification')
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsArrayForDiscord.push(command.data.toJSON());
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing required properties.`);
    }
}

client.once(Events.ClientReady, async readyClient => {
    console.log(`Logged in as ${readyClient.user.tag}!`);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log(`Syncing ${commandsArrayForDiscord.length} commands...`);
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commandsArrayForDiscord }
        );
        console.log('Commands synced. Bot ready.');
    } catch (error) {
        console.error('Failed to sync commands:', error);
    }

    client.user.setPresence({
        status: 'do-not-disturb',
        activities: [{
            name: 'over the server',
            type: ActivityType.Watching
        }]
    });


    setInterval(async () => {
        const { readLoa, writeLoa } = require('./utils/loaManager');
        const loaData = readLoa();
        const now = new Date();
        let changed = false;

        for (const [userId, loa] of Object.entries(loaData.active)) {
            if (new Date(loa.returnDate) <= now) {
    
                loaData.history.push({
                    ...loa,
                    status: 'expired',
                    endedBy: 'System',
                    endedAt: new Date().toISOString()
                });
                delete loaData.active[userId];
                changed = true;

                const guild = client.guilds.cache.first();
                const logChannel = guild?.channels.cache.find(c => c.name === 'loa-logs');
                if (logChannel) {
                    const expireContainer = new ContainerBuilder()
                        .addTextDisplayComponents(t => t.setContent(`## 🔄 LOA Expired`))
                        .addSeparatorComponents(s => s)
                        .addTextDisplayComponents(t =>
                            t.setContent(
                                `**Staff Member:** <@${userId}>\n` +
                                `**Status:** LOA has expired and been automatically ended.`
                            )
                        )
                        .addSeparatorComponents(s => s)
                        .addTextDisplayComponents(t => t.setContent(`-# ${new Date().toLocaleString()}`));

                    await logChannel.send({ components: [expireContainer], flags: MessageFlags.IsComponentsV2 });
                }

                
                try {
                    const user = await client.users.fetch(userId);
                    const dmContainer = new ContainerBuilder()
                        .addTextDisplayComponents(t => t.setContent(`## 🔄 Your LOA has ended`))
                        .addSeparatorComponents(s => s)
                        .addTextDisplayComponents(t =>
                            t.setContent(`Your leave of absence has expired and you are now marked as active again.`)
                        );
                    await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
                } catch {}
            }
        }

        if (changed) writeLoa(loaData);
    }, 60 * 60 * 1000);
});

client.on(Events.InteractionCreate, async interaction => {

   
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            const msg = { content: 'There was an error executing this command.', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(msg);
            } else {
                await interaction.reply(msg);
            }
        }
        return;
    }

    
    if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) {
        return;
    }

    // report system
    if (interaction.customId?.startsWith('report:')) {
        return reportCommand.handleComponent(interaction);
    }

    
    if (interaction.customId?.startsWith('raw-container:')) {
        const command = client.commands.get('raw-container');
        return command.handleModalSubmit(interaction);
    }

   if (interaction.isStringSelectMenu() && interaction.customId === 'notifications_select') {
        return handleNotificationsSelect(interaction)
   }

    //ticket and loa system
    const isTicketOrLoa =
        interaction.customId?.startsWith('ticket_') || interaction.customId?.startsWith('loa_');

    if (isTicketOrLoa) {
        const { readTickets, writeTickets } = require('./utils/ticketManager');
        const { readLoa, writeLoa } = require('./utils/loaManager');

        const typeLabels = {
            general: '🔵 General Support',
            commission: '🟣 Commission Inquiry',
            client: '🟢 Client Support'
        };

        //loa approve
        if (interaction.customId.startsWith('loa_approve_')) {
            const allowed = interaction.member.roles.cache.some(r => r.name === 'temp');
            if (!allowed) return interaction.reply({ content: 'You do not have permission to do this.', ephemeral: true });

            const parts = interaction.customId.replace('loa_approve_', '').split('_');
            const userId = parts[0];
            const duration = parts[1];

            const loaData = readLoa();
            const request = loaData.requests[userId];

            if (!request) return interaction.reply({ content: 'That request no longer exists.', ephemeral: true });

            const returnDate = new Date(request.returnDate);

            loaData.active[userId] = {
                ...request,
                approvedBy: interaction.user.username,
                approvedAt: new Date().toISOString()
            };
            delete loaData.requests[userId];
            writeLoa(loaData);

            const updatedContainer = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## ✅ LOA Approved`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(
                        `**Staff Member:** <@${userId}>\n` +
                        `**Return Date:** <t:${Math.floor(returnDate.getTime() / 1000)}:D>\n` +
                        `**Approved By:** ${interaction.user.username}`
                    )
                )
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# Approved: ${new Date().toLocaleString()}`));

            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('loa_done').setLabel('✅ Approved').setStyle(ButtonStyle.Success).setDisabled(true)
            );

            await interaction.update({ components: [updatedContainer, disabledRow], flags: MessageFlags.IsComponentsV2 });

            const logChannel = interaction.guild.channels.cache.find(c => c.name === 'loa-logs');
            if (logChannel) {
                const logContainer = new ContainerBuilder()
                    .addTextDisplayComponents(t => t.setContent(`## ✅ LOA Approved`))
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t =>
                        t.setContent(
                            `**Staff Member:** <@${userId}>\n` +
                            `**Return Date:** <t:${Math.floor(returnDate.getTime() / 1000)}:D>\n` +
                            `**Approved By:** ${interaction.user.username}`
                        )
                    )
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t => t.setContent(`-# ${new Date().toLocaleString()}`));

                await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
            }

            try {
                const user = await interaction.client.users.fetch(userId);
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
        }

        // loa deny
        else if (interaction.customId.startsWith('loa_deny_')) {
            const allowed = interaction.member.roles.cache.some(r => r.name === 'temp');
            if (!allowed) return interaction.reply({ content: 'You do not have permission to do this.', ephemeral: true });

            const userId = interaction.customId.replace('loa_deny_', '');

            const loaData = readLoa();
            const request = loaData.requests[userId];

            if (!request) return interaction.reply({ content: 'That request no longer exists.', ephemeral: true });

            loaData.history.push({
                ...request,
                status: 'denied',
                actionedBy: interaction.user.username,
                actionedAt: new Date().toISOString()
            });
            delete loaData.requests[userId];
            writeLoa(loaData);

            const updatedContainer = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## ❌ LOA Denied`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(
                        `**Staff Member:** <@${userId}>\n` +
                        `**Denied By:** ${interaction.user.username}`
                    )
                )
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# Denied: ${new Date().toLocaleString()}`));

            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('loa_done').setLabel('❌ Denied').setStyle(ButtonStyle.Danger).setDisabled(true)
            );

            await interaction.update({ components: [updatedContainer, disabledRow], flags: MessageFlags.IsComponentsV2 });

            const logChannel = interaction.guild.channels.cache.find(c => c.name === 'loa-logs');
            if (logChannel) {
                const logContainer = new ContainerBuilder()
                    .addTextDisplayComponents(t => t.setContent(`## ❌ LOA Denied`))
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t =>
                        t.setContent(
                            `**Staff Member:** <@${userId}>\n` +
                            `**Denied By:** ${interaction.user.username}`
                        )
                    )
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t => t.setContent(`-# ${new Date().toLocaleString()}`));

                await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
            }

            try {
                const user = await interaction.client.users.fetch(userId);
                await user.send({ content: `Your LOA request was **denied** by **${interaction.user.username}**.` });
            } catch {}
        }

        // ticket open
        else if (interaction.customId.startsWith('ticket_open_')) {
            const type = interaction.customId.replace('ticket_open_', '');
            const data = readTickets();

            if (data.blacklist?.[interaction.user.id]) {
                const entry = data.blacklist[interaction.user.id];
                const blacklistContainer = new ContainerBuilder()
                    .addTextDisplayComponents(t => t.setContent(`## 🚫 You are blacklisted`))
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t =>
                        t.setContent(
                            `You are blacklisted from opening tickets and cannot create one.\n\n` +
                            `**Reason:** ${entry.reason}\n` +
                            `**Blacklisted By:** ${entry.blacklistedBy}`
                        )
                    )
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t => t.setContent(`-# If you believe this is a mistake, please contact a staff member.`));

                return interaction.reply({ components: [blacklistContainer], flags: MessageFlags.IsComponentsV2, ephemeral: true });
            }

            const existing = Object.values(data.tickets).find(
                t => t.openedBy === interaction.user.id && t.open
            );
            if (existing) {
                return interaction.reply({
                    content: `You already have an open ticket: <#${existing.channelId}>`,
                    ephemeral: true
                });
            }

            data.ticketCount += 1;
            const ticketId = `ticket-${String(data.ticketCount).padStart(4, '0')}`;

            const channel = await interaction.guild.channels.create({
                name: ticketId,
                type: ChannelType.GuildText,
                parent: data.categoryId,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    },
                    {
                        id: data.staffRoleId,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageMessages
                        ]
                    }
                ]
            });

            data.tickets[ticketId] = {
                id: ticketId,
                channelId: channel.id,
                openedBy: interaction.user.id,
                type,
                open: true,
                openedAt: new Date().toISOString()
            };
            writeTickets(data);

            const welcomeContainer = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## 🎫 ${typeLabels[type]}`))
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t =>
                    t.setContent(
                        `Welcome <@${interaction.user.id}>! A member of our team will be with you shortly.\n\n` +
                        `**Ticket ID:** ${ticketId}\n` +
                        `**Category:** ${typeLabels[type]}\n` +
                        `**Opened:** <t:${Math.floor(Date.now() / 1000)}:R>`
                    )
                )
                .addSeparatorComponents(s => s)
                .addTextDisplayComponents(t => t.setContent(`-# Please describe your issue in as much detail as possible.`));

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ticket_confirm_close_${ticketId}`)
                    .setLabel('🔒 Close Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

            await channel.send({
                components: [welcomeContainer, closeRow],
                flags: MessageFlags.IsComponentsV2
            });

            return interaction.reply({
                content: `Your ticket has been opened: <#${channel.id}>`,
                ephemeral: true
            });
        }

        /// ticket confirm close
        else if (interaction.customId.startsWith('ticket_confirm_close_')) {
            const ticketId = interaction.customId.replace('ticket_confirm_close_', '');
            const data = readTickets();
            const ticket = data.tickets[ticketId];

            if (!ticket) return interaction.reply({ content: 'Ticket not found.', ephemeral: true });

            const isStaff = interaction.member.roles.cache.has(data.staffRoleId);
            const isOwner = ticket.openedBy === interaction.user.id;
            if (!isStaff && !isOwner) return interaction.reply({ content: 'You do not have permission to close this ticket.', ephemeral: true });

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const channel = interaction.channel;
            const messages = await channel.messages.fetch({ limit: 100 });
            const sorted = [...messages.values()].reverse();

            const transcriptLines = sorted.map(m =>
                `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content || '[attachment/embed]'}`
            ).join('\n');

            const transcriptChannel = await interaction.client.channels.fetch(data.transcriptChannelId).catch(() => null);

            if (transcriptChannel) {
                const buffer = Buffer.from(transcriptLines, 'utf-8');
                const attachment = new AttachmentBuilder(buffer, { name: `${ticketId}-transcript.txt` });

                const transcriptContainer = new ContainerBuilder()
                    .addTextDisplayComponents(t => t.setContent(`## 📄 Ticket Transcript`))
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t =>
                        t.setContent(
                            `**Ticket ID:** ${ticketId}\n` +
                            `**Opened By:** <@${ticket.openedBy}>\n` +
                            `**Category:** ${typeLabels[ticket.type]}\n` +
                            `**Closed By:** ${interaction.user.username}\n` +
                            `**Opened:** <t:${Math.floor(new Date(ticket.openedAt).getTime() / 1000)}:D>\n` +
                            `**Closed:** <t:${Math.floor(Date.now() / 1000)}:D>`
                        )
                    )
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t => t.setContent(`-# Transcript attached below.`));

                await transcriptChannel.send({
                    components: [transcriptContainer],
                    flags: MessageFlags.IsComponentsV2
                });

                await transcriptChannel.send({ files: [attachment] });

                try {
                    const opener = await interaction.client.users.fetch(ticket.openedBy);
                    await opener.send({
                        content: `Your ticket **${ticketId}** has been closed. Here is your transcript:`,
                        files: [new AttachmentBuilder(Buffer.from(transcriptLines, 'utf-8'), { name: `${ticketId}-transcript.txt` })]
                    });
                } catch {}
            }

            ticket.open = false;
            ticket.closedAt = new Date().toISOString();
            ticket.closedBy = interaction.user.username;
            writeTickets(data);

            await interaction.editReply({ content: 'Ticket closed. Deleting channel in 5 seconds...' });
            setTimeout(() => channel.delete().catch(() => null), 5000);
        }

        //ticket cancel close
        else if (interaction.customId === 'ticket_cancel_close') {
            return interaction.reply({ content: 'Ticket close cancelled.', ephemeral: true });
        }

        return;
    }

    
    return suggestCommand.handleInteraction(interaction);
});

client.login(process.env.DISCORD_TOKEN);