import "server-only";
import { cache } from "react";
import { FieldPath, adminDb, orgRef } from "@/lib/firebase/admin";
import type {
  Activity,
  ActivityType,
  AwardedPatch,
  GalleryPhoto,
  Member,
  Patch,
  Rank,
  ServiceRecordEntry,
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

/**
 * Which patches have artwork, and the version of each — patch id → updatedAt in
 * ms. Deliberately does NOT read the image: `.select()` fetches the timestamp
 * and nothing else, so a page listing sixty patches carries sixty numbers
 * rather than sixty base64 blobs. The bytes come from the art route, which the
 * browser fetches in parallel and caches (see `patchArtUrl`).
 */
export const listPatchArtVersions = cache(
  async (orgId: string): Promise<Map<string, number>> => {
    const snap = await orgRef(orgId).collection("patchArt").select("updatedAt").get();
    return new Map(
      snap.docs.map((d) => {
        const ts = d.data()?.updatedAt as { toMillis?: () => number } | undefined;
        return [d.id, ts?.toMillis?.() ?? 0];
      }),
    );
  },
);

/** One patch's artwork, for the route that streams it. */
export const getPatchArt = cache(
  async (
    orgId: string,
    patchId: string,
  ): Promise<{ dataUrl: string; updatedAtMs: number } | null> => {
    const snap = await orgRef(orgId).collection("patchArt").doc(patchId).get();
    const data = snap.data();
    if (!snap.exists || typeof data?.dataUrl !== "string") return null;
    const ts = data.updatedAt as { toMillis?: () => number } | undefined;
    return { dataUrl: data.dataUrl, updatedAtMs: ts?.toMillis?.() ?? 0 };
  },
);

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

/**
 * A member's career log — rank changes, role changes, and removals, newest
 * first. Written by the member actions since the club was created; nothing read
 * it until the profile's Service Record, so old members already have history.
 */
export const listServiceRecord = cache(
  async (orgId: string, memberId: string): Promise<ServiceRecordEntry[]> => {
    const snap = await orgRef(orgId)
      .collection("members")
      .doc(memberId)
      .collection("serviceRecord")
      .orderBy("at", "desc")
      .get();
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ServiceRecordEntry, "id">),
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
): Promise<Map<string, { approved: boolean }>> {
  const results = await Promise.all(
    memberIds.map(async (memberId) => {
      // .select("approved") returns that one field — still no image egress.
      const snap = await orgRef(orgId)
        .collection("members")
        .doc(memberId)
        .collection("assets")
        .select("approved")
        .get();
      const doc = snap.docs.find((d) => d.id === "character");
      if (!doc) return null;
      // Absent ⇒ approved, so every render uploaded before member self-service
      // existed (all of them admin-authored) keeps showing publicly. Same
      // "missing flag means the old behaviour" rule as patch.emblem.
      return [memberId, { approved: doc.get("approved") !== false }] as const;
    }),
  );
  // A Map rather than a Set so callers keep `.has()` for "is there art at all"
  // (every portal surface) and gain `.get()?.approved` for the public roster.
  return new Map(results.filter((r): r is NonNullable<typeof r> => r !== null));
}

/** The stored character render data URL, or null. Served by the render route. */
export const getCharacterRender = cache(
  async (
    orgId: string,
    memberId: string,
  ): Promise<{ dataUrl: string; updatedAtMs: number; approved: boolean } | null> => {
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
      // Absent ⇒ approved: everything uploaded before self-service was an
      // admin's work. See listMembersWithRender.
      approved: data.approved !== false,
    };
  },
);

/**
 * Which branding art slots have an UPLOAD behind them. Ids only via
 * `.select()`, so the admin page can say "using your upload" vs "using the
 * default" without pulling half a megabyte of base64 to find out — and without
 * guessing from the path, which is set to the shipped default by the seeder.
 */
export const listBrandingArtKeys = cache(
  async (orgId: string): Promise<Set<string>> => {
    const snap = await orgRef(orgId).collection("brandingArt").select().get();
    return new Set(snap.docs.map((d) => d.id));
  },
);

/** Uploaded branding scene art (roster backdrop, character stage), or null. */
export const getBrandingArt = cache(
  async (
    orgId: string,
    key: string,
  ): Promise<{ dataUrl: string; updatedAtMs: number } | null> => {
    const snap = await orgRef(orgId).collection("brandingArt").doc(key).get();
    const data = snap.data();
    if (!snap.exists || typeof data?.dataUrl !== "string") return null;
    return {
      dataUrl: data.dataUrl,
      updatedAtMs: data.updatedAt?.toMillis?.() ?? 0,
    };
  },
);

/**
 * Every gallery photo's METADATA, newest first — caption, state, dimensions,
 * blur placeholder. Never the image: the bytes sit in the sibling `galleryArt`
 * collection and stream from the gallery route, so a wall showing two hundred
 * photos costs two hundred small documents rather than two hundred blobs.
 *
 * Unfiltered on purpose. Every caller wants a different slice (the club sees
 * approved plus its own pending, the public site sees approved-and-public), and
 * the collection is small enough that one cached read serving all of them beats
 * three indexed queries.
 */
export const listGalleryPhotos = cache(
  async (orgId: string): Promise<GalleryPhoto[]> => {
    const snap = await orgRef(orgId)
      .collection("gallery")
      .orderBy("createdAt", "desc")
      .get();
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<GalleryPhoto, "id">),
    }));
  },
);

/** One photo's metadata — the gate the streaming route checks before serving. */
export const getGalleryPhoto = cache(
  async (orgId: string, photoId: string): Promise<GalleryPhoto | null> => {
    const snap = await orgRef(orgId).collection("gallery").doc(photoId).get();
    return snap.exists
      ? { id: snap.id, ...(snap.data() as Omit<GalleryPhoto, "id">) }
      : null;
  },
);

/** One photo's bytes, for the route that streams them. */
export const getGalleryArt = cache(
  async (
    orgId: string,
    photoId: string,
  ): Promise<{ dataUrl: string; updatedAtMs: number } | null> => {
    const snap = await orgRef(orgId).collection("galleryArt").doc(photoId).get();
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
