"use server";

import { revalidatePath, updateTag } from "next/cache";
import { revalidateOrgTags } from "@/lib/cache";
import { FieldValue, adminDb, orgRef } from "@/lib/firebase/admin";
import { requireOrgRole } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { DEFAULT_BRANDING } from "@/lib/branding-defaults";
import { orgSlugTag } from "@/lib/tenant";
import { saveBrandingSchema, type SaveBrandingInput } from "@/lib/schemas/branding";
import type { ActionResult } from "./activities";

/**
 * The club's visual identity: colours, names, the anthem.
 *
 * Imagery is NOT here — that is `branding-art.ts`, because an image upload is
 * a multipart request with a sharp pipeline behind it and a colour change is a
 * small JSON merge. They write to the same document, and both merge, so they
 * compose without stepping on each other.
 *
 * Everything is merge-only and scoped to the fields the editor owns. A club's
 * story, creed, uploaded assets and every business collection are untouched by
 * design: this action can change how the site LOOKS and nothing else.
 */

/**
 * Branding is drawn by every page on both surfaces, so a save invalidates both
 * trees wholesale. Layout-scope revalidation covers everything nested under
 * them, which is the honest answer here — there is no page a palette change
 * cannot reach.
 */
function revalidateEverything(orgId: string) {
  revalidateOrgTags(orgId, "branding");
  revalidatePath("/[orgSlug]", "layout");
  revalidatePath("/[orgSlug]/portal", "layout");
}

/** Org-admin: write the editor's draft to one surface's branding document. */
export async function saveBranding(raw: SaveBrandingInput): Promise<ActionResult> {
  const parsed = saveBrandingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid branding" };
  }
  const { orgId, surface, draft, renameOrg } = parsed.data;

  try {
    const access = await requireOrgRole(orgId, "admin");

    // Blank optional copy is stored as "" rather than deleted: an empty
    // tagline is a choice ("this club has no tagline"), and `resolveBranding`
    // uses `??` for exactly these, so "" survives while a missing field falls
    // back. `shortName` is the exception — it resolves with `||` because a
    // blank set of initials is never what anyone wants on screen.
    await orgRef(orgId)
      .collection("branding")
      .doc(surface)
      .set(
        {
          colors: draft.colors,
          orgDisplayName: draft.orgDisplayName,
          shortName: draft.shortName,
          location: draft.location,
          addressLine: draft.addressLine,
          tagline: draft.tagline,
          mission: draft.mission,
          anthemVideoId: draft.anthemVideoId,
        },
        { merge: true },
      );

    if (renameOrg) {
      // The org document carries the name twice: `name` is what the club calls
      // itself (portal), `publicName` is the cover story (public). Each
      // surface renames its own, so saving the shopfront never overwrites the
      // clubhouse.
      const field = surface === "portal" ? "name" : "publicName";
      const orgSnap = await adminDb.collection("organizations").doc(orgId).get();
      await orgSnap.ref.set({ [field]: draft.orgDisplayName }, { merge: true });
      revalidateOrgTags(orgId, "org");
      // getOrgBySlug is keyed and tagged by SLUG, not id — it has no org id to
      // tag with on a miss — so the id tag above cannot clear it.
      const slug = orgSnap.get("slug");
      if (typeof slug === "string") updateTag(orgSlugTag(slug));
    }

    await writeAuditLog(orgId, {
      actorUid: access.user.uid,
      action: "branding.save",
      targetPath: `organizations/${orgId}/branding/${surface}`,
      detail: `${surface}: ${draft.orgDisplayName}`,
    });

    revalidateEverything(orgId);
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

/**
 * Org-admin: drop this surface's colours and identity so the shipped defaults
 * apply again.
 *
 * Uploaded imagery is deliberately left alone. Each asset card has its own
 * reset, and wiping a club's artwork from a button labelled "reset colours"
 * would be a bigger hammer than the label promises — the images are the part
 * an admin cannot get back from a form.
 */
export async function resetBranding(raw: {
  orgId: string;
  surface: "public" | "portal";
}): Promise<ActionResult> {
  if (raw.surface !== "public" && raw.surface !== "portal") {
    return { ok: false, error: "Unknown surface" };
  }

  try {
    const access = await requireOrgRole(raw.orgId, "admin");
    const fallback = DEFAULT_BRANDING[raw.surface];

    // The identity fields go away entirely so `resolveBranding` supplies them,
    // but `colors` and `orgDisplayName` are WRITTEN back rather than deleted:
    // both are required on the stored shape, and a branding doc missing its
    // colours would be a valid-looking document that fails to type-check on
    // read.
    await orgRef(raw.orgId)
      .collection("branding")
      .doc(raw.surface)
      .set(
        {
          colors: fallback.colors,
          orgDisplayName: fallback.orgDisplayName,
          shortName: FieldValue.delete(),
          location: FieldValue.delete(),
          addressLine: FieldValue.delete(),
          tagline: FieldValue.delete(),
          mission: FieldValue.delete(),
          anthemVideoId: FieldValue.delete(),
        },
        { merge: true },
      );

    await writeAuditLog(raw.orgId, {
      actorUid: access.user.uid,
      action: "branding.reset",
      targetPath: `organizations/${raw.orgId}/branding/${raw.surface}`,
      detail: raw.surface,
    });

    revalidateEverything(raw.orgId);
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

function failure(e: unknown): { ok: false; error: string } {
  if (e instanceof Error && e.name === "AuthError") {
    return {
      ok: false,
      error: e.message === "unauthenticated" ? "Sign in required" : "Admins only",
    };
  }
  console.error(e);
  return {
    ok: false,
    error: e instanceof Error ? e.message : "Something went wrong",
  };
}
