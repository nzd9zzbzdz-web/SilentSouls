/**
 * Multi-group support: /connect binding a guild to a club, per-guild org
 * resolution, per-guild officer permissions, and the cross-club global
 * leaderboard. Two clubs share one database here, which is the model this
 * deployment ships. Against the Firestore emulator; isolated project.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "discord-guild-test-isolated";
process.env.DISCORD_ORG_ID = "org-a";

// Import AFTER env vars so the Admin SDK connects to the emulator.
const { adminDb, orgRef, Timestamp } = await import("@/lib/firebase/admin");
const { handleDiscordCommand, handleComponent, handleAutocomplete } = await import(
  "@/lib/discord/interactions"
);
const { getGuildBinding, officerChannelFor } = await import("@/lib/discord/guilds");

const ORG_A = "org-a";
const ORG_B = "org-b";

function cmd(
  name: string,
  opts: {
    guildId?: string;
    options?: { name: string; type: number; value?: string }[];
    user?: { id: string };
  } = {},
) {
  return {
    type: 2,
    data: { name, options: opts.options },
    ...(opts.guildId ? { guild_id: opts.guildId } : {}),
    member: opts.user ? { user: opts.user } : undefined,
  };
}

async function wipe(collection: string) {
  const snap = await adminDb.collection(collection).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}

async function seedOrg(orgId: string, name: string) {
  const org = orgRef(orgId);
  await org.set({ name, slug: orgId, status: "active", memberCount: 2 });
  return org;
}

async function seedMember(
  orgId: string,
  id: string,
  n: number,
  roadName: string,
  drugSales: number,
  status = "patched",
) {
  await orgRef(orgId).collection("members").doc(id).set({
    uid: `u-${id}`,
    displayName: `Rider ${roadName}`,
    roadName,
    rankId: "president",
    status,
    joinDate: Timestamp.now(),
    memberNumber: n,
    stats: { drugSales },
    patchCount: 0,
    createdAt: Timestamp.now(),
  });
}

async function seedUser(
  uid: string,
  discordId: string,
  memberships: Record<string, { memberId: string; role: string }>,
) {
  await adminDb.collection("users").doc(uid).set({
    email: `${uid}@test.rp`,
    displayName: uid,
    memberships,
    discordId,
    createdAt: Timestamp.now(),
  });
}

beforeEach(async () => {
  await adminDb.recursiveDelete(orgRef(ORG_A));
  await adminDb.recursiveDelete(orgRef(ORG_B));
  await wipe("users");
  await wipe("discordGuilds");

  await seedOrg(ORG_A, "Alpha MC");
  await seedOrg(ORG_B, "Bravo MC");

  await seedMember(ORG_A, "ma", 1, "Alpha One", 100);
  await seedMember(ORG_A, "ma2", 2, "Alpha Two", 50);
  await seedMember(ORG_B, "mb", 1, "Bravo One", 70);
  await seedMember(ORG_B, "mb-gone", 2, "Bravo Ghost", 999, "retired");

  // DA administers Alpha; DB officers Bravo; DM is a plain Alpha member.
  await seedUser("uA", "DA", { [ORG_A]: { memberId: "ma", role: "admin" } });
  await seedUser("uB", "DB", { [ORG_B]: { memberId: "mb", role: "officer" } });
  await seedUser("uM", "DM", { [ORG_A]: { memberId: "ma2", role: "member" } });

  await orgRef(ORG_B).collection("activities").doc("b1").set({
    memberId: "mb",
    entries: [{ typeId: "drug-sale", statKey: "drugSales", quantity: 5 }],
    date: Timestamp.now(),
    description: "bravo business",
    witnesses: [],
    status: "pending",
    createdAt: Timestamp.now(),
  });
});

afterAll(async () => {
  await adminDb.recursiveDelete(orgRef(ORG_A));
  await adminDb.recursiveDelete(orgRef(ORG_B));
  await wipe("users");
  await wipe("discordGuilds");
});

describe("/connect", () => {
  it("binds the guild for a club admin and audits it", async () => {
    const res = await handleDiscordCommand(
      cmd("connect", { guildId: "G-A", user: { id: "DA" } }),
    );
    expect(res.data?.content).toContain("Alpha MC");

    const binding = await getGuildBinding("G-A");
    expect(binding).toEqual({ orgId: ORG_A });

    const audits = await orgRef(ORG_A)
      .collection("auditLogs")
      .where("action", "==", "discord.connect")
      .get();
    expect(audits.size).toBe(1);
    expect(audits.docs[0].data().actorUid).toBe("uA");
  });

  it("stores the officer channel when given one", async () => {
    await handleDiscordCommand(
      cmd("connect", {
        guildId: "G-A",
        user: { id: "DA" },
        options: [{ name: "channel", type: 7, value: "C-A" }],
      }),
    );
    expect(await getGuildBinding("G-A")).toEqual({
      orgId: ORG_A,
      officerChannelId: "C-A",
    });
    expect(await officerChannelFor(ORG_A)).toBe("C-A");
  });

  it("turns away non-admins and DMs", async () => {
    const member = await handleDiscordCommand(
      cmd("connect", { guildId: "G-A", user: { id: "DM" } }),
    );
    expect(member.data?.content).toContain("Only a club admin");

    const officer = await handleDiscordCommand(
      cmd("connect", { guildId: "G-B", user: { id: "DB" } }),
    );
    expect(officer.data?.content).toContain("Only a club admin");

    const dm = await handleDiscordCommand(cmd("connect", { user: { id: "DA" } }));
    expect(dm.data?.content).toContain("inside the server");
    expect(await getGuildBinding("G-A")).toBeNull();
  });

  it("makes a multi-club admin name the club, then honors the slug", async () => {
    await seedUser("uBoth", "DX", {
      [ORG_A]: { memberId: "ma", role: "admin" },
      [ORG_B]: { memberId: "mb", role: "admin" },
    });

    const vague = await handleDiscordCommand(
      cmd("connect", { guildId: "G-X", user: { id: "DX" } }),
    );
    expect(vague.data?.content).toContain("several clubs");
    expect(await getGuildBinding("G-X")).toBeNull();

    const named = await handleDiscordCommand(
      cmd("connect", {
        guildId: "G-X",
        user: { id: "DX" },
        options: [{ name: "club", type: 3, value: ORG_B }],
      }),
    );
    expect(named.data?.content).toContain("Bravo MC");
    expect((await getGuildBinding("G-X"))?.orgId).toBe(ORG_B);
  });
});

describe("per-guild resolution", () => {
  beforeEach(async () => {
    await adminDb.collection("discordGuilds").doc("G-A").set({ orgId: ORG_A });
    await adminDb.collection("discordGuilds").doc("G-B").set({ orgId: ORG_B });
  });

  it("answers each guild with its own club", async () => {
    const inA = await handleDiscordCommand(
      cmd("mystats", {
        guildId: "G-A",
        user: { id: "DM" },
        options: [{ name: "member", type: 3, value: "Alpha One" }],
      }),
    );
    expect(inA.data?.content).toContain('"Alpha One"');
    expect(inA.data?.content).toContain("Alpha MC");

    const inB = await handleDiscordCommand(
      cmd("mystats", {
        guildId: "G-B",
        user: { id: "DM" },
        options: [{ name: "member", type: 3, value: "Alpha One" }],
      }),
    );
    expect(inB.data?.content).toContain('No member named "Alpha One" rides with Bravo MC');
  });

  it("falls back to the env pin outside any guild", async () => {
    const res = await handleDiscordCommand(
      cmd("mystats", {
        user: { id: "DM" },
        options: [{ name: "member", type: 3, value: "Alpha One" }],
      }),
    );
    expect(res.data?.content).toContain("Alpha MC");
  });

  it("scopes officer power to the guild's own club", async () => {
    // Alpha's admin means nothing in Bravo's guild; Bravo's ticket survives.
    const foreign = await handleComponent({
      type: 3,
      data: { custom_id: "review:approve:b1" },
      guild_id: "G-B",
      member: { user: { id: "DA" } },
    });
    expect(foreign.data?.content).toContain("no member record with Bravo MC");
    const untouched = await orgRef(ORG_B).collection("activities").doc("b1").get();
    expect(untouched.data()?.status).toBe("pending");

    // Bravo's own officer lands the decision in the same guild.
    const home = await handleComponent({
      type: 3,
      data: { custom_id: "review:approve:b1" },
      guild_id: "G-B",
      member: { user: { id: "DB" } },
    });
    expect(home.type).toBe(7);
    const approved = await orgRef(ORG_B).collection("activities").doc("b1").get();
    expect(approved.data()?.status).toBe("approved");
  });
});

describe("global standings", () => {
  it("ranks every riding member of every club on one board", async () => {
    const res = await handleDiscordCommand(
      cmd("leaderboard", {
        guildId: "G-A",
        user: { id: "DM" },
        options: [
          { name: "scope", type: 3, value: "global" },
          { name: "category", type: 3, value: "drugSales" },
        ],
      }),
    );
    const lines = (res.data?.content ?? "").split("\n");
    expect(lines[0]).toBe("**Drug Sales** global standings · 2 clubs");
    expect(lines[1]).toBe('🥇 "Alpha One" Rider Alpha One · Alpha MC · 100');
    expect(lines[2]).toBe('🥈 "Bravo One" Rider Bravo One · Bravo MC · 70');
    expect(lines[3]).toBe('🥉 "Alpha Two" Rider Alpha Two · Alpha MC · 50');
    // Retired colors sit out of global competition too.
    expect(res.data?.content).not.toContain("Bravo Ghost");
  });

  it("defaults to the first criminal-record stat", async () => {
    const res = await handleDiscordCommand(
      cmd("leaderboard", {
        user: { id: "DM" },
        options: [{ name: "scope", type: 3, value: "global" }],
      }),
    );
    expect(res.data?.content).toContain("**Crimes Committed** global standings");
  });

  it("suggests the standard stats when scope is global", async () => {
    const res = await handleAutocomplete({
      type: 4,
      data: {
        name: "leaderboard",
        options: [
          { name: "scope", type: 3, value: "global" },
          { name: "category", type: 3, value: "dirty", focused: true },
        ],
      },
    });
    expect(res.data?.choices).toEqual([
      { name: "Dirty Money Earned", value: "dirtyMoneyEarned" },
      { name: "Dirty Money Cleaned", value: "dirtyMoneyCleaned" },
    ]);
  });
});
