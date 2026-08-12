import "server-only";
import { CRIMINAL_RECORD_ROWS } from "@/lib/constants";
import { listMembers, listRanks } from "@/lib/queries";
import { getOrgById } from "@/lib/tenant";
import type { Member, Organization } from "@/lib/types";

/**
 * The Discord transport's command dispatch, kept apart from the HTTP route so
 * tests can drive commands without signing requests. READ-ONLY in this phase:
 * every reply is composed from the same cached queries the portal pages use,
 * and nothing here writes to Firestore or imports an action module.
 */

/** The slice of Discord's wire protocol this bot speaks. Not a client library. */
export const InteractionType = { Ping: 1, ApplicationCommand: 2 } as const;
export const ResponseType = { Pong: 1, ChannelMessage: 4 } as const;
const EPHEMERAL = 64; // message flag: only the invoker sees the reply

export interface DiscordInteraction {
  type: number;
  data?: {
    name?: string;
    options?: { name: string; type: number; value?: string | number | boolean }[];
  };
}

export interface InteractionResponse {
  type: number;
  data?: { content: string; flags?: number };
}

function reply(content: string): InteractionResponse {
  return { type: ResponseType.ChannelMessage, data: { content, flags: EPHEMERAL } };
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

  return reply("Unknown command.");
}

async function myStats(interaction: DiscordInteraction): Promise<InteractionResponse> {
  // Which club this bot serves. One org per deployment for now (the same idea
  // as ORG_SLUG pinning); read at call time so each environment sets its own.
  const orgId = process.env.DISCORD_ORG_ID;
  const org = orgId ? await getOrgById(orgId) : null;
  if (!org) return reply("This bot is not connected to a club yet.");

  const query = interaction.data?.options?.find((o) => o.name === "member")?.value;
  if (typeof query !== "string" || !query.trim()) {
    return reply(
      "Discord account linking arrives in a later update. " +
        "Until then, ask by road name: /mystats member:<road name>",
    );
  }

  const members = await listMembers(org.id);
  const needle = query.trim().toLowerCase();
  const member =
    members.find((m) => m.roadName.toLowerCase() === needle) ??
    members.find((m) => m.displayName.toLowerCase() === needle);
  if (!member) {
    return reply(`No member named "${query.trim()}" rides with ${org.name}.`);
  }

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
