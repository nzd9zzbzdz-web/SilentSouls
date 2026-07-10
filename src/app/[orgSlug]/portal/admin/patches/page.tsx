import { notFound } from "next/navigation";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { PatchAdmin } from "@/components/portal/PatchAdmin";
import { requireOrgRole } from "@/lib/auth/session";
import { getOrgBySlug } from "@/lib/tenant";
import { listMembers, listPatches } from "@/lib/queries";

export default async function PatchAdminPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  await requireOrgRole(org.id, "admin");

  const [patches, members] = await Promise.all([
    listPatches(org.id),
    listMembers(org.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <DisplayHeading className="text-3xl text-primary">Patch Management</DisplayHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          Define requirements, adjust thresholds, and hand out the honors only
          leadership can give.
        </p>
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
          surface: p.defaultPlacement.surface,
          u: p.defaultPlacement.u,
          v: p.defaultPlacement.v,
        }))}
        members={members
          .filter((m) => !["exiled", "retired"].includes(m.status))
          .map((m) => ({ id: m.id, label: `"${m.roadName}" — ${m.displayName}` }))}
      />
    </div>
  );
}
