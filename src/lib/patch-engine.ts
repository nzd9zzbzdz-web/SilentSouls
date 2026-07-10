import "server-only";
import { adminDb, FieldValue, Timestamp, orgRef } from "@/lib/firebase/admin";
import type {
  Activity,
  CutLayout,
  CutPlacement,
  Member,
  Patch,
  StatKey,
} from "@/lib/types";
import { checkMilestones } from "@/lib/milestones";

export interface EngineResult {
  memberId: string;
  statKey: StatKey;
  newStatValue: number;
  awardedPatchIds: string[];
}

/** Active, requirement-bearing patches — fetched outside the transaction (they change rarely). */
async function getCandidatePatches(orgId: string): Promise<Patch[]> {
  const snap = await orgRef(orgId)
    .collection("patches")
    .where("active", "==", true)
    .get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Patch, "id">) }))
    .filter((p) => p.requirement !== null);
}

/** Nudge v downward until the spot isn't occupied (simple collision avoidance). */
function placeOnCut(
  layout: CutLayout,
  placement: Omit<CutPlacement, "zIndex" | "mirrored">,
): CutPlacement {
  const surface = layout.surfaces[placement.surface];
  let { u, v } = placement;
  const occupied = (uu: number, vv: number) =>
    surface.some((p) => Math.abs(p.u - uu) < 0.05 && Math.abs(p.v - vv) < 0.05);
  while (occupied(u, v) && v < 0.95) v += 0.06;
  return { ...placement, u, v, zIndex: surface.length + 1, mirrored: false };
}

const EMPTY_LAYOUT: CutLayout = {
  surfaces: { front: [], back: [] },
  updatedAt: new Date(),
};

/**
 * Approve a pending activity: flip status, bump the member's stat, evaluate
 * patch requirements, award idempotently (composite doc id memberId_patchId),
 * and place new patches on the member's cut. Single Firestore transaction —
 * reads strictly before writes.
 */
export async function approveActivityTx(
  orgId: string,
  activityId: string,
  reviewerUid: string,
  reviewNote?: string,
): Promise<EngineResult> {
  const candidates = await getCandidatePatches(orgId);
  const org = orgRef(orgId);
  const activityRef = org.collection("activities").doc(activityId);

  const result = await adminDb.runTransaction(async (tx) => {
    // ── reads ──
    const aSnap = await tx.get(activityRef);
    if (!aSnap.exists) throw new EngineError("activity_not_found");
    const activity = aSnap.data() as Activity;
    if (activity.status !== "pending") throw new EngineError("not_pending");

    const memberRef = org.collection("members").doc(activity.memberId);
    const mSnap = await tx.get(memberRef);
    if (!mSnap.exists) throw new EngineError("member_not_found");
    const member = mSnap.data() as Member;

    const quantity = activity.quantity ?? 1;
    const statKey = activity.statKey;
    const newStat = (member.stats?.[statKey] ?? 0) + quantity;

    const relevant = candidates.filter(
      (p) => p.requirement!.statKey === statKey && newStat >= p.requirement!.threshold,
    );
    const awardRefs = relevant.map((p) =>
      org.collection("awardedPatches").doc(`${activity.memberId}_${p.id}`),
    );
    const awardSnaps = await Promise.all(awardRefs.map((r) => tx.get(r)));
    const newAwards = relevant.filter((_, i) => !awardSnaps[i].exists);

    const cutRef = org.collection("cutLayouts").doc(activity.memberId);
    const cutSnap = newAwards.length ? await tx.get(cutRef) : null;

    // ── writes ──
    tx.update(activityRef, {
      status: "approved",
      reviewedBy: reviewerUid,
      reviewedAt: FieldValue.serverTimestamp(),
      ...(reviewNote ? { reviewNote } : {}),
    });

    tx.update(memberRef, {
      [`stats.${statKey}`]: newStat,
      patchCount: (member.patchCount ?? 0) + newAwards.length,
      lastActivityAt: FieldValue.serverTimestamp(),
    });

    if (newAwards.length) {
      const layout: CutLayout = cutSnap?.exists
        ? (cutSnap.data() as CutLayout)
        : structuredClone(EMPTY_LAYOUT);
      for (const p of newAwards) {
        tx.set(org.collection("awardedPatches").doc(`${activity.memberId}_${p.id}`), {
          memberId: activity.memberId,
          patchId: p.id,
          awardedAt: FieldValue.serverTimestamp(),
          awardedBy: "system",
          activityId,
        });
        const placement = placeOnCut(layout, {
          kind: "patch",
          refId: p.id,
          ...p.defaultPlacement,
        });
        layout.surfaces[placement.surface].push(placement);
      }
      tx.set(cutRef, { ...layout, updatedAt: Timestamp.now() });
    }

    tx.set(org.collection("auditLogs").doc(), {
      actorUid: reviewerUid,
      action: "activity.approve",
      targetPath: activityRef.path,
      detail: `${statKey} +${quantity}; awards: ${newAwards.map((p) => p.name).join(", ") || "none"}`,
      at: FieldValue.serverTimestamp(),
    });

    return {
      memberId: activity.memberId,
      statKey,
      newStatValue: newStat,
      awardedPatchIds: newAwards.map((p) => p.id),
    } satisfies EngineResult;
  });

  if (result.awardedPatchIds.length) {
    // Post-commit and best-effort: the approval is already durable, so a
    // milestone hiccup must never surface as a failed approval.
    try {
      await checkMilestones(orgId, "patch_awarded", {
        memberId: result.memberId,
        patchIds: result.awardedPatchIds,
      });
    } catch (err) {
      console.error("checkMilestones (approve) failed post-commit:", err);
    }
  }
  return result;
}

