import "server-only";
import { cache } from "react";
import { adminDb } from "@/lib/firebase/admin";
import type { Branding, Organization } from "@/lib/types";

/** Resolve an org by slug — React cache() dedupes per request. */
export const getOrgBySlug = cache(
  async (slug: string): Promise<Organization | null> => {
    const snap = await adminDb
      .collection("organizations")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...(doc.data() as Omit<Organization, "id">) };
  },
);

export const getBranding = cache(
  async (orgId: string, surface: "public" | "portal"): Promise<Branding | null> => {
    const snap = await adminDb
      .doc(`organizations/${orgId}/branding/${surface}`)
      .get();
    return snap.exists ? (snap.data() as Branding) : null;
  },
);
