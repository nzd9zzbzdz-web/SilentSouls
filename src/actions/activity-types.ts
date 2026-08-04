"use server";

import { revalidatePath } from "next/cache";
import { orgRef } from "@/lib/firebase/admin";
import { requireOrgRole } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { defaultActivityTypes, rapSheetToStats } from "@/lib/criminal-record";
import {
  CRIMINAL_PATCH_SEEDS,
  RETIRED_ACTIVITY_TYPE_IDS,
  RETIRED_PATCH_IDS,
} from "@/lib/constants";
import type { Member } from "@/lib/types";

export interface SyncResult {
  created: string[]; // names of activity types added
  alreadyPresent: number;
  retired: number; // club types pulled from the submit dropdown
  patchesAdded: string[]; // criminal patches now earnable
  patchesRetired: number; // patches whose stat is no longer loggable
  membersMigrated: number; // legacy rap sheets folded into stats
}

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

/**
 * Admin: bring an org's activity types up to the shipped defaults.
 *
 * The seeder only runs on a destructive reseed, so an org created before a new
 * type existed never gets it — which is how the criminal-record types could be
 * live in code but missing from the dropdown. This adds whatever is missing
 * without touching types the org already has (an admin may have disabled or
 * renamed one), and folds any legacy hand-authored rap sheets into stats so
 * the Criminal Record panel shows real history rather than zeros.
 *
 * Idempotent: running it twice creates nothing the second time.
 */
export async function syncDefaultActivityTypes(
  orgId: string,
): Promise<ActionResult<SyncResult>> {
  try {
    const access = await requireOrgRole(orgId, "admin");
    const org = orgRef(orgId);

    const existing = await org.collection("activityTypes").select().get();
    const have = new Set(existing.docs.map((d) => d.id));

    const defaults = defaultActivityTypes();
    const missing = defaults.filter((t) => !have.has(t.id));

    // Append after whatever the org already has so existing ordering is kept.
    let order = existing.size;
    for (const t of missing) {
      order += 1;
      await org.collection("activityTypes").doc(t.id).set({
        name: t.name,
        statKey: t.statKey,
        requiresProof: t.requiresProof,
        allowQuantity: t.allowQuantity,
        defaultQuantity: 1,
        icon: t.icon,
        active: true,
        order,
      });
    }

    // Retired club types: hide from the submit dropdown but keep the doc, so
    // past submissions still resolve a name in history and the review queue.
    let retired = 0;
    for (const id of RETIRED_ACTIVITY_TYPE_IDS) {
      const ref = org.collection("activityTypes").doc(id);
      const snap = await ref.get();
      if (!snap.exists || snap.data()?.active === false) continue;
      await ref.set({ active: false }, { merge: true });
      retired += 1;
    }

    // Patches follow the stats. Retire the ones nobody can earn any more, and
    // install the criminal-record replacements.
    let patchesRetired = 0;
    for (const id of RETIRED_PATCH_IDS) {
      const ref = org.collection("patches").doc(id);
      const snap = await ref.get();
      if (!snap.exists || snap.data()?.active === false) continue;
      await ref.set({ active: false }, { merge: true });
      patchesRetired += 1;
    }

    const patchesAdded: string[] = [];
    for (const patch of CRIMINAL_PATCH_SEEDS) {
      const ref = org.collection("patches").doc(patch.id);
      if ((await ref.get()).exists) continue;
      await ref.set({
        name: patch.name,
        category: patch.category,
        description: patch.description,
        tier: patch.tier,
        rarity: patch.rarity,
        requirement: patch.requirement,
        manual: false,
        active: true,
        defaultPlacement: {
          surface: patch.surface,
          u: patch.u,
          v: patch.v,
          scale: 0.8,
          rotationDeg: 0,
        },
      });
      patchesAdded.push(patch.name);
    }

    // Legacy rap sheets → stats, so profiles don't reset to zero.
    const members = await org.collection("members").get();
    let membersMigrated = 0;
    for (const doc of members.docs) {
      const member = { id: doc.id, ...(doc.data() as Omit<Member, "id">) };
      const updates = rapSheetToStats(member);
      if (Object.keys(updates).length === 0) continue;
      await doc.ref.set(
        { stats: { ...(member.stats ?? {}), ...updates } },
        { merge: true },
      );
      membersMigrated += 1;
    }

    const changed =
      missing.length + retired + patchesAdded.length + patchesRetired + membersMigrated;
    if (changed > 0) {
      await writeAuditLog(orgId, {
        actorUid: access.user.uid,
        action: "activityTypes.sync",
        targetPath: `organizations/${orgId}/activityTypes`,
        detail:
          `+${missing.length} type(s), -${retired} retired, ` +
          `+${patchesAdded.length} patch(es), -${patchesRetired} retired, ` +
          `${membersMigrated} rap sheet(s) migrated`,
      });
    }

    revalidatePath(`/[orgSlug]/portal/admin/activity-types`, "page");
    revalidatePath(`/[orgSlug]/portal/admin/patches`, "page");
    revalidatePath(`/[orgSlug]/portal/activities`, "page");
    revalidatePath(`/[orgSlug]/portal/brotherhood/[memberId]`, "page");

    return {
      ok: true,
      data: {
        created: missing.map((t) => t.name),
        alreadyPresent: defaults.length - missing.length,
        retired,
        patchesAdded,
        patchesRetired,
        membersMigrated,
      },
    };
  } catch (e) {
    if (e instanceof Error && e.name === "AuthError") {
      return {
        ok: false,
        error: e.message === "unauthenticated" ? "Sign in required" : "Admins only",
      };
    }
    console.error(e);
    return { ok: false, error: "Something went wrong" };
  }
}
