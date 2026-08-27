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
        .setName('game-stats')
        .setDescription('view the stats of a game'),

    async execute(interaction) {
        const PLACE_ID = '4637668954' //change to your place Id
        const FOOTER_IMAGE_LINK = 'https://yumi.onl/api/files/6a7a8632c797709683b672a4/raw' //change to the image you want as your footer

        if (!PLACE_ID) {
            return interaction.reply({
                content: `PLACE_ID is not set in game-stats.js`,
                flags: MessageFlags.Ephemeral
            })
        }

        await interaction.deferReply()

        const universeRes = await fetch(`https://apis.roblox.com/universes/v1/places/${PLACE_ID}/universe`)
        if (!universeRes.ok) {
            return interaction.editReply({
                content: `Couldn't resolve ${PLACE_ID} to a universe (status ${universeRes.status})`
            })
        }
        const { universeId } = await universeRes.json()

        // core game status
        const gameRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`)
        if (!gameRes.ok) {
            return interaction.editReply({
                content: `couldn't fetch game stats for universe ${universeId}`
            })
        }
        const gameJson = await gameRes.json()
        const game = gameJson.data?.[0]
        if (!game) {
            return interaction.editReply({
                content: `no game found for universe ${universeId}`
            })
        }

        //votes
        let upVotes = null
        let downVotes = null
        const voteRes = await fetch(`https://games.roblox.com/v1/games/votes?universeIds=${universeId}`)
        if (voteRes.ok) {
            const votesJson = await voteRes.json()
            const votes = votesJson.data?.[0]
            if (votes) {
                upVotes = votes.upVotes,
                downVotes = votes.downVotes
            }
        }

        const gameUrl = `https://www.roblox.com/games/${PLACE_ID}/${encodeURIComponent(game.name.replace(/\s+/g, '-'))}`
        const created = new Date(game.created)
        const updated = new Date(game.updated)

        let voteLine = '**Rating:** Unknown'
        if (upVotes !== null && downVotes !== null) {
            const total = upVotes + downVotes
            const percent = total > 0 ? Math.round((upVotes / total) * 100) : 0
            voteLine = `**Rating:** ${percent}% (👍 ${upVotes.toLocaleString()} / 👎 ${downVotes.toLocaleString()})`
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## [${game.name}](${gameUrl})`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Large)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Playing now:** ${game.playing?.toLocaleString() ?? 'Unknown'}`),
                new TextDisplayBuilder().setContent(`**Total Visits:** ${game.visits?.toLocaleString() ?? 'Unknown'}`),
                new TextDisplayBuilder().setContent(`**Favorites:** ${game.favoritedCount?.toLocaleString() ?? 'Unknown'}`),
                new TextDisplayBuilder().setContent(`**Max players:** ${game.maxPlayers ?? 'Unknown'}`),
                new TextDisplayBuilder().setContent(`${voteLine}`),
                new TextDisplayBuilder().setContent(`**Created:** <t:${Math.floor(created.getTime() / 1000)}:D>`),
                new TextDisplayBuilder().setContent(`**Last updated:** <t:${Math.floor(updated.getTime() / 1000)}:R>`)
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