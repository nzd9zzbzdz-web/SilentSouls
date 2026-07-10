import { notFound } from "next/navigation";
import { Award, ScrollText, ShieldAlert } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { OfficerNotes } from "@/components/portal/OfficerNotes";
import { requireOrgRole } from "@/lib/auth/session";
import { getOrgBySlug } from "@/lib/tenant";
import { orgRef } from "@/lib/firebase/admin";
import {
  getMember,
  listMemberAwards,
  listActivities,
  listPatches,
  listRanks,
  listMembers,
} from "@/lib/queries";
import { PROFILE_STAT_ORDER } from "@/lib/constants";
import type { Timestamp } from "firebase-admin/firestore";

interface ServiceEntry {
  id: string;
  kind: string;
  title: string;
  detail: string;
  at: Timestamp;
}

interface OfficerNote {
  id: string;
  body: string;
  authorUid: string;
  at: Timestamp;
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; memberId: string }>;
}) {
  const { orgSlug, memberId } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  const access = await requireOrgRole(org.id, "member");
  const isOfficer = access.role === "officer" || access.role === "admin";

  const member = await getMember(org.id, memberId);
  if (!member) notFound();

  const [ranks, awards, patches, activities, members] = await Promise.all([
    listRanks(org.id),
    listMemberAwards(org.id, memberId),
    listPatches(org.id),
    listActivities(org.id, { memberId, limit: 15 }),
    listMembers(org.id),
  ]);
  const rank = ranks.find((r) => r.id === member.rankId);
  const patchById = new Map(patches.map((p) => [p.id, p]));
  const sponsor = member.sponsorMemberId
    ? members.find((m) => m.id === member.sponsorMemberId)
    : null;

  const serviceSnap = await orgRef(org.id)
    .collection(`members/${memberId}/serviceRecord`)
    .orderBy("at", "desc")
    .limit(10)
    .get();
  const serviceRecord = serviceSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as ServiceEntry,
  );

  // Officer-only notes — server-gated, never fetched for regular members.
  let notes: OfficerNote[] = [];
  if (isOfficer) {
    const notesSnap = await orgRef(org.id)
      .collection(`members/${memberId}/notes`)
      .orderBy("at", "desc")
      .limit(20)
      .get();
    notes = notesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as OfficerNote);
  }

  const joined = (member.joinDate as Timestamp)?.toDate?.();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="size-16">
          <AvatarFallback className="bg-secondary text-lg font-bold">
            {member.roadName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <DisplayHeading className="text-3xl text-primary">
            &ldquo;{member.roadName}&rdquo;
          </DisplayHeading>
          <p className="text-sm text-muted-foreground">
            {member.displayName} · Member #{member.memberNumber}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline" className="border-primary/40 text-primary">
              {rank?.name ?? "Unranked"}
            </Badge>
            <Badge variant="secondary">{member.status}</Badge>
            {joined && (
              <span className="text-xs text-muted-foreground">
                Joined{" "}
                {joined.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
            {sponsor && (
              <span className="text-xs text-muted-foreground">
                · Sponsored by &ldquo;{sponsor.roadName}&rdquo;
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <section aria-labelledby="member-stats">
        <h2 id="member-stats" className="sr-only">
          Statistics
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {PROFILE_STAT_ORDER.map((stat) => (
            <Card key={stat.key} className="py-4">
              <CardContent className="px-4">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-stat mt-1 text-2xl font-semibold">
                  {member.stats?.[stat.key] ?? 0}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Earned patches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="size-4 text-primary" aria-hidden />
              Earned Patches ({awards.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {awards.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No patches yet — the road is long.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {awards.map((award) => {
                  const patch = patchById.get(award.patchId);
                  return (
                    <li
                      key={award.id}
                      className="rounded-md border border-border bg-secondary/50 px-3 py-2"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {patch?.name ?? award.patchId}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {patch?.category}
                        {award.awardedBy !== "system" && " · manually awarded"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Service record */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="size-4 text-primary" aria-hidden />
              Service Record
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serviceRecord.length === 0 ? (
              <p className="text-sm text-muted-foreground">Clean record.</p>
            ) : (
              <ul className="space-y-3">
                {serviceRecord.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-primary/40 pl-3">
                    <p className="text-sm font-medium text-foreground">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.at?.toDate?.().toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {entry.detail && ` — ${entry.detail}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity history */}
      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity submitted yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {activities.map((activity) => (
                <li key={activity.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {(activity.date as Timestamp)?.toDate?.().toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={
                      activity.status === "approved"
                        ? "default"
                        : activity.status === "denied"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {activity.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Officer notes — server-gated */}
      {isOfficer && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-primary" aria-hidden />
              Officer Notes
              <span className="text-xs font-normal text-muted-foreground">
                (visible to officers only)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OfficerNotes
              orgId={org.id}
              memberId={memberId}
              notes={notes.map((n) => ({
                id: n.id,
                body: n.body,
                at: n.at?.toDate?.().toISOString() ?? "",
              }))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
