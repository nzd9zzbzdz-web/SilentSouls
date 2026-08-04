import "server-only";
import { cache } from "react";
import { FieldPath, adminDb, orgRef } from "@/lib/firebase/admin";
import type {
  Activity,
  ActivityType,
  AwardedPatch,
  Member,
  Patch,
  Rank,
  SystemRole,
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

/** Every award in the org, grouped by member — one read for a whole roster. */
export const listAwardsByMember = cache(
  async (orgId: string): Promise<Map<string, AwardedPatch[]>> => {
    const snap = await orgRef(orgId).collection("awardedPatches").get();
    const byMember = new Map<string, AwardedPatch[]>();
    for (const d of snap.docs) {
      const award = { id: d.id, ...(d.data() as Omit<AwardedPatch, "id">) };
      const list = byMember.get(award.memberId);
      if (list) list.push(award);
      else byMember.set(award.memberId, [award]);
    }
    return byMember;
  },
);

/**
 * Which members have an uploaded character render, without pulling the
 * renders themselves — the stored data URLs run up to ~900KB each, so the
 * roster only asks whether the doc exists and links to /api/.../render.
 */
export async function listMembersWithRender(
  orgId: string,
  memberIds: string[],
): Promise<Set<string>> {
  const results = await Promise.all(
    memberIds.map(async (memberId) => {
      // .select() with no fields returns doc ids only — no image egress.
      const snap = await orgRef(orgId)
        .collection("members")
        .doc(memberId)
        .collection("assets")
        .select()
        .get();
      return snap.docs.some((d) => d.id === "character") ? memberId : null;
    }),
  );
  return new Set(results.filter((id): id is string => id !== null));
}

/** The stored character render data URL, or null. Served by the render route. */
export const getCharacterRender = cache(
  async (
    orgId: string,
    memberId: string,
  ): Promise<{ dataUrl: string; updatedAtMs: number } | null> => {
    const snap = await orgRef(orgId)
      .collection("members")
      .doc(memberId)
      .collection("assets")
      .doc("character")
      .get();
    const data = snap.data();
    if (!snap.exists || typeof data?.dataUrl !== "string") return null;
    return {
      dataUrl: data.dataUrl,
      updatedAtMs: data.updatedAt?.toMillis?.() ?? 0,
    };
  },
);

/**
 * Portal role per linked uid for this org. Roles live on `users/{uid}` rather
 * than the member doc — one account can belong to several orgs — so the member
 * admin has to join the two to show who is an admin.
 */
export const listOrgRoles = cache(
  async (orgId: string): Promise<Map<string, SystemRole>> => {
    const snap = await adminDb
      .collection("users")
      .where(new FieldPath("memberships", orgId, "role"), "in", [
        "admin",
        "officer",
        "member",
      ])
      .get();
    const byUid = new Map<string, SystemRole>();
    for (const d of snap.docs) {
      const role = d.data()?.memberships?.[orgId]?.role as SystemRole | undefined;
      if (role) byUid.set(d.id, role);
    }
    return byUid;
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
