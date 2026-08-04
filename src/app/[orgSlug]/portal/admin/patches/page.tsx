import { notFound } from "next/navigation";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { BackfillAwardsButton } from "@/components/portal/BackfillAwardsButton";
import { PatchAdmin } from "@/components/portal/PatchAdmin";
import { requireOrgRole } from "@/lib/auth/session";
import { getOrgBySlug } from "@/lib/tenant";
import { listMembers, listPatchArt, listPatches } from "@/lib/queries";

export default async function PatchAdminPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  await requireOrgRole(org.id, "admin");

  const [patches, members, art] = await Promise.all([
    listPatches(org.id),
    listMembers(org.id),
    listPatchArt(org.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <DisplayHeading className="text-3xl text-primary">Patch Management</DisplayHeading>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Define requirements, adjust thresholds, and hand out the honors only
            leadership can give. Thresholds are only checked when an activity is
            approved — after changing one, backfill so members who already
            cleared it get it now.
          </p>
        </div>
        <BackfillAwardsButton orgId={org.id} />
      </div>

      <PatchAdmin
        orgId={org.id}
        patches={patches.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          description: p.description,
          tier: p.tier,
          requirement: p.requirement,
          manual: p.manual,
          active: p.active,
          emblem: p.emblem === true,
          art: art.get(p.id) ?? null,
          surface: p.defaultPlacement.surface,
          u: p.defaultPlacement.u,
          v: p.defaultPlacement.v,
        }))}
        members={members
          .filter((m) => !["exiled", "retired"].includes(m.status))
          .map((m) => ({ id: m.id, label: `"${m.roadName}" · ${m.displayName}` }))}
      />
    </div>
  );
}
