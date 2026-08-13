import "server-only";
import { FieldValue, adminDb, orgRef } from "@/lib/firebase/admin";
import { TREASURER_RANK_ID, formatMoney } from "@/lib/constants";
import type {
  SystemRole,
  TreasuryTransaction,
  TreasuryTxKind,
} from "@/lib/types";

/**
 * Transport-neutral club-bank operations, the treasury's mirror of
 * activities-core: the Server Actions in src/actions/treasury.ts and the
 * Discord handlers are both thin wrappers over this module, so a behaviour
 * change lands in one place and the two surfaces cannot drift.
 *
 * The lifecycle is the ticket lifecycle: anyone files a money movement
 * (dues, deposit, withdrawal), it sits pending, and a treasury reviewer
 * approves or denies. Only APPROVAL touches the balance, inside one
 * transaction with the account doc, so the running total can never disagree
 * with the ledger that produced it.
 *
 * Callers pass an actor resolved from their own authentication, never from
 * the payload — the same contract that keeps a caller from filing tickets as
 * someone else.
 */

/** Same shape as activities, its own counter: money tickets should not eat
 *  activity slots or vice versa. */
export const DAILY_TREASURY_CAP = 20;

/** organizations/{orgId}/treasury/account — the one balance doc. */
const ACCOUNT_DOC = "account";

export interface TreasuryActor {
  uid: string;
  memberId: string;
}

export interface SubmitTreasuryInput {
  orgId: string;
  kind: TreasuryTxKind;
  /** Whole positive dollars; kind carries the direction. */
  amount: number;
  note: string;
  /** Whose movement this is. The TRANSPORT decides whether the actor may name
   *  someone else; the core just records what it is handed. */
  subjectMemberId: string;
}

export class TreasuryError extends Error {
  constructor(
    public readonly code:
      | "daily_limit"
      | "tx_not_found"
      | "not_pending"
      | "insufficient_funds",
    /** insufficient_funds: what the bank actually holds, for the refusal line. */
    public readonly detail?: string,
  ) {
    super(code);
    this.name = "TreasuryError";
  }
}

/** Dues and deposits pay in; withdrawals pay out. */
export function txDelta(kind: TreasuryTxKind, amount: number): number {
  return kind === "withdrawal" ? -amount : amount;
}

/**
 * Who may approve or deny money movements: portal admins, and the member
 * sitting in the Treasurer seat. Deliberately NOT every officer — the club
 * asked for the book-keeper and the top table, nobody else.
 *
 * This is the one place club rank grants a permission. Both transports can
 * check it honestly (the rank rides on the member doc, which the session and
 * the account link both resolve), and it gates nothing but the treasury.
 * Discord roles still grant nothing, as everywhere else.
 */
export function canReviewTreasury(
  role: SystemRole,
  rankId: string | undefined,
): boolean {
  return role === "admin" || rankId === TREASURER_RANK_ID;
}

/**
 * The rank for a PERMISSION decision, read fresh. `getMember` is the right
 * read everywhere else, but it is cross-request cached, and money authority
 * should not outlive a demotion by a cache TTL — even one written outside the
 * app, which no tag ever clears. One document per review click is nothing.
 */
export async function memberRankFresh(
  orgId: string,
  memberId: string,
): Promise<string | undefined> {
  const snap = await orgRef(orgId).collection("members").doc(memberId).get();
  return snap.data()?.rankId as string | undefined;
}

/**
 * File a pending money movement. The rate-limit bump and the transaction
 * write share one transaction, so a slot is only consumed when the ticket is
 * actually created — same shape as activity submission, separate counter.
 */
