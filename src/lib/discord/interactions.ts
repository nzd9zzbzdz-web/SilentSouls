import "server-only";
import {
  SubmissionError,
  submitActivityCore,
} from "@/lib/activities-core";
import { CRIMINAL_RECORD_ROWS } from "@/lib/constants";
import {
  consumeLinkCode,
  findUserByDiscordId,
  unlinkDiscordId,
} from "@/lib/discord/link";
import { getMember, listActivityTypes, listMembers, listRanks } from "@/lib/queries";
import { getOrgById } from "@/lib/tenant";
import { submitActivitySchema } from "@/lib/schemas/activity";
import type { Member, Organization } from "@/lib/types";

/**
 * The Discord transport's command dispatch, kept apart from the HTTP route so
 * tests can drive commands without signing requests. Reads come from the same
 * cached queries the portal pages use. Writes are the account-linking ones in
 * src/lib/discord/link.ts and TICKET SUBMISSION via submitActivityCore, the
 * exact pipeline the website's Server Action wraps: same validation, same
 * denormalized entries, same 20-a-day rate-limit pool (keyed by uid, so the
 * two surfaces share one allowance). Submission needs no cache invalidation:
 * pending tickets are read via the deliberately-uncached listActivities.
 * Nothing here may import an action module (the updateTag rule).
 */

/** The slice of Discord's wire protocol this bot speaks. Not a client library. */
export const InteractionType = {
  Ping: 1,
  ApplicationCommand: 2,
  Autocomplete: 4,
  ModalSubmit: 5,
} as const;
export const ResponseType = {
  Pong: 1,
  ChannelMessage: 4,
  Autocomplete: 8,
  Modal: 9,
} as const;
const EPHEMERAL = 64; // message flag: only the invoker sees the reply

interface DiscordUser {
  id: string;
  username?: string;
  global_name?: string;
}

export interface DiscordInteraction {
  type: number;
  data?: {
    name?: string;
    /** Modal submits: which form came back, e.g. "ticket:drug-sale". */
    custom_id?: string;
    options?: {
      name: string;
      type: number;
      value?: string | number | boolean;
      /** Autocomplete: the option the user is currently typing. */
      focused?: boolean;
    }[];
    /** Modal submits: action rows wrapping the text inputs. */
    components?: {
      type: number;
      components?: { type: number; custom_id?: string; value?: string }[];
    }[];
  };
  /** Present when invoked in a server; `user` when invoked from a DM. */
  member?: { user?: DiscordUser };
  user?: DiscordUser;
}

export interface InteractionResponse {
  type: number;
  data?: Record<string, unknown> & { content?: string; flags?: number };
}

function reply(content: string): InteractionResponse {
  return { type: ResponseType.ChannelMessage, data: { content, flags: EPHEMERAL } };
}

/** Who ran the command, straight from the signed payload. */
function invoker(interaction: DiscordInteraction): DiscordUser | null {
  return interaction.member?.user ?? interaction.user ?? null;
}

