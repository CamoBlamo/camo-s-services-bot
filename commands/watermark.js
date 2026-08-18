const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    MediaGalleryBuilder,
    AttachmentBuilder
} = require('discord.js');
const sharp = require('sharp');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('watermark')
        .setDescription('Add a watermark to an image')
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('The image to add a watermark to')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('watermark-text')
                .setDescription('The text to use as the watermark')
                .setRequired(true)
        ),
    async execute(interaction) {
        const image = interaction.options.getAttachment('image');
        const watermarkText = interaction.options.getString('watermark-text');

        if (!image.contentType?.startsWith('image/')) {
            return interaction.reply({
                content: 'That attachment isn\'t a valid image.',
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply();

        try {
            const res = await fetch(image.url);
            const inputBuffer = Buffer.from(await res.arrayBuffer());

            const metadata = await sharp(inputBuffer).metadata();
            const width = metadata.width ?? 800;
            const height = metadata.height ?? 800;

            const fontSize = Math.max(16, Math.floor(width / 22));
            const escapedText = watermarkText
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');

            // Diagonal tiled watermark + a bottom-right brand stamp
            const svg = `
                <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                    <style>
                        .tile {
                            fill: rgba(255,255,255,0.18);
                            font-size: ${fontSize}px;
                            font-family: sans-serif;
                            font-weight: bold;
                        }
                        .stamp {
                            fill: rgba(255,255,255,0.85);
                            font-size: ${Math.max(14, Math.floor(fontSize * 0.6))}px;
                            font-family: sans-serif;
                            font-weight: bold;
                        }
                    </style>
                    <g transform="rotate(-30 ${width / 2} ${height / 2})">
                        ${Array.from({ length: 6 }).map((_, row) =>
                            Array.from({ length: 4 }).map((_, col) => {
                                const x = (col * width) / 3.2;
                                const y = (row * height) / 4.5;
                                return `<text x="${x}" y="${y}" class="tile">${escapedText}</text>`;
                            }).join('')
                        ).join('')}
                    </g>
                    <text
                        x="${width - 12}"
                        y="${height - 12}"
                        text-anchor="end"
                        class="stamp"
                        stroke="rgba(0,0,0,0.6)"
                        stroke-width="0.5"
                    >Camo's Services</text>
                </svg>
            `;

            const watermarkedBuffer = await sharp(inputBuffer)
                .composite([{ input: Buffer.from(svg), gravity: 'center' }])
                .png()
                .toBuffer();

            const attachment = new AttachmentBuilder(watermarkedBuffer, { name: 'watermarked.png' });

            const watermarkContainer = new ContainerBuilder()
                .addTextDisplayComponents((t) =>
                    t.setContent(`## Watermark Added — Camo's Services`)
                )
                .addSeparatorComponents((s) => s)
                .addTextDisplayComponents((t) =>
                    t.setContent(`**Watermark Text:** ${watermarkText}`)
                )
                .addMediaGalleryComponents((gallery) =>
                    gallery.addItems((item) =>
                        item.setURL('attachment://watermarked.png')
                    )
                )
                .addSeparatorComponents((s) => s)
                .addTextDisplayComponents((t) =>
                    t.setContent(`-# Processed by <@${interaction.user.id}> • ${new Date().toLocaleString()}`)
                );

            await interaction.editReply({
                components: [watermarkContainer],
                files: [attachment],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (err) {
            console.error('Watermark error:', err);
            await interaction.editReply({
                content: 'Something went wrong processing that image.'
            });
        }
    }
};