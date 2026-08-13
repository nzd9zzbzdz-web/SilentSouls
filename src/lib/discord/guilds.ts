import "server-only";
import { cache } from "react";
import { FieldValue, adminDb, orgRef } from "@/lib/firebase/admin";

/**
 * Guild → club bindings: which club a Discord server speaks for. This is the
 * multi-group layer; one bot deployment serves every club in the database,
 * resolving the org PER INTERACTION from the signed guild id instead of the
 * single DISCORD_ORG_ID pin (which remains the fallback, so a one-club
 * deployment needs no binding at all).
 *
 * Written only by /connect, which demands the club's ADMIN role through the
 * account link. Root collection `discordGuilds`, doc id = guild id,
 * server-only in rules like invites and link codes.
 *
 * Deliberately not cross-request cached: one doc read per Discord command is
 * noise next to a portal page, and a stale binding would misroute a club.
 * React cache() dedupes within a single interaction.
 */

export interface GuildBinding {
  orgId: string;
  /** Where this club's tickets land for review. Absent ⇒ env fallback. */
  officerChannelId?: string;
}

export const getGuildBinding = cache(
  async (guildId: string): Promise<GuildBinding | null> => {
    const snap = await adminDb.collection("discordGuilds").doc(guildId).get();
    const data = snap.data();
    if (typeof data?.orgId !== "string") return null;
    return {
      orgId: data.orgId,
      ...(typeof data.officerChannelId === "string"
        ? { officerChannelId: data.officerChannelId }
        : {}),
    };
  },
);

/** Bind a guild to a club (merge: a rebind without a channel keeps the old
 *  channel). Audited in the club's own log. */
export async function setGuildBinding(
  guildId: string,
  opts: { orgId: string; officerChannelId?: string; connectedBy: string },
): Promise<void> {
  await adminDb
    .collection("discordGuilds")
    .doc(guildId)
    .set(
      {
        orgId: opts.orgId,
        ...(opts.officerChannelId
          ? { officerChannelId: opts.officerChannelId }
          : {}),
        connectedBy: opts.connectedBy,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  await orgRef(opts.orgId).collection("auditLogs").add({
    actorUid: opts.connectedBy,
    action: "discord.connect",
    targetPath: `discordGuilds/${guildId}`,
    detail: opts.officerChannelId
      ? `guild ${guildId}, officer channel ${opts.officerChannelId}`
      : `guild ${guildId}`,
    at: FieldValue.serverTimestamp(),
  });
}

/**
 * Where a club's ticket notifications go: its bound guild's officer channel,
 * or the single-club env fallback when this org is the env-pinned one.
 */
export async function officerChannelFor(orgId: string): Promise<string | null> {
  const snap = await adminDb
    .collection("discordGuilds")
    .where("orgId", "==", orgId)
    .limit(1)
    .get();
  const bound = snap.empty
    ? undefined
    : (snap.docs[0].data().officerChannelId as string | undefined);
  if (bound) return bound;
  if (
    process.env.DISCORD_OFFICER_CHANNEL_ID &&
    orgId === process.env.DISCORD_ORG_ID
  ) {
    return process.env.DISCORD_OFFICER_CHANNEL_ID;
  }
  return null;
}
