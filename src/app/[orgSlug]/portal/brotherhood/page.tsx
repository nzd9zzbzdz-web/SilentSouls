import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { requireOrgRole } from "@/lib/auth/session";
import { getOrgBySlug } from "@/lib/tenant";
import { listMembers, listRanks } from "@/lib/queries";
import type { Timestamp } from "firebase-admin/firestore";

const STATUS_LABELS: Record<string, string> = {
  patched: "Patched",
  prospect: "Prospect",
  hangaround: "Hangaround",
  retired: "Retired",
  exiled: "Exiled",
};

export default async function BrotherhoodPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  await requireOrgRole(org.id, "member");

  const [members, ranks] = await Promise.all([
    listMembers(org.id),
    listRanks(org.id),
  ]);
  const rankById = new Map(ranks.map((r) => [r.id, r]));
  const active = members.filter((m) => !["retired", "exiled"].includes(m.status));
  const sorted = [...active].sort(
    (a, b) =>
      (rankById.get(a.rankId)?.order ?? 99) - (rankById.get(b.rankId)?.order ?? 99),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <DisplayHeading className="text-3xl text-primary">Brotherhood</DisplayHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          {sorted.length} active members riding under the colors.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Joined</TableHead>
              <TableHead className="text-right">Patches</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((member) => {
              const rank = rankById.get(member.rankId);
              const joined = (member.joinDate as Timestamp)?.toDate?.();
              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <Link
                      href={`/${orgSlug}/portal/brotherhood/${member.id}`}
                      className="flex items-center gap-3 hover:underline underline-offset-4"
                    >
                      <Avatar>
                        <AvatarFallback className="bg-secondary text-xs font-semibold">
                          {member.roadName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        <span className="block font-semibold text-foreground">
                          &ldquo;{member.roadName}&rdquo;
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {member.displayName} · #{member.memberNumber}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className={rank?.isOfficer ? "font-semibold text-primary" : ""}>
                      {rank?.name ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === "prospect" ? "secondary" : "outline"}>
                      {STATUS_LABELS[member.status] ?? member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {joined?.toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    }) ?? "—"}
                  </TableCell>
                  <TableCell className="font-stat text-right">{member.patchCount}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