function stringOption(
  interaction: DiscordInteraction,
  name: string,
): string | null {
  const value = interaction.data?.options?.find((o) => o.name === name)?.value;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * The club this bot serves; null when unset, pointing at nothing, or
 * suspended (a suspended club's portal is frozen for everyone, and the bot
 * follows requireOrgRole's lead, reading as disconnected).
 */
async function botOrg(): Promise<Organization | null> {
  const orgId = process.env.DISCORD_ORG_ID;
  const org = orgId ? await getOrgById(orgId) : null;
  return org?.status === "suspended" ? null : org;
}

/**
 * Resolve the invoker to their member record through the account link. The
 * memberships mirror on users/{uid} is what custom claims are built FROM
 * (syncUserClaims), so trusting it here matches the website's authority.
 */
type LinkedMember =
  | { kind: "ok"; uid: string; member: Member }
  | { kind: "unlinked" }
  | { kind: "no_member" };

async function resolveLinkedMember(
  org: Organization,
  interaction: DiscordInteraction,
): Promise<LinkedMember> {
  const user = invoker(interaction);
  const linked = user?.id ? await findUserByDiscordId(user.id) : null;
  if (!linked) return { kind: "unlinked" };
  const membership = linked.memberships?.[org.id];
  const member = membership ? await getMember(org.id, membership.memberId) : null;
  if (!member) return { kind: "no_member" };
  return { kind: "ok", uid: linked.uid, member };
}

// ── Slash commands ─────────────────────────────────────────────────────

export async function handleDiscordCommand(
  interaction: DiscordInteraction,
): Promise<InteractionResponse> {
  const command = interaction.data?.name;

  if (command === "ping") {
    // The one public reply: proving the bot is up is worth the channel seeing.
    return {
      type: ResponseType.ChannelMessage,
      data: { content: "Pong. The clubhouse is listening." },
    };
  }

  if (command === "mystats") return myStats(interaction);
  if (command === "link") return link(interaction);
  if (command === "unlink") return unlink(interaction);
  if (command === "ticket") return ticket(interaction);

  return reply("Unknown command.");
}

async function myStats(interaction: DiscordInteraction): Promise<InteractionResponse> {
  const org = await botOrg();
  if (!org) return reply("This bot is not connected to a club yet.");

  const query = stringOption(interaction, "member");

  // No argument: the caller means themselves, resolved through the link.
  if (!query) {
    const resolved = await resolveLinkedMember(org, interaction);
    if (resolved.kind === "unlinked") {
      return reply(
        "This Discord account is not linked yet. Generate a code on the portal " +
          "dashboard, then run /link code:<your code>. " +
          "You can also ask by road name: /mystats member:<road name>",
      );
    }
    if (resolved.kind === "no_member") {
      return reply(`Your portal account has no member record with ${org.name}.`);
    }
    return recordReply(org, resolved.member);
  }

  const members = await listMembers(org.id);
  const needle = query.toLowerCase();
  const member =
    members.find((m) => m.roadName.toLowerCase() === needle) ??
    members.find((m) => m.displayName.toLowerCase() === needle);
  if (!member) {
    return reply(`No member named "${query}" rides with ${org.name}.`);
  }
  return recordReply(org, member);
}

async function link(interaction: DiscordInteraction): Promise<InteractionResponse> {
  const user = invoker(interaction);
  if (!user?.id) {
    return reply("Could not read your Discord account from this request.");
  }
  const code = stringOption(interaction, "code");
  if (!code) {
    return reply("Bring the code from the portal dashboard: /link code:<your code>");
  }

  const result = await consumeLinkCode(code, {
    id: user.id,
    username: user.username,
  });
  if (!result.ok) {
    return reply(
      result.reason === "taken"
        ? "This Discord account is already linked to a different portal account. Run /unlink first to move it."
        : "That code is not valid or has expired. Generate a fresh one on the portal dashboard.",
    );
  }

  // Confirm with the club identity the link now resolves to.
  const [org, linked] = await Promise.all([
    getOrgById(result.orgId),
    findUserByDiscordId(user.id),
  ]);
  const membership = linked?.memberships?.[result.orgId];
  const member =
    org && membership ? await getMember(org.id, membership.memberId) : null;
  return reply(
    org && member
      ? `Linked. You ride with ${org.name} as "${member.roadName}" ${member.displayName}. Try /mystats.`
      : "Linked. Try /mystats.",
  );
}

async function unlink(interaction: DiscordInteraction): Promise<InteractionResponse> {
  const user = invoker(interaction);
  if (!user?.id) {
    return reply("Could not read your Discord account from this request.");
  }
  const severed = await unlinkDiscordId(user.id);
  return reply(
    severed
      ? "Unlinked. This Discord account no longer opens your club record."
      : "This Discord account is not linked to anything.",
  );
}

// ── /ticket: command → modal → submission ──────────────────────────────

const TICKET_PREFIX = "ticket:";

/** /ticket type:<id> answers with a modal asking for the details. */
async function ticket(interaction: DiscordInteraction): Promise<InteractionResponse> {
  const org = await botOrg();
  if (!org) return reply("This bot is not connected to a club yet.");

  const resolved = await resolveLinkedMember(org, interaction);
  if (resolved.kind === "unlinked") {
    return reply(
      "Link your Discord account first: generate a code on the portal " +
        "dashboard, then run /link code:<your code>.",
    );
  }
  if (resolved.kind === "no_member") {
    return reply(`Your portal account has no member record with ${org.name}.`);
  }

  const typeValue = stringOption(interaction, "type");
  const types = await listActivityTypes(org.id);
  // Autocomplete submits the id; a hand-typed name is matched as a courtesy.
  const type = typeValue
    ? types.find((t) => t.active && t.id === typeValue) ??
      types.find((t) => t.active && t.name.toLowerCase() === typeValue.toLowerCase())
    : undefined;
  if (!type) {
    return reply("Pick an activity type from the suggestions and try again.");
  }

  return {
    type: ResponseType.Modal,
    data: {
      custom_id: `${TICKET_PREFIX}${type.id}`,
      title: `Log: ${type.name}`.slice(0, 45),
      components: [
        ...(type.allowQuantity
          ? [
              {
                type: 1,
                components: [
                  {
                    type: 4, // text input
                    custom_id: "quantity",
                    label: "Quantity",
                    style: 1, // short
                    value: String(type.defaultQuantity || 1),
                    required: true,
                    max_length: 12,
                  },
                ],
              },
            ]
          : []),
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: "description",
              label: "What happened",
              style: 2, // paragraph
              min_length: 10,
              max_length: 2000,
              required: true,
            },
          ],
        },
      ],
    },
  };
}

/** Text-input values out of a modal submit, keyed by custom_id. */
function modalFields(interaction: DiscordInteraction): Map<string, string> {
  const fields = new Map<string, string>();
  for (const row of interaction.data?.components ?? []) {
    for (const input of row.components ?? []) {
      if (input.custom_id && typeof input.value === "string") {
        fields.set(input.custom_id, input.value);
      }
    }
  }
  return fields;
}

