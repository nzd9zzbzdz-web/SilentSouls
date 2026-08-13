/**
 * The Discord Activity's server handshake: code exchange, identity
 * verification, and resolving the viewer to a club member record.
 *
 * Discord's HTTP is stubbed (nothing leaves the process); Firestore is the
 * emulator, isolated project, same pattern as the other Discord tests.
 *
 * The property worth pinning hardest: identity comes from Discord's own
 * /users/@me, never from anything the iframe posted.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "discord-activity-test-isolated";

// Import AFTER env vars so the Admin SDK connects to the emulator.
const { adminDb, orgRef, Timestamp } = await import("@/lib/firebase/admin");
const { openActivitySession, ActivityError } = await import("@/lib/discord/activity");

const ORG = "activity-test-org";
const OTHER = "activity-test-other";
const GUILD = "G-NET";

/** Stub Discord: token endpoint then /users/@me. */
function stubDiscord(opts: {
  tokenOk?: boolean;
  identityOk?: boolean;
  userId?: string;
} = {}) {
  const { tokenOk = true, identityOk = true, userId = "D1" } = opts;
  const calls: { url: string; init?: RequestInit }[] = [];
  const mock = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const href = String(url);
    calls.push({ url: href, init });
    if (href.endsWith("/oauth2/token")) {
      return tokenOk
        ? new Response(JSON.stringify({ access_token: "tok-abc" }), { status: 200 })
        : new Response("nope", { status: 400 });
    }
    if (href.endsWith("/users/@me")) {
      return identityOk
        ? new Response(JSON.stringify({ id: userId }), { status: 200 })
        : new Response("nope", { status: 401 });
    }
    throw new Error(`unexpected fetch: ${href}`);
  });
  vi.stubGlobal("fetch", mock);
  return calls;
}

async function wipe(collection: string) {
  const snap = await adminDb.collection(collection).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}

