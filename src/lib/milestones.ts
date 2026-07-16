import "server-only";
import { FieldValue, orgRef } from "@/lib/firebase/admin";
import type { Patch } from "@/lib/types";

type MilestoneTrigger = "patch_awarded" | "member_added" | "org_created";

/**
 * Auto-generate timeline milestones. Idempotent: the timeline doc id IS the
 * milestoneKey, so re-checks never duplicate entries.
 */
export async function checkMilestones(
  orgId: string,
  trigger: MilestoneTrigger,
  ctx: { memberId?: string; patchIds?: string[] } = {},
): Promise<void> {
  const org = orgRef(orgId);

  if (trigger === "patch_awarded" && ctx.patchIds?.length) {
    const snaps = await Promise.all(
      ctx.patchIds.map((id) => org.collection("patches").doc(id).get()),
    );
    for (const snap of snaps) {
      const patch = snap.data() as Patch | undefined;
      if (patch?.category === "legendary") {
        await org
          .collection("timeline")
          .doc("first_legendary")
          .create({
            date: FieldValue.serverTimestamp(),
            title: "First Legendary Patch Awarded",
            description: `The club's first legendary patch, ${patch.name}, has been earned.`,
            kind: "milestone",
            milestoneKey: "first_legendary",
            icon: "trophy",
            createdBy: "system",
          })
          .catch(() => {}); // already exists ⇒ idempotent no-op
      }
    }
  }

  if (trigger === "member_added") {
    const orgSnap = await org.get();
    const count = orgSnap.data()?.memberCount ?? 0;
    // Use >= (not ===) so a concurrent burst that skips past a threshold still
    // records the milestone; the fixed doc id (milestoneKey) keeps it idempotent.
    for (const n of [10, 25, 50, 100]) {
      if (count >= n) {
        await org
          .collection("timeline")
          .doc(`member_${n}`)
          .create({
            date: FieldValue.serverTimestamp(),
            title: `${n}th Member Joined`,
            description: `The brotherhood has grown past ${n} members.`,
            kind: "milestone",
            milestoneKey: `member_${n}`,
            icon: "users",
            createdBy: "system",
          })
          .catch(() => {});
      }
    }
  }

  if (trigger === "org_created") {
    await org
      .collection("timeline")
      .doc("founded")
      .create({
        date: FieldValue.serverTimestamp(),
        title: "Organization Founded",
        description: "The charter was signed and the brotherhood was born.",
        kind: "milestone",
        milestoneKey: "founded",
        icon: "flag",
        createdBy: "system",
      })
      .catch(() => {});
  }
}
