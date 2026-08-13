import "server-only";
import { CRIMINAL_RECORD_ROWS } from "@/lib/constants";
import { clubsInGuild } from "@/lib/discord/guilds";
import { findUserByDiscordId } from "@/lib/discord/link";
import { getMember, listRanks } from "@/lib/queries";
import { getOrgById } from "@/lib/tenant";
import type { Member, Organization, SystemRole } from "@/lib/types";

/**
 * The Discord Activity's server half: turn an OAuth code from the embedded
 * client into a verified viewer and their club record.
 *
 * The trust rule is the same one the interactions route follows, for the same
 * reason. The Activity runs in an iframe we do not control, so NOTHING it
 * claims about who is watching may be believed: the code is exchanged here
 * with the client secret, and the resulting token is spent on Discord's own
 * `/users/@me` to learn the user id. Everything downstream keys off that id,
 * never off a value the page posted.
 *
 * Session cookies are deliberately not involved. Inside an Activity a cookie
 * must be `SameSite=None; Partitioned`, which puts it in a separate jar from
 * the same person's portal session, so a cookie would be a second, weaker
 * identity rather than a shared one. The OAuth token IS the identity.
 */

const DISCORD_API = "https://discord.com/api/v10";

export class ActivityError extends Error {
  constructor(
    public readonly code:
      | "not_configured"
      | "bad_code"
      | "identity_failed"
      | "unlinked"
      | "no_membership",
  ) {
    super(code);
    this.name = "ActivityError";
  }
}

/** One row of the criminal record, formatted exactly as the character screen. */
export interface RecordRow {
  label: string;
  value: string;
  danger: boolean;
}

/** What the Activity renders. Plain serializable data: it crosses to a client
 *  component, so no Timestamps and no closures. */
export interface ActivityProfile {
  org: { id: string; name: string };
  member: {
    id: string;
    roadName: string;
    displayName: string;
    memberNumber: number;
    status: string;
    rankName: string | null;
    patchCount: number;
    /** Served render URL, or null for the shared silhouette. */
    renderUrl: string | null;
  };
  role: SystemRole;
  record: RecordRow[];
  /** Every club this viewer rides with, for a future club picker. */
  clubs: { id: string; name: string }[];
}

/** Exchange the authorization code for a token. Activities send no
 *  redirect_uri, unlike ordinary Discord OAuth. */
async function exchangeCode(code: string): Promise<string> {
  const clientId = process.env.DISCORD_APPLICATION_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new ActivityError("not_configured");

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
    }),
  });
  if (!res.ok) throw new ActivityError("bad_code");
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new ActivityError("bad_code");
  return data.access_token;
}

/** Ask Discord who the token belongs to. This is the identity, full stop. */
async function identify(accessToken: string): Promise<string> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new ActivityError("identity_failed");
  const user = (await res.json()) as { id?: string };
  if (!user.id) throw new ActivityError("identity_failed");
  return user.id;
}

/**
 * Which club this viewer is looking at. Same precedence as the bot's, minus
 * the slash-command option: the clubs bound to the launching server narrowed
 * to the ones they ride with, then their only club, else the first of theirs
 * (the client will get a picker in a later phase).
 */
async function pickClub(
  guildId: string | null,
  memberships: Record<string, { memberId: string; role: SystemRole }>,
): Promise<Organization | null> {
  const mineIds = Object.keys(memberships);
  if (mineIds.length === 0) return null;

  if (guildId) {
    const hosted = await clubsInGuild(guildId);
    const mine = hosted.filter(
      (o) => memberships[o.id] && o.status !== "suspended",
    );
    if (mine.length >= 1) return mine[0];
  }

  const orgs = await Promise.all(mineIds.map((id) => getOrgById(id)));
  return (
    orgs.find((o): o is Organization => o !== null && o.status !== "suspended") ??
    null
  );
}

/**
 * The whole server-side handshake: code in, verified profile out. Returns the
 * access token alongside it because the embedded client needs it to call
 * `authenticate()` and finish booting.
 */
export async function openActivitySession(
  code: string,
  guildId: string | null,
): Promise<{ accessToken: string; profile: ActivityProfile }> {
  const accessToken = await exchangeCode(code);
  const discordId = await identify(accessToken);

  const linked = await findUserByDiscordId(discordId);
  if (!linked) throw new ActivityError("unlinked");

  const memberships = (linked.memberships ?? {}) as Record<
    string,
    { memberId: string; role: SystemRole }
  >;
  const org = await pickClub(guildId, memberships);
  if (!org) throw new ActivityError("no_membership");

  const membership = memberships[org.id];
  const member = await getMember(org.id, membership.memberId);
  if (!member) throw new ActivityError("no_membership");

  const ranks = await listRanks(org.id);
  const clubs = (
    await Promise.all(Object.keys(memberships).map((id) => getOrgById(id)))
  )
    .filter((o): o is Organization => o !== null)
    .map((o) => ({ id: o.id, name: o.name }));

  return {
    accessToken,
    profile: {
      org: { id: org.id, name: org.name },
      member: buildMemberCard(org.id, member, ranks),
      role: membership.role,
      record: buildRecord(member),
      clubs,
    },
  };
}

function buildMemberCard(
  orgId: string,
  member: Member,
  ranks: { id: string; name: string }[],
): ActivityProfile["member"] {
  return {
    id: member.id,
    roadName: member.roadName,
    displayName: member.displayName,
    memberNumber: member.memberNumber,
    status: member.status,
    rankName: ranks.find((r) => r.id === member.rankId)?.name ?? null,
    patchCount: member.patchCount ?? 0,
    // The render route streams the bytes; existence is checked by the route
    // itself, which 404s when there is none, so the card falls back in CSS.
    renderUrl: `/api/orgs/${orgId}/members/${member.id}/render`,
  };
}

/** The character screen's rows, same order and same formatters. */
function buildRecord(member: Member): RecordRow[] {
  return CRIMINAL_RECORD_ROWS.map((row) => {
    const value = member.stats?.[row.statKey] ?? 0;
    return {
      label: row.label,
      value: row.format ? row.format(value) : value.toLocaleString("en-US"),
      danger: row.danger === true,
    };
  });
}
