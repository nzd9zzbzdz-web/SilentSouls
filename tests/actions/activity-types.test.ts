/**
 * The admin "add missing default types" action. This is the only way an org
 * created before a type existed can get it — the seeder only runs on a
 * destructive reseed — so the idempotency and don't-clobber behaviour matters.
 *
 * Requires emulators running; isolated project.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "activity-types-test-isolated";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/auth/session", () => ({
  requireOrgRole: async () => ({
    user: { uid: "admin-1" },
    role: "admin",
    memberId: "m1",
    isSuper: false,
  }),
}));

const { adminDb, orgRef, Timestamp } = await import("@/lib/firebase/admin");
const { syncDefaultActivityTypes } = await import("@/actions/activity-types");
const { defaultActivityTypes } = await import("@/lib/criminal-record");
const { CRIMINAL_ACTIVITY_TYPE_SEEDS } = await import("@/lib/constants");

const ORG = "activity-types-test-org";

async function typeIds(): Promise<string[]> {
  const snap = await orgRef(ORG).collection("activityTypes").get();
  return snap.docs.map((d) => d.id).sort();
}

beforeEach(async () => {
  await adminDb.recursiveDelete(orgRef(ORG));
  await orgRef(ORG).set({ name: "Sync Test", slug: ORG, memberCount: 0 });
});
afterAll(async () => {
  await adminDb.recursiveDelete(orgRef(ORG));
});

describe("syncDefaultActivityTypes", () => {
  it("installs every shipped type into an empty org", async () => {
    const res = await syncDefaultActivityTypes(ORG);
    expect(res.ok).toBe(true);
    expect(res.data!.created).toHaveLength(defaultActivityTypes().length);
    expect(await typeIds()).toEqual(defaultActivityTypes().map((t) => t.id).sort());
  });

  it("adds only what is missing — the production case", async () => {
    // Org has the club types but not the criminal ones: exactly the state of a
    // club seeded before the Criminal Record shipped.
    for (const t of defaultActivityTypes()) {
      if (CRIMINAL_ACTIVITY_TYPE_SEEDS.some((c) => c.id === t.id)) continue;
      await orgRef(ORG).collection("activityTypes").doc(t.id).set({
        name: t.name,
        statKey: t.statKey,
        requiresProof: t.requiresProof,
        allowQuantity: t.allowQuantity,
        defaultQuantity: 1,
        icon: t.icon,
        active: true,
        order: 1,
      });
    }

    const res = await syncDefaultActivityTypes(ORG);
    expect(res.data!.created).toHaveLength(CRIMINAL_ACTIVITY_TYPE_SEEDS.length);
    expect(res.data!.created).toContain("Heist Completed");
    expect(await typeIds()).toEqual(defaultActivityTypes().map((t) => t.id).sort());
  });

  it("is idempotent — a second run adds nothing", async () => {
    await syncDefaultActivityTypes(ORG);
    const res = await syncDefaultActivityTypes(ORG);
    expect(res.data!.created).toEqual([]);
    expect(res.data!.alreadyPresent).toBe(defaultActivityTypes().length);
  });

  it("leaves an admin's edits to an existing type alone", async () => {
    await orgRef(ORG).collection("activityTypes").doc("club-ride").set({
      name: "Sunday Run",
      statKey: "clubRuns",
      requiresProof: false, // admin turned proof off
      allowQuantity: false,
      defaultQuantity: 1,
      icon: "bike",
      active: false, // and disabled it
      order: 1,
    });

    await syncDefaultActivityTypes(ORG);

    const doc = await orgRef(ORG).collection("activityTypes").doc("club-ride").get();
    expect(doc.data()?.name).toBe("Sunday Run");
    expect(doc.data()?.active).toBe(false);
    expect(doc.data()?.requiresProof).toBe(false);
  });

  it("folds a legacy rap sheet into stats without clobbering logged ones", async () => {
    await orgRef(ORG).collection("members").doc("m1").set({
      uid: null,
      displayName: "Legacy Member",
      roadName: "Legacy",
      rankId: "patched",
      status: "patched",
      joinDate: Timestamp.now(),
      memberNumber: 1,
      patchCount: 0,
      createdAt: Timestamp.now(),
      // heistsCompleted already has an approved log behind it.
      stats: { clubRuns: 5, heistsCompleted: 2 },
      rapSheet: [
        { label: "Crimes Committed", value: "187" },
        { label: "Heists Completed", value: "12" },
        { label: "Jail Time Served", value: "96 mo" },
        { label: "Dirty Money Earned", value: "$2.4M" },
      ],
    });

    const res = await syncDefaultActivityTypes(ORG);
    expect(res.data!.membersMigrated).toBe(1);

    const stats = (await orgRef(ORG).collection("members").doc("m1").get()).data()!.stats;
    expect(stats.crimesCommitted).toBe(187);
    expect(stats.jailTimeMonths).toBe(96);
    expect(stats.dirtyMoneyEarned).toBe(2_400_000);
    expect(stats.heistsCompleted).toBe(2); // approved log wins over the typed value
    expect(stats.clubRuns).toBe(5); // untouched
  });
});