beforeEach(async () => {
  process.env.DISCORD_APPLICATION_ID = "app-1";
  process.env.DISCORD_CLIENT_SECRET = "secret-1";

  await adminDb.recursiveDelete(orgRef(ORG));
  await adminDb.recursiveDelete(orgRef(OTHER));
  await wipe("users");
  await wipe("discordClubs");

  await orgRef(ORG).set({ name: "Activity MC", slug: ORG, status: "active", memberCount: 1 });
  await orgRef(OTHER).set({ name: "Other MC", slug: OTHER, status: "active", memberCount: 1 });
  await orgRef(ORG).collection("ranks").doc("president").set({
    name: "President",
    order: 1,
    isOfficer: true,
  });
  await orgRef(ORG).collection("members").doc("m1").set({
    uid: "u1",
    displayName: "Marcus Vane",
    roadName: "Reaper",
    rankId: "president",
    status: "patched",
    joinDate: Timestamp.now(),
    memberNumber: 1,
    stats: { crimesCommitted: 187, dirtyMoneyEarned: 2_400_000, jailTimeMonths: 96 },
    patchCount: 3,
    createdAt: Timestamp.now(),
  });
  await orgRef(OTHER).collection("members").doc("m9").set({
    uid: "u1",
    displayName: "Marcus Vane",
    roadName: "Reaper",
    rankId: "president",
    status: "patched",
    joinDate: Timestamp.now(),
    memberNumber: 9,
    stats: {},
    patchCount: 0,
    createdAt: Timestamp.now(),
  });
  await adminDb.collection("users").doc("u1").set({
    email: "reaper@test.rp",
    displayName: "Marcus Vane",
    memberships: { [ORG]: { memberId: "m1", role: "officer" } },
    discordId: "D1",
    createdAt: Timestamp.now(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await adminDb.recursiveDelete(orgRef(ORG));
  await adminDb.recursiveDelete(orgRef(OTHER));
  await wipe("users");
  await wipe("discordClubs");
  delete process.env.DISCORD_CLIENT_SECRET;
});

describe("openActivitySession", () => {
  it("exchanges the code and returns the viewer's card", async () => {
    const calls = stubDiscord();
    const { accessToken, profile } = await openActivitySession("code-1", null);

    expect(accessToken).toBe("tok-abc");
    expect(profile.org).toEqual({ id: ORG, name: "Activity MC" });
    expect(profile.member).toMatchObject({
      roadName: "Reaper",
      displayName: "Marcus Vane",
      memberNumber: 1,
      rankName: "President",
      patchCount: 3,
      status: "patched",
    });
    expect(profile.role).toBe("officer");

    // The character screen's rows, formatters and all.
    const byLabel = Object.fromEntries(profile.record.map((r) => [r.label, r.value]));
    expect(byLabel["Crimes Committed"]).toBe("187");
    expect(byLabel["Dirty Money Earned"]).toBe("$2.4M");
    expect(byLabel["Jail Time Served"]).toBe("96 mo");
    expect(profile.record.find((r) => r.label === "Felonies")?.danger).toBe(true);

    // The exchange posted form-encoded credentials, no redirect_uri.
    const token = calls.find((c) => c.url.endsWith("/oauth2/token"))!;
    const body = String(token.init?.body);
    expect(body).toContain("grant_type=authorization_code");
    expect(body).toContain("client_secret=secret-1");
    expect(body).toContain("code=code-1");
    expect(body).not.toContain("redirect_uri");

    // Identity was fetched with the token we just minted.
    const me = calls.find((c) => c.url.endsWith("/users/@me"))!;
    expect((me.init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok-abc",
    );
  });

  it("keys off Discord's answer, not anything the client could claim", async () => {
    // Discord says this token belongs to a DIFFERENT account than the one
    // seeded, so no profile may come back however the call was framed.
    stubDiscord({ userId: "SOMEONE-ELSE" });
    await expect(openActivitySession("code-1", null)).rejects.toMatchObject({
      code: "unlinked",
    });
  });

  it("refuses a code Discord will not exchange", async () => {
    stubDiscord({ tokenOk: false });
    await expect(openActivitySession("bad", null)).rejects.toMatchObject({
      code: "bad_code",
    });
  });

  it("refuses a token Discord will not identify", async () => {
    stubDiscord({ identityOk: false });
    await expect(openActivitySession("code-1", null)).rejects.toMatchObject({
      code: "identity_failed",
    });
  });

  it("fails closed when the client secret is missing", async () => {
    delete process.env.DISCORD_CLIENT_SECRET;
    stubDiscord();
    await expect(openActivitySession("code-1", null)).rejects.toBeInstanceOf(
      ActivityError,
    );
  });

  it("tells a linked account with no member record what is wrong", async () => {
    await adminDb.collection("users").doc("u1").update({ memberships: {} });
    stubDiscord();
    await expect(openActivitySession("code-1", null)).rejects.toMatchObject({
      code: "no_membership",
    });
  });

  it("prefers the club bound to the launching server", async () => {
    await adminDb.collection("users").doc("u1").update({
      memberships: {
        [ORG]: { memberId: "m1", role: "officer" },
        [OTHER]: { memberId: "m9", role: "member" },
      },
    });
    await adminDb.collection("discordClubs").doc(OTHER).set({ guildId: GUILD });

    stubDiscord();
    const { profile } = await openActivitySession("code-1", GUILD);
    expect(profile.org.id).toBe(OTHER);
    // Both clubs still ride along for a future picker.
    expect(profile.clubs.map((c) => c.id).sort()).toEqual([ORG, OTHER].sort());
  });

  it("skips a suspended club rather than opening it", async () => {
    await orgRef(ORG).update({ status: "suspended" });
    stubDiscord();
    await expect(openActivitySession("code-1", null)).rejects.toMatchObject({
      code: "no_membership",
    });
  });
});
