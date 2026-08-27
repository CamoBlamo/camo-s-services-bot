const {
    SlashCommandBuilder,
    ContainerBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    MessageFlags
 } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('group')
        .setDescription('View information about the ROBLOX group'),
    
    async execute(interaction) {
        const GROUP_ID = '35039915' // change this to your group id
        const FOOTER_IMAGE_LINK = 'https://yumi.onl/api/files/6a7a8632c797709683b672a4/raw' // change this to your banner

       if (!GROUP_ID) {
        return interaction.reply({
            content: 'GROUP_ID is not set, please check the command file.',
            flags: MessageFlags.Ephemeral
        })
       }
       
       await interaction.deferReply()

       const res = await fetch(`https://groups.roblox.com/v1/groups/${GROUP_ID}`)

       if (!res.ok) {
        return interaction.editReply({
            content: `Couldn't fetch group ${GROUP_ID} (status ${res.status})`
        })
       }

       const group = await res.json()
       const groupUrl = `https://www.roblox.com/groups/${group.id}/${encodeURIComponent(group.name.replace(/\s+/g, '-'))}`

       const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## [${group.name}](${groupUrl})`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Large)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Members:** ${group.memberCount?.toLocaleString() ?? 'Unknown'}`),
                new TextDisplayBuilder().setContent(`**Group Owner:** ${group.owner?.username ?? 'None'}`),
                new TextDisplayBuilder().setContent(group.shout?.body ? `**Shout:** ${group.shout.body}` : 'No current shout.')
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Large)
            )
            .addMediaGalleryComponents(gallery => 
                gallery.addItems(item => item.setURL(FOOTER_IMAGE_LINK))
            )

            await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            })
    }
}