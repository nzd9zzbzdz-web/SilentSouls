"use server";

import { revalidatePath } from "next/cache";
import { FieldValue, adminDb, orgRef } from "@/lib/firebase/admin";
import { requireOrgRole } from "@/lib/auth/session";
import { approveActivityTx, EngineError, type EngineResult } from "@/lib/patch-engine";
import {
  reviewActivitySchema,
  submitActivitySchema,
  type ReviewActivityInput,
  type SubmitActivityInput,
} from "@/lib/schemas/activity";
import type { ActivityType } from "@/lib/types";

const DAILY_SUBMISSION_CAP = 20;

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

/** Member submits an activity for officer review. */
export async function submitActivity(
  raw: SubmitActivityInput,
): Promise<ActionResult<{ activityId: string }>> {
  const parsed = submitActivitySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  try {
    const access = await requireOrgRole(input.orgId, "member");
    if (!access.memberId) return { ok: false, error: "No member record" };

    // Validate the activity type BEFORE touching the rate-limit counter, so an
    // invalid submission never burns a daily slot.
    const typeSnap = await orgRef(input.orgId)
      .collection("activityTypes")
      .doc(input.typeId)
      .get();
    if (!typeSnap.exists) return { ok: false, error: "Unknown activity type" };
    const type = typeSnap.data() as ActivityType;
    if (!type.active) return { ok: false, error: "Activity type is disabled" };
    if (type.requiresProof && !input.proofPath) {
      return { ok: false, error: `${type.name} requires proof (photo or clip)` };
    }

    // Rate cap (≤20/day/uid) and the activity write happen in ONE transaction:
    // the slot is consumed only if the activity is actually created.
    const day = new Date().toISOString().slice(0, 10);
    const capRef = adminDb.doc(
      `organizations/${input.orgId}/rateLimits/${access.user.uid}_submit_${day}`,
    );
    const activityRef = orgRef(input.orgId).collection("activities").doc();

    const created = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(capRef);
      const count = (snap.data()?.count ?? 0) as number;
      if (count >= DAILY_SUBMISSION_CAP) return false;
      tx.set(capRef, { count: count + 1 }, { merge: true });
      tx.set(activityRef, {
        memberId: access.memberId,
        typeId: input.typeId,
        statKey: type.statKey, // denormalized at submit time
        date: input.date,
        description: input.description,
        quantity: type.allowQuantity ? input.quantity : 1,
        witnesses: input.witnesses,
        ...(input.proofPath ? { proofPath: input.proofPath } : {}),
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (!created) return { ok: false, error: "Daily submission limit reached" };

    revalidatePath(`/[orgSlug]/portal/activities`, "page");
    return { ok: true, data: { activityId: activityRef.id } };
  } catch (e) {
    return failure(e);
  }
}

/** Officer approves or denies a pending activity. Approval runs the patch engine. */
export async function reviewActivity(
  raw: ReviewActivityInput,
): Promise<ActionResult<EngineResult | undefined>> {
  const parsed = reviewActivitySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { orgId, activityId, decision, reviewNote } = parsed.data;

  try {
    const access = await requireOrgRole(orgId, "officer");

    if (decision === "approved") {
      const result = await approveActivityTx(orgId, activityId, access.user.uid, reviewNote);
      revalidatePath(`/[orgSlug]/portal/activities/review`, "page");
      return { ok: true, data: result };
    }

    // Denial: single status flip + audit.
    const ref = orgRef(orgId).collection("activities").doc(activityId);
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new EngineError("activity_not_found");
      if (snap.data()?.status !== "pending") throw new EngineError("not_pending");
      tx.update(ref, {
        status: "denied",
        reviewedBy: access.user.uid,
        reviewedAt: FieldValue.serverTimestamp(),
        ...(reviewNote ? { reviewNote } : {}),
      });
      tx.set(orgRef(orgId).collection("auditLogs").doc(), {
        actorUid: access.user.uid,
        action: "activity.deny",
        targetPath: ref.path,
        ...(reviewNote ? { detail: reviewNote } : {}),
        at: FieldValue.serverTimestamp(),
      });
    });

    revalidatePath(`/[orgSlug]/portal/activities/review`, "page");
    return { ok: true, data: undefined };
  } catch (e) {
    return failure(e);
  }
}

function failure(e: unknown): { ok: false; error: string } {
  if (e instanceof EngineError) {
    const messages: Record<string, string> = {
      activity_not_found: "Activity not found",
      not_pending: "This activity was already reviewed",
      member_not_found: "Member record not found",
    };
    return { ok: false, error: messages[e.code] ?? e.code };
  }
  if (e instanceof Error && e.name === "AuthError") {
    return { ok: false, error: e.message === "unauthenticated" ? "Sign in required" : "Not permitted" };
  }
  console.error(e);
  return { ok: false, error: "Something went wrong" };
}
