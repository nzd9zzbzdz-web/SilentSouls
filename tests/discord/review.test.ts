/**
 * Officer review buttons, verification-only phase: the permission chain from
 * a signed button click to the membership role, with nothing written. Against
 * the Firestore emulator; isolated project and org.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "discord-review-test-isolated";
process.env.DISCORD_ORG_ID = "discord-review-test-org";

// Import AFTER env vars so the Admin SDK connects to the emulator.
const { adminDb, orgRef, Timestamp } = await import("@/lib/firebase/admin");
const { handleComponent } = await import("@/lib/discord/interactions");

const ORG = "discord-review-test-org";

function click(customId: string, user?: { id: string }) {
  return {
    type: 3,
    data: { custom_id: customId },
    member: user ? { user } : undefined,
  };
}

async function wipe(collection: string) {
  const snap = await adminDb.collection(collection).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}

beforeEach(async () => {
  await adminDb.recursiveDelete(orgRef(ORG));
  await wipe("users");

  const org = orgRef(ORG);
  await org.set({ name: "Review Test MC", slug: ORG, status: "active", memberCount: 2 });

  await org.collection("members").doc("m1").set({
    uid: "u1",
    displayName: "Marcus Vane",
    roadName: "Reaper",
    rankId: "president",
    status: "patched",
    joinDate: Timestamp.now(),
    memberNumber: 1,
    stats: { drugSales: 5 },
    patchCount: 0,
    createdAt: Timestamp.now(),
  });
  await org.collection("members").doc("m2").set({
    uid: "u2",
    displayName: "Dana Cross",
    roadName: "Six",
    rankId: "road-captain",
    status: "patched",
    joinDate: Timestamp.now(),
    memberNumber: 2,
    stats: {},
    patchCount: 0,
    createdAt: Timestamp.now(),
  });

  // D1 is a plain member; D2 is an officer.
  await adminDb.collection("users").doc("u1").set({
    email: "reaper@test.rp",
    displayName: "Marcus Vane",
    memberships: { [ORG]: { memberId: "m1", role: "member" } },
    discordId: "D1",
    createdAt: Timestamp.now(),
  });
  await adminDb.collection("users").doc("u2").set({
    email: "six@test.rp",
    displayName: "Dana Cross",
    memberships: { [ORG]: { memberId: "m2", role: "officer" } },
    discordId: "D2",
    createdAt: Timestamp.now(),
  });

  await org.collection("activities").doc("a1").set({
    memberId: "m1",
    entries: [{ typeId: "drug-sale", statKey: "drugSales", quantity: 20 }],
    date: Timestamp.now(),
    description: "moved product across the docks",
    witnesses: [],
    status: "pending",
    createdAt: Timestamp.now(),
  });
  await org.collection("activities").doc("a2").set({
    memberId: "m1",
    entries: [{ typeId: "drug-sale", statKey: "drugSales", quantity: 1 }],
    date: Timestamp.now(),
    description: "already handled elsewhere",
    witnesses: [],
    status: "approved",
    reviewedBy: "someone",
    createdAt: Timestamp.now(),
  });
});

afterAll(async () => {
  await adminDb.recursiveDelete(orgRef(ORG));
  await wipe("users");
});

describe("handleComponent", () => {
  it("ignores buttons it did not create", async () => {
    const res = await handleComponent(click("music:play", { id: "D2" }));
    expect(res.data?.content).toBe("Unsupported button.");
    const malformed = await handleComponent(click("review:destroy:a1", { id: "D2" }));
    expect(malformed.data?.content).toBe("Unsupported button.");
  });

  it("turns away an unlinked clicker", async () => {
    const res = await handleComponent(click("review:approve:a1", { id: "D404" }));
    expect(res.data?.content).toContain("/link");
  });

  it("turns away a linked member who is not an officer", async () => {
    const res = await handleComponent(click("review:approve:a1", { id: "D1" }));
    expect(res.data?.content).toContain("Officers only");
  });

  it("verifies an officer on a pending ticket and writes nothing", async () => {
    const res = await handleComponent(click("review:approve:a1", { id: "D2" }));
    expect(res.data?.content).toContain("Officer verified");
    expect(res.data?.content).toContain("Approving");
    expect(res.data?.flags).toBe(64);

    // The whole point of this phase: verification only, zero writes.
    const activity = await orgRef(ORG).collection("activities").doc("a1").get();
    expect(activity.data()?.status).toBe("pending");
    expect(activity.data()?.reviewedBy).toBeUndefined();
    const member = await orgRef(ORG).collection("members").doc("m1").get();
    expect(member.data()?.stats).toEqual({ drugSales: 5 });
  });

  it("phrases the deny side too", async () => {
    const res = await handleComponent(click("review:deny:a1", { id: "D2" }));
    expect(res.data?.content).toContain("Denying");
  });

  it("reports a ticket that was already reviewed", async () => {
    const res = await handleComponent(click("review:approve:a2", { id: "D2" }));
    expect(res.data?.content).toContain("already approved");
  });

  it("reports a ticket that no longer exists", async () => {
    const res = await handleComponent(click("review:approve:ghost", { id: "D2" }));
    expect(res.data?.content).toContain("no longer exists");
  });

  it("lets an admin through the same gate", async () => {
    await adminDb.collection("users").doc("u2").update({
      [`memberships.${ORG}.role`]: "admin",
    });
    const res = await handleComponent(click("review:approve:a1", { id: "D2" }));
    expect(res.data?.content).toContain("Officer verified");
  });
});
