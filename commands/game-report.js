const {
	SlashCommandBuilder,
	PermissionFlagsBits,
	ChannelType,
	MessageFlags,
	ContainerBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ModalBuilder,
	LabelBuilder,
	TextInputBuilder,
	TextInputStyle,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	FileUploadBuilder,
	AttachmentBuilder,
} = require("discord.js");

//config
const reports = new Map();

const STAFF_ROLE_ID = "your role id here";
const ACCENT_COLOR = 0x2ecc71; // green, can be remove by removing .setAccent lines and this one

const PUNISHMENTS = [
	{ code: "RDM", label: "Random Death Match" },
	{ code: "VDM", label: "Vehicle Death Match" },
	{ code: "NLR", label: "New Life Rule" },
	{ code: "FRP", label: "Fail Roleplay" },
	{ code: "NITRP", label: "No Intent To Roleplay" },
	{ code: "AJ", label: "Auto Jail" },
	{ code: "SRDM", label: "Staff Random Death Match" },
	{ code: "SVDM", label: "Staff Vehicle Death Match" },
	{ code: "GTAD", label: "GTA Driving" },
	{ code: "LTS", label: "Lying To Staff" },
];

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const isStaff = (interaction) => interaction.member.roles.cache.has(STAFF_ROLE_ID);


const data = new SlashCommandBuilder()
	.setName("report-panel")
	.setDescription("Post the game report panel in this channel")
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

async function execute(interaction) {
	const panel = new ContainerBuilder()
		.setAccentColor(ACCENT_COLOR)
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				"# Game Reports\nSubmit a report or proof when being RDMed or VDMed in a roleplay without proper reason. Choose the punishment(s) that apply and attach your proof below.",
			),
		)
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId("report:panel:submit")
					.setLabel("Submit report")
					.setEmoji("📝")
					.setStyle(ButtonStyle.Success),
				new ButtonBuilder()
					.setCustomId("report:panel:punishments")
					.setLabel("Punishments")
					.setEmoji("📗")
					.setStyle(ButtonStyle.Secondary),
			),
		);

	await interaction.reply({
		components: [panel],
		flags: MessageFlags.IsComponentsV2,
	});
}


async function handleComponent(interaction) {
	const id = interaction.customId;

	try {
		if (id === "report:panel:submit") return await showReportModal(interaction);
		if (id === "report:panel:punishments") return await showPunishmentsInfo(interaction);
		if (id === "report:modal") return await handleModalSubmit(interaction);

		const [, action, reportId] = id.split(":");
		if (action === "accept") return await handleAccept(interaction, reportId);
		if (action === "reject") return await handleReject(interaction, reportId);
		if (action === "handle") return await handleClaim(interaction, reportId);
	} catch (error) {
		console.error(`[game-report] Unhandled error for customId "${id}":`, error);
		const payload = { content: "❌ Something went wrong handling that. Check the bot logs.", flags: MessageFlags.Ephemeral };
		if (interaction.deferred || interaction.replied) {
			await interaction.followUp(payload).catch(() => {});
		} else {
			await interaction.reply(payload).catch(() => {});
		}
	}
}

async function showPunishmentsInfo(interaction) {
	const list = PUNISHMENTS.map((p) => `**${p.code}** — ${p.label}`).join("\n");
	await interaction.reply({
		content: `**Punishment types**\n${list}`,
		flags: MessageFlags.Ephemeral,
	});
}

