import "server-only";
import { cache } from "react";
import { orgRef } from "@/lib/firebase/admin";
import type {
  Activity,
  ActivityType,
  AwardedPatch,
  Member,
  Patch,
  Rank,
} from "@/lib/types";

// Small, stable collections — fetched once per request via React cache().

export const listRanks = cache(async (orgId: string): Promise<Rank[]> => {
  const snap = await orgRef(orgId).collection("ranks").orderBy("order").get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Rank, "id">) }));
});

export const listActivityTypes = cache(
  async (orgId: string): Promise<ActivityType[]> => {
    const snap = await orgRef(orgId)
      .collection("activityTypes")
      .orderBy("order")
      .get();
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ActivityType, "id">),
    }));
  },
);

export const listPatches = cache(async (orgId: string): Promise<Patch[]> => {
  const snap = await orgRef(orgId).collection("patches").get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Patch, "id">) }));
});

export const listMembers = cache(async (orgId: string): Promise<Member[]> => {
  const snap = await orgRef(orgId)
    .collection("members")
    .orderBy("memberNumber")
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Member, "id">) }));
});

export const getMember = cache(
  async (orgId: string, memberId: string): Promise<Member | null> => {
    const snap = await orgRef(orgId).collection("members").doc(memberId).get();
    return snap.exists
      ? { id: snap.id, ...(snap.data() as Omit<Member, "id">) }
      : null;
  },
);

export const listMemberAwards = cache(
  async (orgId: string, memberId: string): Promise<AwardedPatch[]> => {
    const snap = await orgRef(orgId)
      .collection("awardedPatches")
      .where("memberId", "==", memberId)
      .get();
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AwardedPatch, "id">),
    }));
  },
);

export async function listActivities(
  orgId: string,
  opts: { memberId?: string; status?: Activity["status"]; limit?: number } = {},
): Promise<Activity[]> {
  let q = orgRef(orgId)
    .collection("activities")
    .orderBy("createdAt", "desc") as FirebaseFirestore.Query;
  if (opts.memberId) q = q.where("memberId", "==", opts.memberId);
  if (opts.status) q = q.where("status", "==", opts.status);
  const snap = await q.limit(opts.limit ?? 25).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Activity, "id">) }));
}

export async function countPending(orgId: string): Promise<number> {
  const snap = await orgRef(orgId)
    .collection("activities")
    .where("status", "==", "pending")
    .count()
    .get();
  return snap.data().count;
}
