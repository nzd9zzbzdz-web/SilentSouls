import { notFound } from "next/navigation";
import { getOrgBySlug } from "@/lib/tenant";
import { requireOrgRole } from "@/lib/auth/session";
import { orgRef } from "@/lib/firebase/admin";
import { defaultSlotsFor } from "@/lib/cut/config";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { VestDesigner } from "@/components/portal/cut/VestDesigner";
import type { CutSurface, PatchSlot, VestConfig } from "@/lib/types";
import type { DocumentSnapshot } from "firebase-admin/firestore";

export default async function VestDesignerPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  await requireOrgRole(org.id, "admin");

  const [front, back] = await Promise.all([
    orgRef(org.id).collection("vestConfigs").doc("front").get(),
    orgRef(org.id).collection("vestConfigs").doc("back").get(),
  ]);

  const slotsFor = (snap: DocumentSnapshot, surface: CutSurface): PatchSlot[] =>
    snap.exists ? ((snap.data() as VestConfig).slots ?? defaultSlotsFor(surface)) : defaultSlotsFor(surface);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <DisplayHeading className="text-3xl text-primary">Vest Designer</DisplayHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          Position the slots that patches land in. No code required. Every change
          applies to every member&rsquo;s cut.
        </p>
      </div>

      <VestDesigner
        orgId={org.id}
        initial={{ front: slotsFor(front, "front"), back: slotsFor(back, "back") }}
      />
    </div>
  );
}
