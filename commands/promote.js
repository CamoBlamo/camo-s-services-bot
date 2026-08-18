const {SlashCommandBuilder, ContainerBuilder, MessageFlags} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('promote')
        .setDescription('promote a staff member.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to promote')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('role')
                .setDescription('The role to promote the user to')
                .setRequired(true)
                .addChoices(
                    { name: 'Employee', value: 'employee' },
                    { name: 'Manager', value: 'manager' },
                    { name: 'Co-Owner', value: 'co-owner' }
                )
        ),
    async execute(interaction) {
        const allowed = interaction.member.roles.cache.some(r => r.name === 'temp');
        if (!allowed) return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });

        const user = interaction.options.getUser('user');
        const role = interaction.options.getString('role');

        const member = await interaction.guild.members.fetch(user.id);
        if (!member) {
            return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
        }

        let roleToAdd;
        switch (role) {
            case 'employee':
                roleToAdd = interaction.guild.roles.cache.find(r => r.name === 'Employee');
                break;
            case 'manager':
                roleToAdd = interaction.guild.roles.cache.find(r => r.name === 'Manager');
                break;
            case 'co-owner':
                roleToAdd = interaction.guild.roles.cache.find(r => r.name === 'Executive');
                break;
            default:
                return interaction.reply({ content: 'Invalid role.', ephemeral: true });
        }

        if (!roleToAdd) {
            return interaction.reply({ content: 'Role not found.', ephemeral: true });
        }

        await member.roles.add(roleToAdd);

        const promoteContainer = new ContainerBuilder()
            .addTextDisplayComponents((t) =>
                t.setContent(`## Promotion — ${user.username}`)
            )
            .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((t) =>
                t.setContent(`**New Role:** ${roleToAdd.name}`)
            )
            .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((t) =>
                t.setContent("Congratulations on your promotion! We appreciate your hard work and dedication. Keep up the great work!")
            )
            .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((t) =>
                t.setContent(`-# Promoted by <@${interaction.user.id}> • ${new Date().toLocaleString()}`)
            );


        await interaction.channel.send({
            components: [promoteContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
};