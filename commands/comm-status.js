const { SlashCommandBuilder, MessageFlags, ContainerBuilder, PermissionFlagsBits } = require("discord.js");

const COMMS_CHANNEL_ID = "1517658474106978445";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("comm-status")
        .setDescription("change status of my commission")
        .addStringOption(option =>
            option.setName("status")
                .setDescription("The new status of your commission")
                .setRequired(true)
                .addChoices(
                    { name: "open", value: "open" },
                    { name: "closed", value: "closed" }
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    async execute(interaction) {
        const status = interaction.options.getString("status");
        const newChannelName = status === "open" ? "comms-open" : "comms-closed";

        await interaction.deferReply();

        try {
            const channel = await interaction.client.channels.fetch(COMMS_CHANNEL_ID);
            await channel.setName(newChannelName);
        } catch (err) {
            console.error("Failed to rename comms channel:", err);
            return interaction.editReply({
                content: "Status was not updated — failed to rename the channel. Check bot permissions or Discord's rename rate limit (2 renames per 10 min per channel).",
            });
        }

        const commStatusContainer = new ContainerBuilder()
            .addTextDisplayComponents((t) =>
                t.setContent(`## Commission Status Updated`)
            )
            .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((t) =>
                t.setContent(`**New Status:** ${status}`)
            )
            .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((t) =>
                t.setContent(`-# Updated by <@${interaction.user.id}> • ${new Date().toLocaleString()}`)
            );

        await interaction.editReply({
            components: [commStatusContainer],
            flags: MessageFlags.IsComponentsV2, ephemeral: true
        });
    }
};