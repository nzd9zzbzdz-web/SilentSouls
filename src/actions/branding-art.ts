"use server";

import { revalidatePath } from "next/cache";
import { revalidateOrgTags } from "@/lib/cache";
import sharp from "sharp";
import { FieldValue, orgRef } from "@/lib/firebase/admin";
import { requireOrgRole } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { BRANDING_ART, type BrandingArtKey } from "@/lib/branding-art";
import type { ActionResult } from "./activities";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // raw upload cap
/**
 * Scene art, not a badge: these fill a card or a whole character screen, so
 * they get far more room than a patch's 64KB. Still well under Firestore's 1MB
 * document ceiling with headroom for the base64 inflation (~4/3).
 */
const MAX_STORED_BYTES = 600 * 1024;

/**
 * Branding scene art — the clubhouse behind the public roster cards and the
 * character-screen stage.
 *
 * Stored as a webp data URL in `organizations/{orgId}/brandingArt/{key}` and
 * streamed by /api/orgs/{orgId}/branding/{key}, the same no-Storage-bucket
 * approach as patch art and character renders. A SIBLING collection rather than
 * a field on the branding doc, for the reason patch art is one: the branding
 * doc is read by every layout render on both surfaces, and a 500KB data URL
 * riding along on all of them would be absurd.
 *
 * The upload also writes the served URL into the branding doc's path field, so
 * everything that already reads `rosterBackdropPath` / `characterStagePath`
 * picks it up with no further change. The `?v=` is the upload time, which makes
 * the response immutable and lands a re-upload at a fresh URL.
 */

function artRef(orgId: string, key: BrandingArtKey) {
  return orgRef(orgId).collection("brandingArt").doc(key);
}

function revalidateFor(orgId: string, key: BrandingArtKey) {
  // Where each slot is drawn is the table's business, not this action's — an
  // if/else here is what goes stale the day a third slot lands.
  revalidateOrgTags(orgId, "branding");
  revalidatePath(`/[orgSlug]/portal/admin/branding`, "page");
  for (const { path, type } of BRANDING_ART[key].revalidates) {
    revalidatePath(path, type);
  }
}

export async function uploadBrandingArt(formData: FormData): Promise<ActionResult> {
  const orgId = formData.get("orgId");
  const key = formData.get("key");
  const file = formData.get("file");

  if (typeof orgId !== "string" || typeof key !== "string" || !(file instanceof File)) {
    return { ok: false, error: "Invalid upload" };
  }
  const spec = BRANDING_ART[key as BrandingArtKey];
  if (!spec) return { ok: false, error: "Unknown image" };
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "File must be an image" };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Image too large (max 12MB)" };
  }

  try {
    const access = await requireOrgRole(orgId, "admin");

    const input = Buffer.from(await file.arrayBuffer());

    // Refuse anything smaller than the frame instead of upscaling it. The art
    // is stored at exactly the slot shape (no `withoutEnlargement` — that
    // silently yields a wrong-aspect file when the source is shorter than the
    // slot), so a small upload would come back as a blurry stretch across the
    // club's public page. Better to say so.
    const meta = await sharp(input).rotate().metadata();
    if ((meta.width ?? 0) < spec.width || (meta.height ?? 0) < spec.height) {
      return {
        ok: false,
        error: `Image is too small. It needs to be at least ${spec.width}×${spec.height}px`,
      };
    }

    // `cover` at the slot's own aspect: these are backdrops, so filling the
    // frame beats letterboxing a scene into bars. Whatever the admin uploads
    // gets cropped to the shape the card actually draws.
    const base = sharp(input).rotate().resize(spec.width, spec.height, {
      fit: "cover",
      position: spec.position,
    });

    let stored: Buffer | null = null;
    for (const quality of [82, 72, 62, 50]) {
      const candidate = await base.clone().webp({ quality }).toBuffer();
      if (candidate.length <= MAX_STORED_BYTES) {
        stored = candidate;
        break;
      }
    }
    if (!stored) {
      return { ok: false, error: "Image too complex to store. Try a smaller one" };
    }

    const updatedAtMs = Date.now();
    await artRef(orgId, key as BrandingArtKey).set({
      dataUrl: `data:image/webp;base64,${stored.toString("base64")}`,
      updatedBy: access.user.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Point the branding doc at the served URL. Merge-only: this must never
    // disturb the colors and fonts sitting in the same document.
    await orgRef(orgId)
      .collection("branding")
      .doc(spec.surface)
      .set(
        { [spec.field]: `/api/orgs/${orgId}/branding/${key}?v=${updatedAtMs}` },
        { merge: true },
      );

    await writeAuditLog(orgId, {
      actorUid: access.user.uid,
      action: "branding.art",
      targetPath: artRef(orgId, key as BrandingArtKey).path,
      detail: `${spec.label}: ${Math.round(stored.length / 1024)}KB`,
    });

    revalidateFor(orgId, key as BrandingArtKey);
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

/** Org-admin: drop the uploaded art and fall back to the shipped default. */
export async function resetBrandingArt(raw: {
  orgId: string;
  key: BrandingArtKey;
}): Promise<ActionResult> {
  const spec = BRANDING_ART[raw.key];
  if (!spec) return { ok: false, error: "Unknown image" };

  try {
    const access = await requireOrgRole(raw.orgId, "admin");
    await artRef(raw.orgId, raw.key).delete();
    // Clearing the FIELD is what restores the default — every reader does
    // `branding.x ?? DEFAULT`, so the key has to go away, not go empty.
    await orgRef(raw.orgId)
      .collection("branding")
      .doc(spec.surface)
      .set({ [spec.field]: FieldValue.delete() }, { merge: true });

    await writeAuditLog(raw.orgId, {
      actorUid: access.user.uid,
      action: "branding.art.reset",
      targetPath: artRef(raw.orgId, raw.key).path,
      detail: spec.label,
    });

    revalidateFor(raw.orgId, raw.key);
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