async function showReportModal(interaction) {
	const modal = new ModalBuilder().setCustomId("report:modal").setTitle("Report Form");

	const usernameInput = new TextInputBuilder()
		.setCustomId("roblox_username")
		.setStyle(TextInputStyle.Short)
		.setPlaceholder("The Roblox username of the person you are reporting")
		.setMaxLength(20)
		.setRequired(true);

	const usernameLabel = new LabelBuilder()
		.setLabel("Roblox Username")
		.setDescription("The roblox username of the person you are reporting")
		.setTextInputComponent(usernameInput);

	const punishmentSelect = new StringSelectMenuBuilder()
		.setCustomId("punishments")
		.setPlaceholder("Select the punishments")
		.setRequired(true)
		.setMinValues(1)
		.setMaxValues(PUNISHMENTS.length)
		.addOptions(
			PUNISHMENTS.map((p) =>
				new StringSelectMenuOptionBuilder().setLabel(p.code).setDescription(p.label).setValue(p.code),
			),
		);

	const punishmentLabel = new LabelBuilder()
		.setLabel("Punishment(s)")
		.setDescription("Select the punishments that you are reporting them for")
		.setStringSelectMenuComponent(punishmentSelect);

	const proofUpload = new FileUploadBuilder().setCustomId("proof").setMinValues(1).setMaxValues(1).setRequired(true);

	const proofLabel = new LabelBuilder()
		.setLabel("Proof")
		.setDescription("Screenshot or clip proving the report")
		.setFileUploadComponent(proofUpload);

	modal.addLabelComponents(usernameLabel, punishmentLabel, proofLabel);

	await interaction.showModal(modal);
}

async function handleModalSubmit(interaction) {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	try {
		const robloxUsername = interaction.fields.getTextInputValue("roblox_username");
		const punishments = interaction.fields.getStringSelectValues("punishments");
		const uploadedFiles = interaction.fields.getUploadedFiles("proof");
		const proofFile = uploadedFiles?.first ? uploadedFiles.first() : uploadedFiles?.[0];
		if (!proofFile?.url) {
			throw new Error("No proof file was found on the submission.");
		}

		const proofResponse = await fetch(proofFile.url);
		if (!proofResponse.ok) {
			throw new Error(`Failed to download proof file: ${proofResponse.status} ${proofResponse.statusText}`);
		}
		const proofBuffer = Buffer.from(await proofResponse.arrayBuffer());
		const proofFilename = proofFile.name ?? "proof.png";
		const proofAttachment = new AttachmentBuilder(proofBuffer, { name: proofFilename });

		const reportId = genId();
		reports.set(reportId, {
			reporterId: interaction.user.id,
			robloxUsername,
			punishments,
			proofUrl: `attachment://${proofFilename}`,
			status: "pending",
			handlerId: null,
			threadId: null,
		});

		const thread = await interaction.channel.threads.create({
			name: `Conversation - ${interaction.user.username}`,
			type: ChannelType.PrivateThread,
			invitable: false,
			reason: `Report submitted by ${interaction.user.tag}`,
		});
		await thread.members.add(interaction.user.id);
		reports.get(reportId).threadId = thread.id;

		const reviewCard = buildReviewCard(reportId);
		const reviewMessage = await thread.send({
			components: [reviewCard],
			files: [proofAttachment],
			flags: MessageFlags.IsComponentsV2,
		});
		reports.get(reportId).messageId = reviewMessage.id;

		await interaction.editReply({
			content: `✅ Your report has been submitted. Wait for the result in ${thread}.`,
		});
	} catch (error) {
		console.error("[game-report] Failed to process report submission:", error);
		await interaction.editReply({
			content:
				"❌ Something went wrong submitting your report. Please try again, or contact staff if this keeps happening.",
		});
	}
}

function buildReviewCard(reportId) {
	const report = reports.get(reportId);
	const container = new ContainerBuilder()
		.setAccentColor(ACCENT_COLOR)
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`# Game Reports\n**Submitter:** <@${report.reporterId}>\n**Roblox User:** ${report.robloxUsername}\n**Punishments:** ${report.punishments.join(", ")}`,
			),
		)
		.addMediaGalleryComponents(
			new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(report.proofUrl)),
		);

	if (report.status !== "pending") {
		const decided = report.status === "accepted" ? "✅ Accepted" : "❌ Rejected";
		container
			.addSeparatorComponents(new SeparatorBuilder())
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`### ${decided} by <@${report.handlerId}>`),
			);
	} else if (!report.handlerId) {
		container
			.addSeparatorComponents(new SeparatorBuilder())
			.addTextDisplayComponents(new TextDisplayBuilder().setContent("### 🛡️ Staff"))
			.addActionRowComponents(
				new ActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setCustomId(`report:handle:${reportId}`)
						.setLabel("Handle Report")
						.setEmoji("✔️")
						.setStyle(ButtonStyle.Secondary),
				),
			);
	} else {
		container
			.addSeparatorComponents(new SeparatorBuilder())
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`### 🛡️ Being handled by <@${report.handlerId}>`),
			)
			.addActionRowComponents(
				new ActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setCustomId(`report:accept:${reportId}`)
						.setEmoji("✅")
						.setLabel('Approve')
						.setStyle(ButtonStyle.Success),
					new ButtonBuilder()
						.setCustomId(`report:reject:${reportId}`)
						.setEmoji("❌")
						.setLabel('Deny')
						.setStyle(ButtonStyle.Secondary),
				),
			);
	}

	return container;
}

