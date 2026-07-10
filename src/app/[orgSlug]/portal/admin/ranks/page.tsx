import { notFound } from "next/navigation";
import { Shield } from "lucide-react";
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
import { listMembers, listRanks } from "@/lib/queries";

export default async function RanksAdminPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  await requireOrgRole(org.id, "admin");

  const [ranks, members] = await Promise.all([
    listRanks(org.id),
    listMembers(org.id),
  ]);
  const countByRank = new Map<string, number>();
  for (const member of members) {
    countByRank.set(member.rankId, (countByRank.get(member.rankId) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <DisplayHeading className="flex items-center gap-3 text-3xl text-primary">
          <Shield className="size-7" aria-hidden />
          Ranks
        </DisplayHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          The chain of command. Assign ranks from the member admin page; rank
          editing tools arrive in a later milestone.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Order</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Members</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranks.map((rank) => (
              <TableRow key={rank.id}>
                <TableCell className="font-stat">{rank.order}</TableCell>
                <TableCell className="font-semibold">{rank.name}</TableCell>
                <TableCell>
                  <Badge variant={rank.isOfficer ? "default" : "secondary"}>
                    {rank.isOfficer ? "Officer" : "Member"}
                  </Badge>
                </TableCell>
                <TableCell className="font-stat text-right">
                  {countByRank.get(rank.id) ?? 0}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
