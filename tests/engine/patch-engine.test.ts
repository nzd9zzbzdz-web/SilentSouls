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
  // A three-rung ladder on one stat — enough to exercise superseding without
  // restating all five tiers the real criminal-record ladders ship with.
  const ladder = [
    { id: "rung-1", threshold: 5 },
    { id: "rung-2", threshold: 10 },
    { id: "rung-3", threshold: 50 },
  ];
  for (const [i, rung] of ladder.entries()) {
    await org.collection("patches").doc(rung.id).set({
      name: `Rung ${i + 1}`,
      category: "activity",
      description: `${rung.threshold} heists`,
      tier: i + 1,
      requirement: { statKey: "heistsCompleted", threshold: rung.threshold },
      manual: false,
      active: true,
      // Every rung shares one spot — the ladder owns it, the top tier wears it.
      defaultPlacement: { surface: "back", u: 0.7, v: 0.72, scale: 0.8, rotationDeg: 0 },
    });
  }
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

describe("ladder superseding", () => {
  /** refIds of patches currently placed on a surface of m1's cut. */
  async function wornOn(surface: "front" | "back"): Promise<string[]> {
    const cut = await orgRef(ORG).collection("cutLayouts").doc("m1").get();
    return (cut.data()?.surfaces?.[surface] ?? [])
      .filter((p: { kind: string }) => p.kind === "patch")
      .map((p: { refId: string }) => p.refId);
  }

  async function logHeists(id: string, quantity: number) {
    await orgRef(ORG).collection("activities").doc(id).set({
      memberId: "m1",
      typeId: "heist-completed",
      statKey: "heistsCompleted",
      date: Timestamp.now(),
      description: "test heist",
      quantity,
      witnesses: [],
      status: "pending",
      createdAt: Timestamp.now(),
    });
    return approveActivityTx(ORG, id, "reviewer-uid");
  }

  it("awards every rung crossed but wears only the top one", async () => {
    const result = await logHeists("h1", 12); // clears rungs 1 and 2 at once
    expect(result.awardedPatchIds.sort()).toEqual(["rung-1", "rung-2"]);

    // Both awards are real history...
    for (const id of ["rung-1", "rung-2"]) {
      const award = await orgRef(ORG).collection("awardedPatches").doc(`m1_${id}`).get();
      expect(award.exists).toBe(true);
    }
    // ...but the cut shows where they got to, not every step.
    expect(await wornOn("back")).toEqual(["rung-2"]);
  });

  it("replaces the worn rung when the next one lands later", async () => {
    await logHeists("h1", 6); // rung 1
    expect(await wornOn("back")).toEqual(["rung-1"]);

    await logHeists("h2", 5); // 11 total ⇒ rung 2
    expect(await wornOn("back")).toEqual(["rung-2"]);

    // The superseded rung stays earned — it just isn't on the vest.
    const old = await orgRef(ORG).collection("awardedPatches").doc("m1_rung-1").get();
    expect(old.exists).toBe(true);
    const member = await orgRef(ORG).collection("members").doc("m1").get();
    expect(member.data()?.patchCount).toBe(2);
  });

  it("leaves other ladders alone when one supersedes", async () => {
    await approveActivityTx(ORG, "a1", "reviewer-uid"); // clubRuns patch, front
    await logHeists("h1", 12);
    expect(await wornOn("front")).toEqual(["test-patch"]);
    expect(await wornOn("back")).toEqual(["rung-2"]);
  });

  it("does not demote the cut when a lower rung is awarded by hand", async () => {
    await logHeists("h1", 12); // wearing rung 2
    const awarded = await manualAwardTx(ORG, "m1", "rung-1", "prez-uid", "Backdated.");
    expect(awarded).toBe(false); // already held

    await orgRef(ORG).collection("awardedPatches").doc("m1_rung-1").delete();
    const regranted = await manualAwardTx(ORG, "m1", "rung-1", "prez-uid", "Backdated.");
    expect(regranted).toBe(true);
    expect(await wornOn("back")).toEqual(["rung-2"]); // still the higher rung
  });

  it("wears a hand-granted rung that outranks what the member has", async () => {
    await logHeists("h1", 6); // rung 1
    await manualAwardTx(ORG, "m1", "rung-3", "prez-uid", "Earned it the hard way.");
    expect(await wornOn("back")).toEqual(["rung-3"]);
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
