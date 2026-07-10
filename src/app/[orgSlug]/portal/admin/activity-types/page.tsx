import { notFound } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { requireOrgRole } from "@/lib/auth/session";
import { getOrgBySlug } from "@/lib/tenant";
import { listActivityTypes } from "@/lib/queries";
import { STAT_LABELS } from "@/lib/constants";

export default async function ActivityTypesAdminPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  await requireOrgRole(org.id, "admin");

  const types = await listActivityTypes(org.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <DisplayHeading className="flex items-center gap-3 text-3xl text-primary">
          <SlidersHorizontal className="size-7" aria-hidden />
          Activity Types
        </DisplayHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          What members can submit and which stat each type feeds. Editing tools
          arrive in a later milestone.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Feeds stat</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map((type) => (
              <TableRow key={type.id}>
                <TableCell className="font-semibold">{type.name}</TableCell>
                <TableCell className="text-sm">{STAT_LABELS[type.statKey]}</TableCell>
                <TableCell>
                  {type.requiresProof ? (
                    <Badge variant="outline">Required</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Optional</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={type.active ? "default" : "secondary"}>
                    {type.active ? "Active" : "Disabled"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
