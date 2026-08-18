const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');

const IS_COMPONENTS_V2 = 1 << 15;
const SUPPRESS_EMBEDS = 1 << 2;
const SUPPRESS_NOTIFICATIONS = 1 << 12;
const ALLOWED_FLAG_MASK = IS_COMPONENTS_V2 | SUPPRESS_EMBEDS | SUPPRESS_NOTIFICATIONS;

const MODAL_PREFIX = 'raw-container';

function parsePayload(raw) {
  let cleaned = raw.trim();

  
  const braceIndex = cleaned.indexOf('{');
  if (braceIndex > 0) cleaned = cleaned.slice(braceIndex);

  let payload;
  try {
    payload = JSON.parse(cleaned);
  } catch {
    throw new Error('That is not valid JSON. Double-check brackets, quotes, and commas.');
  }

  if (!payload.components || !Array.isArray(payload.components) || payload.components.length === 0) {
    throw new Error('JSON must include a non-empty "components" array.');
  }

  const userFlags = typeof payload.flags === 'number' ? payload.flags : 0;
  const flags = (userFlags & ALLOWED_FLAG_MASK) | IS_COMPONENTS_V2;

  return { components: payload.components, flags };
}

async function sendContainer({ raw, channel, respond }) {
  let payload;
  try {
    payload = parsePayload(raw);
  } catch (err) {
    return respond({ content: err.message, flags: MessageFlags.Ephemeral });
  }

  try {
    await channel.send({
      components: payload.components,
      flags: payload.flags,
      allowedMentions: { parse: [] },
    });
    return respond({
      content: `Successfully sent raw components message to ${channel}.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    console.error('[raw-container] Discord rejected the payload:', err);
    return respond({
      content: `Discord rejected that payload: \`${err.message}\``,
      flags: MessageFlags.Ephemeral,
    });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raw-container')
    .setDescription('Convert raw Components V2 JSON into a sent message')
    .addAttachmentOption((option) =>
      option
        .setName('file')
        .setDescription('A .json/.txt file containing the raw payload')
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('Channel to send to (defaults to this channel)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const targetChannel = interaction.options.getChannel('channel') ?? interaction.channel;
    const fileOption = interaction.options.getAttachment('file');

    if (!targetChannel?.isTextBased()) {
      return interaction.reply({
        content: 'That channel is not a text channel I can send messages to.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const botPerms = targetChannel.permissionsFor(interaction.client.user);
    if (!botPerms?.has(PermissionFlagsBits.SendMessages)) {
      return interaction.reply({
        content: `I don't have permission to send messages in ${targetChannel}.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // File attachment provided
    if (fileOption) {
      if (fileOption.size > 512_000) {
        return interaction.reply({
          content: 'That file is too large (max 500KB).',
          flags: MessageFlags.Ephemeral,
        });
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        const res = await fetch(fileOption.url);
        const raw = await res.text();
        return sendContainer({
          raw,
          channel: targetChannel,
          respond: (opts) => interaction.editReply(opts),
        });
      } catch (err) {
        console.error('[raw-container] Failed to fetch attachment:', err);
        return interaction.editReply({ content: 'Failed to download that file.' });
      }
    }

    // Neither provided — open a paste box.
    // Channel is encoded into the modal customId since modal submit is a
    // separate interaction with no access to the original command options.
    const modal = new ModalBuilder()
      .setCustomId(`${MODAL_PREFIX}:${targetChannel.id}`)
      .setTitle('Raw Components V2 JSON');

    const jsonInput = new TextInputBuilder()
      .setCustomId('json')
      .setLabel('Paste the raw JSON payload')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('{ "flags": 32768, "components": [ ... ] }')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(jsonInput));
    return interaction.showModal(modal);
  },


  async handleModalSubmit(interaction) {
    const channelId = interaction.customId.split(':')[1];
    const targetChannel =
      interaction.guild.channels.cache.get(channelId) ?? interaction.channel;
    const raw = interaction.fields.getTextInputValue('json');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    return sendContainer({
      raw,
      channel: targetChannel,
      respond: (opts) => interaction.editReply(opts),
    });
  },
};