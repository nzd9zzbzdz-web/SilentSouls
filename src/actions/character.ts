"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { FieldValue, orgRef } from "@/lib/firebase/admin";
import { requireOrgRole } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import {
  keyOutLightBackground,
  needsBackgroundKeying,
} from "@/lib/character-key";
import type { ActionResult } from "./activities";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // raw upload cap
const MAX_STORED_BYTES = 700 * 1024; // keep the Firestore doc well under 1MB

/**
 * Officer+: set a member's character render from an uploaded image.
 * Light/checkerboard backgrounds are keyed out automatically; the result is
 * stored as a webp data URL in members/{id}/assets/character (small, read
 * only by the profile page — no Storage bucket required).
 */
export async function uploadCharacterRender(
  formData: FormData,
): Promise<ActionResult> {
  const orgId = formData.get("orgId");
  const memberId = formData.get("memberId");
  const file = formData.get("file");

  if (typeof orgId !== "string" || typeof memberId !== "string" || !(file instanceof File)) {
    return { ok: false, error: "Invalid upload" };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "File must be an image" };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Image too large (max 8MB)" };
  }

  try {
    const access = await requireOrgRole(orgId, "officer");
    const memberRef = orgRef(orgId).collection("members").doc(memberId);
    if (!(await memberRef.get()).exists) {
      return { ok: false, error: "Member not found" };
    }

    const input = Buffer.from(await file.arrayBuffer());

    // Normalize orientation, cap size, then key the background if needed.
    const { data, info } = await sharp(input)
      .rotate()
      .ensureAlpha()
      .resize({ height: 1200, withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

    if (needsBackgroundKeying(pixels, info.width, info.height)) {
      keyOutLightBackground(pixels, info.width, info.height);
    }

    // Encode small enough for a Firestore doc; step down until it fits.
    let stored: Buffer | null = null;
    for (const [h, q] of [
      [info.height, 82],
      [900, 70],
      [700, 60],
    ] as const) {
      const candidate = await sharp(data, {
        raw: { width: info.width, height: info.height, channels: 4 },
      })
        .resize({ height: h, withoutEnlargement: true })
        .webp({ quality: q })
        .toBuffer();
      if (candidate.length <= MAX_STORED_BYTES) {
        stored = candidate;
        break;
      }
    }
    if (!stored) {
      return { ok: false, error: "Image too complex to store — try a smaller crop" };
    }

    await memberRef.collection("assets").doc("character").set({
      dataUrl: `data:image/webp;base64,${stored.toString("base64")}`,
      updatedBy: access.user.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await writeAuditLog(orgId, {
      actorUid: access.user.uid,
      action: "member.characterArt",
      targetPath: memberRef.path,
      detail: `${Math.round(stored.length / 1024)}KB render uploaded`,
    });

    revalidatePath(`/[orgSlug]/portal/brotherhood/[memberId]`, "page");
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

/** Officer+: remove a member's uploaded render (falls back to silhouette). */
export async function removeCharacterRender(raw: {
  orgId: string;
  memberId: string;
}): Promise<ActionResult> {
  try {
    const access = await requireOrgRole(raw.orgId, "officer");
    const assetRef = orgRef(raw.orgId)
      .collection("members")
      .doc(raw.memberId)
      .collection("assets")
      .doc("character");
    await assetRef.delete();
    await writeAuditLog(raw.orgId, {
      actorUid: access.user.uid,
      action: "member.characterArt.remove",
      targetPath: assetRef.path,
    });
    revalidatePath(`/[orgSlug]/portal/brotherhood/[memberId]`, "page");
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

/**
 * Org-admin: point portal branding at the shipped character-stage art.
 * Merge-only — the rest of the branding doc is untouched.
 */
export async function applyDefaultCharacterStage(raw: {
  orgId: string;
}): Promise<ActionResult> {
  try {
    const access = await requireOrgRole(raw.orgId, "admin");
    await orgRef(raw.orgId)
      .collection("branding")
      .doc("portal")
      .set({ characterStagePath: "/brand/character-stage.webp" }, { merge: true });
    await writeAuditLog(raw.orgId, {
      actorUid: access.user.uid,
      action: "branding.characterStage",
      targetPath: `organizations/${raw.orgId}/branding/portal`,
    });
    revalidatePath(`/[orgSlug]/portal`, "layout");
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

function failure(e: unknown): { ok: false; error: string } {
  console.error(e);
  return {
    ok: false,
    error: e instanceof Error ? e.message : "Something went wrong",
  };
}
