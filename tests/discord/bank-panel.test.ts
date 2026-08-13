/**
 * The in-channel Club Bank card: its payload shape, the dropdown that opens
 * each form, and the form submission filing a real pending movement.
 *
 * The card carries a live balance, so the shape tests pin that the number is
 * actually rendered (a card that silently drops it would read as $0 to the
 * whole channel). Against the Firestore emulator; isolated project and org.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "discord-bankpanel-test-isolated";
process.env.DISCORD_ORG_ID = "discord-bankpanel-test-org";

const { adminDb, orgRef, Timestamp } = await import("@/lib/firebase/admin");
const { handleComponent, handleModalSubmit } = await import(
  "@/lib/discord/interactions"
);
const { buildBankPanelMessage, buildBankModal, isTxKind, BANK_ACTIONS } =
  await import("@/lib/discord/bank-panel");

const ORG = "discord-bankpanel-test-org";

function select(orgId: string, value: string, user: { id: string }) {
  return {
    type: 3,
    data: { custom_id: `bank:${orgId}`, values: [value] },
    member: { user },
  };
}

/** A modal submit in the current Label-wrapped shape. */
function form(
  orgId: string,
  kind: string,
  fields: Record<string, string>,
  user: { id: string },
) {
  return {
    type: 5,
    data: {
      custom_id: `bankform:${orgId}:${kind}`,
      components: Object.entries(fields).map(([custom_id, value]) => ({
        type: 18,
        component: { type: 4, custom_id, value },
      })),
    },
    member: { user },
  };
}

async function wipe(collection: string) {
  const snap = await adminDb.collection(collection).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}

beforeEach(async () => {
  await adminDb.recursiveDelete(orgRef(ORG));
  await wipe("users");

  await orgRef(ORG).set({ name: "Bank Card MC", slug: ORG, status: "active", memberCount: 1 });
  await orgRef(ORG).collection("members").doc("m1").set({
    uid: "u1",
    displayName: "Marcus Vane",
    roadName: "Reaper",
    rankId: "patched-member",
    status: "patched",
    joinDate: Timestamp.now(),
    memberNumber: 1,
    stats: {},
    patchCount: 0,
    createdAt: Timestamp.now(),
  });
  await adminDb.collection("users").doc("u1").set({
    email: "reaper@test.rp",
    displayName: "Marcus Vane",
    memberships: { [ORG]: { memberId: "m1", role: "member" } },
    discordId: "D1",
    createdAt: Timestamp.now(),
  });
});

afterAll(async () => {
  await adminDb.recursiveDelete(orgRef(ORG));
  await wipe("users");
});

describe("card payload", () => {
  it("renders the live balance and all four dropdown options", () => {
    const msg = buildBankPanelMessage({
      orgId: ORG,
      orgName: "Bank Card MC",
      balance: 12_500,
      accentColor: 0x8b0000,
    });
    const json = JSON.stringify(msg);

    expect(msg.flags).toBe(32768); // Components V2
    expect(json).toContain("$12,500");
    expect(json).toContain("Club Bank");
    expect(json).toContain("Bank Card MC");

    const container = (msg.components as Record<string, unknown>[])[0];
    expect(container.accent_color).toBe(0x8b0000);

    const row = (container.components as Record<string, unknown>[]).find(
      (c) => c.type === 1,
    )!;
    const menu = (row.components as Record<string, unknown>[])[0];
    expect(menu.custom_id).toBe(`bank:${ORG}`);
    expect((menu.options as { value: string }[]).map((o) => o.value)).toEqual([
      "dues",
      "deposit",
      "withdrawal",
      "balance",
    ]);
  });

  it("omits the accent when the club has no plain hex colour", () => {
    const msg = buildBankPanelMessage({
      orgId: ORG,
      orgName: "X",
      balance: 0,
      accentColor: null,
    });
    const container = (msg.components as Record<string, unknown>[])[0];
    expect("accent_color" in container).toBe(false);
  });

  it("requires a note on money in and out, but not on dues", () => {
    const noteOf = (kind: "dues" | "deposit" | "withdrawal") => {
      const modal = buildBankModal(ORG, kind);
      const labels = modal.components as Record<string, unknown>[];
      const note = labels.find(
        (l) => (l.component as { custom_id: string }).custom_id === "note",
      )!;
      return note.component as { required: boolean };
    };
    expect(noteOf("dues").required).toBe(false);
    expect(noteOf("deposit").required).toBe(true);
    expect(noteOf("withdrawal").required).toBe(true);
    expect(buildBankModal(ORG, "dues").custom_id).toBe(`bankform:${ORG}:dues`);
  });

  it("isTxKind accepts only the three real kinds", () => {
    expect(BANK_ACTIONS.map((a) => a.value).filter(isTxKind)).toEqual([
      "dues",
      "deposit",
      "withdrawal",
    ]);
    expect(isTxKind("balance")).toBe(false);
  });
});

