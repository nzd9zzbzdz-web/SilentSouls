import "server-only";
import { CRIMINAL_RECORD_ROWS } from "@/lib/constants";
import {
  consumeLinkCode,
  findUserByDiscordId,
  unlinkDiscordId,
} from "@/lib/discord/link";
import { getMember, listMembers, listRanks } from "@/lib/queries";
import { getOrgById } from "@/lib/tenant";
import type { Member, Organization } from "@/lib/types";

/**
 * The Discord transport's command dispatch, kept apart from the HTTP route so
 * tests can drive commands without signing requests. Replies are composed
 * from the same cached queries the portal pages use; the ONLY writes are the
 * account-linking ones in src/lib/discord/link.ts, which touch users docs and
 * link codes, never org data, so no cache tag needs clearing. Nothing here
 * may import an action module (the updateTag rule).
 */

/** The slice of Discord's wire protocol this bot speaks. Not a client library. */
export const InteractionType = { Ping: 1, ApplicationCommand: 2 } as const;
export const ResponseType = { Pong: 1, ChannelMessage: 4 } as const;
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
    options?: { name: string; type: number; value?: string | number | boolean }[];
  };
  /** Present when invoked in a server; `user` when invoked from a DM. */
  member?: { user?: DiscordUser };
  user?: DiscordUser;
}

export interface InteractionResponse {
  type: number;
  data?: { content: string; flags?: number };
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

/** The club this bot serves; null when unset or pointing at nothing. */
async function botOrg(): Promise<Organization | null> {
  const orgId = process.env.DISCORD_ORG_ID;
  return orgId ? getOrgById(orgId) : null;
}

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

  return reply("Unknown command.");
}

async function myStats(interaction: DiscordInteraction): Promise<InteractionResponse> {
  const org = await botOrg();
  if (!org) return reply("This bot is not connected to a club yet.");

  const query = stringOption(interaction, "member");

  // No argument: the caller means themselves, resolved through the link.
  if (!query) {
    const user = invoker(interaction);
    const linked = user?.id ? await findUserByDiscordId(user.id) : null;
    if (!linked) {
      return reply(
        "This Discord account is not linked yet. Generate a code on the portal " +
          "dashboard, then run /link code:<your code>. " +
          "You can also ask by road name: /mystats member:<road name>",
      );
    }
    const membership = linked.memberships?.[org.id];
    const member = membership ? await getMember(org.id, membership.memberId) : null;
    if (!member) {
      return reply(`Your portal account has no member record with ${org.name}.`);
    }
    return recordReply(org, member);
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
