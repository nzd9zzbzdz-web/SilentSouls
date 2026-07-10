/**
 * Patch engine tests against the Firestore emulator (Admin SDK).
 * Requires emulators running. Uses an isolated org so app data is untouched.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Isolated project id — the emulator keys datastores by project, so engine
// tests can never touch the app's seeded demo data.
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "engine-test-isolated";

// Import AFTER env vars so the Admin SDK connects to the emulator.
const { adminDb, orgRef, Timestamp } = await import("@/lib/firebase/admin");
const { approveActivityTx, manualAwardTx, EngineError } = await import(
  "@/lib/patch-engine"
);

const ORG = "engine-test-org";

async function resetOrg() {
  await adminDb.recursiveDelete(orgRef(ORG));
  const org = orgRef(ORG);
  await org.set({ name: "Engine Test", slug: ORG, memberCount: 1 });
  await org.collection("patches").doc("test-patch").set({
    name: "Test Patch",
    category: "activity",
    description: "10 club runs",
    tier: 1,
    requirement: { statKey: "clubRuns", threshold: 10 },
    manual: false,
    active: true,
    defaultPlacement: { surface: "front", u: 0.3, v: 0.4, scale: 0.8, rotationDeg: 0 },
  });
  await org.collection("patches").doc("manual-patch").set({
    name: "Manual Patch",
    category: "legendary",
    description: "Manual only",
    tier: 4,
    requirement: null,
    manual: true,
    active: true,
    defaultPlacement: { surface: "back", u: 0.5, v: 0.5, scale: 1, rotationDeg: 0 },
  });
  await org.collection("members").doc("m1").set({
    uid: "test-uid",
    displayName: "Test Member",
    roadName: "Testy",
    rankId: "prospect",
    status: "prospect",
    joinDate: Timestamp.now(),
    memberNumber: 1,
    stats: { clubRuns: 9 },
    patchCount: 0,
    createdAt: Timestamp.now(),
  });
  await org.collection("activities").doc("a1").set({
    memberId: "m1",
    typeId: "club-ride",
    statKey: "clubRuns",
    date: Timestamp.now(),
    description: "test ride",
    quantity: 1,
    witnesses: [],
    status: "pending",
    createdAt: Timestamp.now(),
  });
}

beforeAll(resetOrg);
beforeEach(resetOrg);

afterAll(async () => {
  await adminDb.recursiveDelete(orgRef(ORG));
});

describe("approveActivityTx", () => {
  it("increments the stat and flips status to approved", async () => {
    const result = await approveActivityTx(ORG, "a1", "reviewer-uid");
    expect(result.newStatValue).toBe(10);

    const activity = await orgRef(ORG).collection("activities").doc("a1").get();
    expect(activity.data()?.status).toBe("approved");
    const member = await orgRef(ORG).collection("members").doc("m1").get();
    expect(member.data()?.stats.clubRuns).toBe(10);
  });

  it("awards the patch exactly when the threshold is crossed", async () => {
    const result = await approveActivityTx(ORG, "a1", "reviewer-uid");
    expect(result.awardedPatchIds).toEqual(["test-patch"]);

    const award = await orgRef(ORG)
      .collection("awardedPatches")
      .doc("m1_test-patch")
      .get();
    expect(award.exists).toBe(true);
    expect(award.data()?.awardedBy).toBe("system");

    const member = await orgRef(ORG).collection("members").doc("m1").get();
    expect(member.data()?.patchCount).toBe(1);
  });

  it("places the awarded patch on the member's cut", async () => {
    await approveActivityTx(ORG, "a1", "reviewer-uid");
    const cut = await orgRef(ORG).collection("cutLayouts").doc("m1").get();
    const front = cut.data()?.surfaces.front ?? [];
    expect(front.some((p: { refId: string }) => p.refId === "test-patch")).toBe(true);
  });

  it("rejects re-approval of an already-reviewed activity", async () => {
    await approveActivityTx(ORG, "a1", "reviewer-uid");
    await expect(approveActivityTx(ORG, "a1", "reviewer-uid")).rejects.toThrowError(
      EngineError,
    );
  });

  it("does not award below the threshold", async () => {
    await orgRef(ORG).collection("members").doc("m1").update({ "stats.clubRuns": 3 });
    const result = await approveActivityTx(ORG, "a1", "reviewer-uid");
    expect(result.newStatValue).toBe(4);
    expect(result.awardedPatchIds).toEqual([]);
  });

  it("never double-awards (composite id idempotency)", async () => {
    // Pre-award the patch, then cross the threshold again via approval.
    await orgRef(ORG).collection("awardedPatches").doc("m1_test-patch").set({
      memberId: "m1",
      patchId: "test-patch",
      awardedAt: Timestamp.now(),
      awardedBy: "system",
    });
    const result = await approveActivityTx(ORG, "a1", "reviewer-uid");
    expect(result.awardedPatchIds).toEqual([]); // already held ⇒ no re-award

    const member = await orgRef(ORG).collection("members").doc("m1").get();
    expect(member.data()?.patchCount).toBe(0); // count not double-bumped
  });
});

describe("manualAwardTx", () => {
  it("awards a manual patch with reason", async () => {
    const awarded = await manualAwardTx(ORG, "m1", "manual-patch", "prez-uid", "Held the line.");
    expect(awarded).toBe(true);

    const award = await orgRef(ORG)
      .collection("awardedPatches")
      .doc("m1_manual-patch")
      .get();
    expect(award.data()?.awardedBy).toBe("prez-uid");
    expect(award.data()?.reason).toBe("Held the line.");
  });

  it("returns false when the member already holds it", async () => {
    await manualAwardTx(ORG, "m1", "manual-patch", "prez-uid", "First.");
    const second = await manualAwardTx(ORG, "m1", "manual-patch", "prez-uid", "Again?");
    expect(second).toBe(false);
  });
});