/** The returned ticket modal: validate with the website's schema, submit
 *  through the same core the Server Action wraps. */
export async function handleModalSubmit(
  interaction: DiscordInteraction,
): Promise<InteractionResponse> {
  const customId = interaction.data?.custom_id ?? "";
  if (!customId.startsWith(TICKET_PREFIX)) return reply("Unsupported form.");
  const typeId = customId.slice(TICKET_PREFIX.length);

  const org = await botOrg();
  if (!org) return reply("This bot is not connected to a club yet.");

  const resolved = await resolveLinkedMember(org, interaction);
  if (resolved.kind === "unlinked") {
    return reply("Link your Discord account first, then file the ticket again.");
  }
  if (resolved.kind === "no_member") {
    return reply(`Your portal account has no member record with ${org.name}.`);
  }

  const fields = modalFields(interaction);
  const quantityRaw = (fields.get("quantity") ?? "1").replace(/[,\s]/g, "");
  const quantity = Number(quantityRaw);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return reply("Quantity must be a whole number of at least 1.");
  }

  const parsed = submitActivitySchema.safeParse({
    orgId: org.id,
    entries: [{ typeId, quantity }],
    // Discord tickets are logged as of now; pick a date on the website form.
    date: new Date(),
    description: fields.get("description") ?? "",
    witnesses: [],
  });
  if (!parsed.success) {
    return reply(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  try {
    await submitActivityCore(
      { uid: resolved.uid, memberId: resolved.member.id },
      parsed.data,
    );
  } catch (e) {
    if (e instanceof SubmissionError) {
      // Same phrasing as the website's action, so the two surfaces agree.
      if (e.code === "daily_limit") return reply("Daily submission limit reached");
      if (e.code === "type_disabled") {
        return reply(`${e.detail ?? "This activity type"} is disabled`);
      }
      return reply("Unknown activity type");
    }
    console.error(e);
    return reply("Something went wrong filing the ticket.");
  }

  const types = await listActivityTypes(org.id);
  const typeName = types.find((t) => t.id === typeId)?.name ?? "Activity";
  const amount =
    quantity > 1 ? ` ×${quantity.toLocaleString("en-US")}` : "";
  return reply(
    `Ticket filed: ${typeName}${amount}. An officer will review it; approvals land on your record automatically.`,
  );
}

/** Live suggestions for /ticket's type option: the org's active types. */
export async function handleAutocomplete(
  interaction: DiscordInteraction,
): Promise<InteractionResponse> {
  const empty = { type: ResponseType.Autocomplete, data: { choices: [] } };
  if (interaction.data?.name !== "ticket") return empty;
  const org = await botOrg();
  if (!org) return empty;

  const focused = interaction.data?.options?.find((o) => o.focused);
  const partial =
    typeof focused?.value === "string" ? focused.value.trim().toLowerCase() : "";
  const types = await listActivityTypes(org.id);
  const choices = types
    .filter((t) => t.active && t.name.toLowerCase().includes(partial))
    .slice(0, 25) // Discord's ceiling
    .map((t) => ({ name: t.name, value: t.id }));
  return { type: ResponseType.Autocomplete, data: { choices } };
}

// ── Record formatting ──────────────────────────────────────────────────

/** A member's record as an ephemeral reply, rank resolved. */
async function recordReply(
  org: Organization,
  member: Member,
): Promise<InteractionResponse> {
  const ranks = await listRanks(org.id);
  const rankName = ranks.find((r) => r.id === member.rankId)?.name;
  return reply(formatMemberStats(org, member, rankName));
}

/** The character screen's record, retold as Discord markdown. */
export function formatMemberStats(
  org: Organization,
  member: Member,
  rankName: string | undefined,
): string {
  const headline = [
    org.name,
    rankName ? `Rank: ${rankName}` : null,
    `Member #${member.memberNumber}`,
    `Status: ${member.status}`,
  ]
    .filter(Boolean)
    .join(" · ");

  // Same rows, labels and formatting as the character screen, so the two
  // surfaces can never disagree about someone's record.
  const record = CRIMINAL_RECORD_ROWS.map((row) => {
    const value = member.stats?.[row.statKey] ?? 0;
    return `${row.label}: ${row.format ? row.format(value) : value.toLocaleString("en-US")}`;
  });

  const service: string[] = [];
  const clubRuns = member.stats?.clubRuns ?? 0;
  const church = member.stats?.churchAttendance ?? 0;
  if (clubRuns) service.push(`Club Runs: ${clubRuns.toLocaleString("en-US")}`);
  if (church) service.push(`Church Attendance: ${church.toLocaleString("en-US")}`);

  return [
    `**"${member.roadName}" ${member.displayName}**`,
    headline,
    `Patches earned: ${member.patchCount ?? 0}`,
    "",
    "**Criminal Record**",
    ...record,
    ...(service.length ? ["", "**Club Service**", ...service] : []),
  ].join("\n");
}