/**
 * Manual award (President's Citation, War Veteran, ...). Same composite-id
 * idempotency and cut placement as system awards.
 */
export async function manualAwardTx(
  orgId: string,
  memberId: string,
  patchId: string,
  awarderUid: string,
  reason: string,
): Promise<boolean> {
  const org = orgRef(orgId);
  const awarded = await adminDb.runTransaction(async (tx) => {
    const patchSnap = await tx.get(org.collection("patches").doc(patchId));
    if (!patchSnap.exists) throw new EngineError("patch_not_found");
    const patch = { id: patchSnap.id, ...(patchSnap.data() as Omit<Patch, "id">) };

    const memberRef = org.collection("members").doc(memberId);
    const mSnap = await tx.get(memberRef);
    if (!mSnap.exists) throw new EngineError("member_not_found");
    const member = mSnap.data() as Member;

    const awardRef = org.collection("awardedPatches").doc(`${memberId}_${patchId}`);
    const aSnap = await tx.get(awardRef);
    if (aSnap.exists) return false; // already has it

    const cutRef = org.collection("cutLayouts").doc(memberId);
    const cutSnap = await tx.get(cutRef);

    tx.set(awardRef, {
      memberId,
      patchId,
      awardedAt: FieldValue.serverTimestamp(),
      awardedBy: awarderUid,
      reason,
    });
    tx.update(memberRef, { patchCount: (member.patchCount ?? 0) + 1 });

    const layout: CutLayout = cutSnap.exists
      ? (cutSnap.data() as CutLayout)
      : structuredClone(EMPTY_LAYOUT);
    const placement = placeOnCut(layout, {
      kind: "patch",
      refId: patch.id,
      ...patch.defaultPlacement,
    });
    layout.surfaces[placement.surface].push(placement);
    tx.set(cutRef, { ...layout, updatedAt: Timestamp.now() });

    tx.set(org.collection("auditLogs").doc(), {
      actorUid: awarderUid,
      action: "patch.manualAward",
      targetPath: awardRef.path,
      detail: `${patch.name} → ${member.roadName || member.displayName}: ${reason}`,
      at: FieldValue.serverTimestamp(),
    });
    return true;
  });

  if (awarded) {
    try {
      await checkMilestones(orgId, "patch_awarded", { memberId, patchIds: [patchId] });
    } catch (err) {
      console.error("checkMilestones (manual award) failed post-commit:", err);
    }
  }
  return awarded;
}

export class EngineError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "EngineError";
  }
}
