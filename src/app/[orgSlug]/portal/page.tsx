import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity as ActivityIcon, Award, ClipboardCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { requireOrgRole } from "@/lib/auth/session";
import { getOrgBySlug } from "@/lib/tenant";
import {
  countPending,
  getMember,
  listActivities,
  listActivityTypes,
  listMemberAwards,
  listMembers,
  listPatches,
} from "@/lib/queries";
import { PROFILE_STAT_ORDER } from "@/lib/constants";
import type { Timestamp } from "firebase-admin/firestore";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  const access = await requireOrgRole(org.id, "member");

  const member = access.memberId ? await getMember(org.id, access.memberId) : null;
  const [patches, types, recent, pendingCount] = await Promise.all([
    listPatches(org.id),
    listActivityTypes(org.id),
    listActivities(org.id, { limit: 8 }),
    access.role !== "member" ? countPending(org.id) : Promise.resolve(0),
  ]);
  const awards = access.memberId
    ? await listMemberAwards(org.id, access.memberId)
    : [];
  const members = await listMembers(org.id);
  const memberById = new Map(members.map((m) => [m.id, m]));
  const typeById = new Map(types.map((t) => [t.id, t]));

  // Next closest locked patch = the motivator card.
  const earned = new Set(awards.map((a) => a.patchId));
  const nextUp = member
    ? patches
        .filter((p) => p.requirement && !earned.has(p.id))
        .map((p) => ({
          patch: p,
          current: member.stats?.[p.requirement!.statKey] ?? 0,
          pct: Math.min(
            100,
            Math.round(
              ((member.stats?.[p.requirement!.statKey] ?? 0) /
                p.requirement!.threshold) *
                100,
            ),
          ),
        }))
        .sort((a, b) => b.pct - a.pct)[0]
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <DisplayHeading className="text-3xl text-primary md:text-4xl">
            {member ? `Welcome back, "${member.roadName}"` : "Welcome, Platform Owner"}
          </DisplayHeading>
          <p className="mt-1 text-sm text-muted-foreground">
            {member
              ? `Member #${member.memberNumber} · ${awards.length} patches earned`
              : org.name}
          </p>
        </div>
        {(access.role === "officer" || access.role === "admin") && pendingCount > 0 && (
          <Link
            href={`/${orgSlug}/portal/activities/review`}
            className="glow-gold flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity duration-200 hover:opacity-90"
          >
            <ClipboardCheck className="size-4" aria-hidden />
            {pendingCount} awaiting review
          </Link>
        )}
      </div>

      {/* Stats */}
      {member && (
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">
            Your service record
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {PROFILE_STAT_ORDER.map((stat) => (
              <Card key={stat.key} className="py-4">
                <CardContent className="px-4">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="font-stat mt-1 text-2xl font-semibold text-foreground">
                    {member.stats?.[stat.key] ?? 0}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="size-4 text-primary" aria-hidden />
              Recent Club Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium">Nothing logged yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Submit your first activity to start building your record.
                </p>
                <Link
                  href={`/${orgSlug}/portal/activities`}
                  className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
                >
                  Log an activity
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((activity) => {
                  const who = memberById.get(activity.memberId);
                  const type = typeById.get(activity.typeId);
                  const when = (activity.createdAt as Timestamp)?.toDate?.();
                  return (
                    <li key={activity.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">
                          <span className="font-semibold">
                            &ldquo;{who?.roadName ?? "Unknown"}&rdquo;
                          </span>{" "}
                          — {type?.name ?? activity.typeId}
                        </p>
                        {when && (
                          <p className="text-xs text-muted-foreground">
                            {when.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        )}
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
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Next patch progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="size-4 text-primary" aria-hidden />
              Next Patch
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextUp ? (
              <div>
                <p className="font-semibold text-foreground">{nextUp.patch.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {nextUp.patch.description}
                </p>
                <div
                  role="progressbar"
                  aria-valuenow={nextUp.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${nextUp.patch.name} progress`}
                  className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${nextUp.pct}%` }}
                  />
                </div>
                <p className="font-stat mt-2 text-sm text-muted-foreground">
                  {nextUp.current} / {nextUp.patch.requirement!.threshold}
                  <span className="ml-2 text-primary">{nextUp.pct}%</span>
                </p>
                <Link
                  href={`/${orgSlug}/portal/patch-wall`}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  <TrendingUp className="size-4" aria-hidden />
                  View the Patch Wall
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {member
                  ? "You've earned everything on the board. Legend."
                  : "Patch progress appears for member accounts."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