async function notifyReporter(interaction, report, decision) {
	const label = decision === "accepted" ? "✅ Accepted" : "❌ Rejected";

	const thread = await interaction.client.channels.fetch(report.threadId).catch(() => null);
	if (thread) {
		await thread.send(`${label} — your report on **${report.robloxUsername}** was decided by <@${interaction.user.id}>.`);
	}

	const reporter = await interaction.client.users.fetch(report.reporterId).catch(() => null);
	if (reporter) {
		const dmContainer = new ContainerBuilder()
			.setAccentColor(decision === "accepted" ? ACCENT_COLOR : 0xed4245)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`## Game Report ${label}\n**Roblox User:** ${report.robloxUsername}\n**Punishments:** ${report.punishments.join(", ")}\n**Decided by:** <@${interaction.user.id}>`,
				),
			);
		await reporter.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
	}
}

async function handleAccept(interaction, reportId) {
	const report = reports.get(reportId);
	if (!report || report.status !== "pending" || !report.handlerId) {
		return interaction.reply({ content: "This report isn't ready to be decided yet.", flags: MessageFlags.Ephemeral });
	}
	if (interaction.user.id !== report.handlerId) {
		return interaction.reply({
			content: "Only the staff member handling this report can decide it.",
			flags: MessageFlags.Ephemeral,
		});
	}

	report.status = "accepted";
	await interaction.update({
		components: [buildReviewCard(reportId)],
		flags: MessageFlags.IsComponentsV2,
	});

	await notifyReporter(interaction, report, "accepted");
}

async function handleReject(interaction, reportId) {
	const report = reports.get(reportId);
	if (!report || report.status !== "pending" || !report.handlerId) {
		return interaction.reply({ content: "This report isn't ready to be decided yet.", flags: MessageFlags.Ephemeral });
	}
	if (interaction.user.id !== report.handlerId) {
		return interaction.reply({
			content: "Only the staff member handling this report can decide it.",
			flags: MessageFlags.Ephemeral,
		});
	}

	report.status = "rejected";
	await interaction.update({
		components: [buildReviewCard(reportId)],
		flags: MessageFlags.IsComponentsV2,
	});

	await notifyReporter(interaction, report, "rejected");

	const thread = await interaction.client.channels.fetch(report.threadId).catch(() => null);
	if (thread) {
		await thread.setLocked(true).catch(() => {});
		await thread.setArchived(true).catch(() => {});
	}
}

async function handleClaim(interaction, reportId) {
	if (!isStaff(interaction)) {
		return interaction.reply({ content: "You are not staff.", flags: MessageFlags.Ephemeral });
	}
	const report = reports.get(reportId);
	if (!report || report.handlerId) {
		return interaction.reply({ content: "This report is already being handled.", flags: MessageFlags.Ephemeral });
	}

	report.handlerId = interaction.user.id;
	await interaction.update({
		components: [buildReviewCard(reportId)],
		flags: MessageFlags.IsComponentsV2,
	});

	const thread = await interaction.client.channels.fetch(report.threadId).catch(() => null);
	if (thread) {
		await thread.send(
			`✅ <@${report.reporterId}> your report is being handled by <@${interaction.user.id}>. Please follow the instructions given by the staff member.`,
		);
	}
}

module.exports = { data, execute, handleComponent };