export async function submitTreasuryTxCore(
  actor: TreasuryActor,
  input: SubmitTreasuryInput,
): Promise<{ txId: string }> {
  const { orgId } = input;
  const day = new Date().toISOString().slice(0, 10);
  const capRef = adminDb.doc(
    `organizations/${orgId}/rateLimits/${actor.uid}_treasury_${day}`,
  );
  const txRef = orgRef(orgId).collection("treasuryTransactions").doc();

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(capRef);
    const count = (snap.data()?.count ?? 0) as number;
    if (count >= DAILY_TREASURY_CAP) throw new TreasuryError("daily_limit");
    tx.set(capRef, { count: count + 1 }, { merge: true });
    tx.set(txRef, {
      kind: input.kind,
      amount: input.amount,
      memberId: input.subjectMemberId,
      submittedByUid: actor.uid,
      note: input.note,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { txId: txRef.id };
}

export interface TreasuryApproval {
  kind: TreasuryTxKind;
  amount: number;
  memberId: string;
  /** The running total after this movement applied. */
  balance: number;
}

/**
 * Approve a pending movement: flip status, move the balance, stamp
 * balanceAfter, and for dues stamp the member's lastDuesPaidAt. One
 * transaction, reads before writes, so racing reviewers are settled the same
 * way racing officers are on activity tickets: the first commit wins and the
 * second is told it came second.
 *
 * A withdrawal the bank cannot cover is REFUSED, not applied negative. The
 * club's book should never show money leaving that was never there; if
 * leadership wants an overdraft, that is a rule change to make deliberately,
 * not a side effect of a big withdrawal.
 */
export async function approveTreasuryTxCore(
  orgId: string,
  txId: string,
  reviewerUid: string,
  reviewNote?: string,
): Promise<TreasuryApproval> {
  const org = orgRef(orgId);
  const txRef = org.collection("treasuryTransactions").doc(txId);
  const accountRef = org.collection("treasury").doc(ACCOUNT_DOC);

  return adminDb.runTransaction(async (tx) => {
    // ── reads ──
    const txSnap = await tx.get(txRef);
    if (!txSnap.exists) throw new TreasuryError("tx_not_found");
    const movement = txSnap.data() as TreasuryTransaction;
    if (movement.status !== "pending") throw new TreasuryError("not_pending");

    const accountSnap = await tx.get(accountRef);
    const balance = (accountSnap.data()?.balance ?? 0) as number;

    const memberRef = org.collection("members").doc(movement.memberId);
    // Dues stamp the member's record; the read must precede every write. A
    // vanished member (deleted since filing) just skips the stamp.
    const memberSnap =
      movement.kind === "dues" ? await tx.get(memberRef) : null;

    const next = balance + txDelta(movement.kind, movement.amount);
    if (next < 0) {
      throw new TreasuryError("insufficient_funds", String(balance));
    }

    // ── writes ──
    tx.update(txRef, {
      status: "approved",
      reviewedBy: reviewerUid,
      reviewedAt: FieldValue.serverTimestamp(),
      balanceAfter: next,
      ...(reviewNote ? { reviewNote } : {}),
    });
    tx.set(
      accountRef,
      { balance: next, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    if (memberSnap?.exists) {
      tx.update(memberRef, { lastDuesPaidAt: FieldValue.serverTimestamp() });
    }
    tx.set(org.collection("auditLogs").doc(), {
      actorUid: reviewerUid,
      action: "treasury.approve",
      targetPath: txRef.path,
      detail: `${movement.kind} ${formatMoney(movement.amount)}; balance ${formatMoney(next)}`,
      at: FieldValue.serverTimestamp(),
    });

    return {
      kind: movement.kind,
      amount: movement.amount,
      memberId: movement.memberId,
      balance: next,
    };
  });
}

/** Deny a pending movement: status flip + audit log. Never touches the
 *  balance. Same error family as approval, so transports handle one shape. */
export async function denyTreasuryTxCore(
  orgId: string,
  txId: string,
  reviewerUid: string,
  reviewNote?: string,
): Promise<void> {
  const org = orgRef(orgId);
  const txRef = org.collection("treasuryTransactions").doc(txId);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(txRef);
    if (!snap.exists) throw new TreasuryError("tx_not_found");
    if (snap.data()?.status !== "pending") throw new TreasuryError("not_pending");
    tx.update(txRef, {
      status: "denied",
      reviewedBy: reviewerUid,
      reviewedAt: FieldValue.serverTimestamp(),
      ...(reviewNote ? { reviewNote } : {}),
    });
    tx.set(org.collection("auditLogs").doc(), {
      actorUid: reviewerUid,
      action: "treasury.deny",
      targetPath: txRef.path,
      ...(reviewNote ? { detail: reviewNote } : {}),
      at: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Dues currency for the Dues Roll: paid if the last approved dues payment
 * landed inside the current UTC calendar month. Derived from the stamp
 * approval writes, so the roll costs zero extra reads beyond the member list.
 *
 * UTC getters on purpose, so the answer does not depend on where the server
 * happens to run. Two edges to know about, both accepted: the roll flips to
 * "Due" at the UTC month boundary (an evening hour in the US), and a payment
 * credits the month it is APPROVED in, not the month it was filed — a payment
 * is not real until a reviewer says so, same as every other ticket.
 */
export function isDuesCurrent(
  // Structural on purpose: the stamp arrives as an admin Timestamp, a client
  // Timestamp after a cache round trip, or a plain Date in tests.
  member: { lastDuesPaidAt?: unknown },
  now: Date = new Date(),
): boolean {
  const at = member.lastDuesPaidAt;
  const paid =
    at instanceof Date
      ? at
      : typeof (at as { toDate?: () => Date } | null | undefined)?.toDate === "function"
        ? (at as { toDate: () => Date }).toDate()
        : null;
  if (!paid) return false;
  return (
    paid.getUTCFullYear() === now.getUTCFullYear() &&
    paid.getUTCMonth() === now.getUTCMonth()
  );
}
