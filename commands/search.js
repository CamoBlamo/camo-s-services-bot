const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags } = require('discord.js')


module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('look up a roblox user')
        .addStringOption(o => 
            o
                .setName('user')
                .setDescription('the roblox username to look up')
                .setRequired(true)
                .setMaxLength(20)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        const username = interaction.options.getString('user').trim()

        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            return interaction.editReply({
                content: 'Invalid ROBLOX Username, usernames are 3-20 characters (letters, numbers, and underscores only)'
            })
        }

        let match
        try {
            const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
            })

            if (!userRes.ok) {
                return interaction.editReply({
                    content: `ROBLOX's API returned a error. (status ${userRes.status}) Please try again.`
                })
            }

            const userData = await userRes.json();
            match = userData.data?.[0]
        } catch (err) {
            console.error(`[search] username lookup failed`, err)
            return interaction.editReply({
                content: 'Couldn\'t reach robloxs API. try again shortly'
            })
        }

        if (!match) {
            return interaction.editReply({
                content: `no roblox user found for **${username}**`
            })
        }

        let profile
        try {
            const profileRes = await fetch(`https://users.roblox.com/v1/users/${match.id}`)
            if (!profileRes.ok) {
                return interaction.editReply({
                    content: `found the user but could not load their profile. (status ${profileRes.status})`
                })
            }
            profile = await profileRes.json()
        } catch (err) {
            console.error('[search] profile lookup failed', err)
            return interaction.editReply({
                content: 'could not load that users profile, please try again later.'
            })
        }

        

        let avatarUrl = 'https://via.placeholder.com/150?text=No+Avatar'
        try {
            const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${match.id}&size=150x150&format=Png&isCircular=false`)
            if (thumbRes.ok) {
                const thumbData = await thumbRes.json()

                if (thumbData.data?.[0]?.state === 'Completed') {
                    avatarUrl = thumbData.data[0].imageUrl
                }
            }
        } catch (err) {
            console.error('[search] avatar lookup failed (non-fatal)', err)
        }

        const unixTs = Math.floor(new Date(profile.created).getTime() / 1000)
        const bannedNote = profile.isBanned ? '\n **this account is banned/terminated.**' : ''

        const infoSection = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### Roblox Information\n` +
                    `**Username:** [${match.name} (${match.displayName})](https://www.roblox.com/users/${match.id}/profile)\n` +
                    `**User ID:** ${match.id}\n` +
                    `**Description:** ${profile.description?.trim() || 'No Description Provided'}\n` +
                    `**Created:** <t:${unixTs}:F>${bannedNote}`
                )
            )
            .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(avatarUrl)
            )

        const banner = new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL('https://yumi.onl/api/files/6a7a8632c797709683b672a4/raw')
        )

        const container = new ContainerBuilder()
            .addSectionComponents(infoSection)
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Large)
            )
            .addMediaGalleryComponents(banner)

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        })
    }
}