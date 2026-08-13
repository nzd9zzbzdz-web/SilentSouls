/**
 * The web transport for the club bank — what the Server Actions add on top of
 * the core: the review permission matrix (admins and the Treasurer seat, not
 * officers), and the filing-for-someone-else gate.
 *
 * Requires emulators running; isolated project.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "treasury-actions-test-isolated";

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  updateTag: () => {},
  unstable_cache: (fn: unknown) => fn,
}));

// The caller each test impersonates; requireOrgRole hands it straight back.
const caller = {
  user: { uid: "u1" },
  role: "member" as "member" | "officer" | "admin",
  memberId: "m1" as string | null,
  isSuper: false,
};
vi.mock("@/lib/auth/session", () => ({
  requireOrgRole: async () => ({ ...caller }),
}));

const { adminDb, orgRef, Timestamp } = await import("@/lib/firebase/admin");
const { reviewTreasuryTx, submitTreasuryTx } = await import("@/actions/treasury");

const ORG = "treasury-actions-test-org";

async function addMember(id: string, uid: string | null, rankId: string) {
  await orgRef(ORG).collection("members").doc(id).set({
    uid,
    displayName: id,
    roadName: id,
    rankId,
    status: "patched",
    joinDate: Timestamp.now(),
    memberNumber: 1,
    stats: {},
    patchCount: 0,
    createdAt: Timestamp.now(),
  });
}

async function seedPending(id: string, fields: Record<string, unknown> = {}) {
  await orgRef(ORG).collection("treasuryTransactions").doc(id).set({
    kind: "dues",
    amount: 500,
    memberId: "m1",
    submittedByUid: "u1",
    note: "",
    status: "pending",
    createdAt: Timestamp.now(),
    ...fields,
  });
}

async function balance(): Promise<number> {
  const snap = await orgRef(ORG).collection("treasury").doc("account").get();
  return (snap.data()?.balance ?? 0) as number;
}

beforeEach(async () => {
  await adminDb.recursiveDelete(orgRef(ORG));
  await orgRef(ORG).set({ name: "Treasury Actions Test", slug: ORG, memberCount: 3 });
  await addMember("m1", "u1", "patched-member");
  await addMember("m2", "u2", "treasurer");
  await addMember("m3", "u3", "road-captain");
  caller.user = { uid: "u1" };
  caller.role = "member";
  caller.memberId = "m1";
});

afterAll(async () => {
  await adminDb.recursiveDelete(orgRef(ORG));
});

describe("submitTreasuryTx", () => {
  it("files the caller's own movement", async () => {
    const res = await submitTreasuryTx({
      orgId: ORG,
      kind: "dues",
      amount: 500,
      note: "",
    });
    expect(res.ok).toBe(true);
    const tx = await orgRef(ORG)
      .collection("treasuryTransactions")
      .doc(res.data!.txId)
      .get();
    expect(tx.data()).toMatchObject({ kind: "dues", amount: 500, memberId: "m1" });
  });

  it("refuses a plain member filing for someone else", async () => {
    const res = await submitTreasuryTx({
      orgId: ORG,
      kind: "dues",
      amount: 500,
      note: "",
      subjectMemberId: "m3",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("reviewer");
    expect((await orgRef(ORG).collection("treasuryTransactions").get()).size).toBe(0);
  });

  it("lets the Treasurer seat file cash dues against another member", async () => {
    caller.user = { uid: "u2" };
    caller.memberId = "m2";
    const res = await submitTreasuryTx({
      orgId: ORG,
      kind: "dues",
      amount: 500,
      note: "cash at church",
      subjectMemberId: "m3",
    });
    expect(res.ok).toBe(true);
    const tx = await orgRef(ORG)
      .collection("treasuryTransactions")
      .doc(res.data!.txId)
      .get();
    expect(tx.data()).toMatchObject({ memberId: "m3", submittedByUid: "u2" });
  });

  it("refuses filing a NON-dues movement for someone else, even for a reviewer", async () => {
    // The stale-form-state case: a reviewer's dues pick must never ride along
    // onto a withdrawal. The client guards it; the action is the authority.
    caller.role = "admin";
    const res = await submitTreasuryTx({
      orgId: ORG,
      kind: "withdrawal",
      amount: 100,
      note: "ammo run",
      subjectMemberId: "m3",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Only dues");
    expect((await orgRef(ORG).collection("treasuryTransactions").get()).size).toBe(0);
  });

  it("refuses filing for a member who does not exist", async () => {
    caller.role = "admin";
    const res = await submitTreasuryTx({
      orgId: ORG,
      kind: "dues",
      amount: 500,
      note: "",
      subjectMemberId: "ghost",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("does not exist");
  });

  it("rejects a zero, negative, or fractional amount", async () => {
    for (const amount of [0, -5, 2.5]) {
      const res = await submitTreasuryTx({ orgId: ORG, kind: "dues", amount, note: "" });
      expect(res.ok).toBe(false);
    }
  });

  it("requires a note on deposits and withdrawals", async () => {
    const res = await submitTreasuryTx({
      orgId: ORG,
      kind: "withdrawal",
      amount: 100,
      note: "",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("what the money is for");
  });
});

describe("reviewTreasuryTx permissions", () => {
  it("refuses a plain member", async () => {
    await seedPending("t1");
    const res = await reviewTreasuryTx({ orgId: ORG, txId: "t1", decision: "approved" });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("admin or the Treasurer");
    expect(await balance()).toBe(0);
  });

  it("refuses an officer who is not the Treasurer", async () => {
    caller.user = { uid: "u3" };
    caller.role = "officer";
    caller.memberId = "m3";
    await seedPending("t1");
    const res = await reviewTreasuryTx({ orgId: ORG, txId: "t1", decision: "approved" });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("admin or the Treasurer");
  });

  it("lets the Treasurer seat approve, moving the balance", async () => {
    caller.user = { uid: "u2" };
    caller.memberId = "m2";
    await seedPending("t1");
    const res = await reviewTreasuryTx({ orgId: ORG, txId: "t1", decision: "approved" });
    expect(res.ok).toBe(true);
    expect(res.data?.balance).toBe(500);
    expect(await balance()).toBe(500);
  });

  it("lets an admin deny with a note", async () => {
    caller.role = "admin";
    await seedPending("t1");
    const res = await reviewTreasuryTx({
      orgId: ORG,
      txId: "t1",
      decision: "denied",
      reviewNote: "already logged",
    });
    expect(res.ok).toBe(true);
    const tx = await orgRef(ORG).collection("treasuryTransactions").doc("t1").get();
    expect(tx.data()).toMatchObject({ status: "denied", reviewNote: "already logged" });
    expect(await balance()).toBe(0);
  });

  it("surfaces insufficient funds as a plain refusal", async () => {
    caller.role = "admin";
    await seedPending("t1", { kind: "withdrawal", amount: 900, note: "too rich" });
    const res = await reviewTreasuryTx({ orgId: ORG, txId: "t1", decision: "approved" });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("The bank holds $0");
  });

  it("reports an already-reviewed movement", async () => {
    caller.role = "admin";
    await seedPending("t1", { status: "approved", reviewedBy: "someone" });
    const res = await reviewTreasuryTx({ orgId: ORG, txId: "t1", decision: "approved" });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("already reviewed");
  });
});