describe("dropdown", () => {
  it("opens the form for a movement", async () => {
    const res = await handleComponent(select(ORG, "withdrawal", { id: "D1" }));
    expect(res.type).toBe(9); // modal
    expect(res.data?.custom_id).toBe(`bankform:${ORG}:withdrawal`);
  });

  it("reads the account back for the balance option", async () => {
    await orgRef(ORG)
      .collection("treasury")
      .doc("account")
      .set({ balance: 900, updatedAt: Timestamp.now() });
    const res = await handleComponent(select(ORG, "balance", { id: "D1" }));
    expect(res.type).toBe(4);
    expect(res.data?.content).toContain("$900");
    expect(res.data?.flags).toBe(64); // ephemeral
  });

  it("turns away an unlinked clicker", async () => {
    const res = await handleComponent(select(ORG, "dues", { id: "D404" }));
    expect(res.data?.content).toContain("/link");
  });
});

describe("form submission", () => {
  it("files a pending movement for the submitter", async () => {
    const res = await handleModalSubmit(
      form(ORG, "deposit", { amount: "2,000", note: "docks cut" }, { id: "D1" }),
    );
    expect(res.data?.content).toContain("$2,000");

    const txs = await orgRef(ORG).collection("treasuryTransactions").get();
    expect(txs.size).toBe(1);
    expect(txs.docs[0].data()).toMatchObject({
      kind: "deposit",
      amount: 2000, // commas and $ stripped
      memberId: "m1",
      submittedByUid: "u1",
      note: "docks cut",
      status: "pending",
    });
    // Filing never moves the balance.
    const account = await orgRef(ORG).collection("treasury").doc("account").get();
    expect(account.exists).toBe(false);
  });

  it("rejects a non-numeric amount without writing", async () => {
    const res = await handleModalSubmit(
      form(ORG, "dues", { amount: "five hundred", note: "" }, { id: "D1" }),
    );
    expect(res.data?.content).toContain("whole number");
    expect((await orgRef(ORG).collection("treasuryTransactions").get()).size).toBe(0);
  });

  it("enforces the note rule the website enforces", async () => {
    const res = await handleModalSubmit(
      form(ORG, "withdrawal", { amount: "100", note: "" }, { id: "D1" }),
    );
    expect(res.data?.content).toContain("what the money is for");
    expect((await orgRef(ORG).collection("treasuryTransactions").get()).size).toBe(0);
  });

  it("takes dues with no note at all", async () => {
    const res = await handleModalSubmit(
      form(ORG, "dues", { amount: "500" }, { id: "D1" }),
    );
    expect(res.data?.content).toContain("Dues payment");
    const txs = await orgRef(ORG).collection("treasuryTransactions").get();
    expect(txs.docs[0].data()).toMatchObject({ kind: "dues", amount: 500, note: "" });
  });

  it("refuses a malformed form id", async () => {
    const res = await handleModalSubmit(
      form(ORG, "sideways", { amount: "1" }, { id: "D1" }),
    );
    expect(res.data?.content).toBe("Unsupported form.");
  });
});
