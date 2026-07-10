import { notFound } from "next/navigation";
import { Award, Crown, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { requireOrgRole } from "@/lib/auth/session";
import { getOrgBySlug } from "@/lib/tenant";
import { orgRef } from "@/lib/firebase/admin";
import {
  getMember,
  listMemberAwards,
  listMembers,
  listPatches,
} from "@/lib/queries";
import { STAT_LABELS } from "@/lib/constants";
import type { AwardedPatch, Patch } from "@/lib/types";

const CATEGORY_LABELS: Record<Patch["category"], string> = {
  activity: "Activity",
  service: "Service",
  leadership: "Leadership",
  recognition: "Recognition",
  legendary: "Legendary",
};

export default async function PatchWallPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  const access = await requireOrgRole(org.id, "member");

  const [patches, members] = await Promise.all([
    listPatches(org.id),
    listMembers(org.id),
  ]);
  const member = access.memberId ? await getMember(org.id, access.memberId) : null;
  const myAwards = access.memberId
    ? await listMemberAwards(org.id, access.memberId)
    : [];
  const earnedIds = new Set(myAwards.map((a) => a.patchId));

  // Hall of Legends: every legendary award across the club.
  const legendaryPatches = patches.filter((p) => p.category === "legendary");
  const legendaryAwardSnaps = await Promise.all(
    legendaryPatches.map((p) =>
      orgRef(org.id).collection("awardedPatches").where("patchId", "==", p.id).get(),
    ),
  );
  const memberById = new Map(members.map((m) => [m.id, m]));
  const legends = legendaryPatches.flatMap((patch, i) =>
    legendaryAwardSnaps[i].docs.map((d) => {
      const award = d.data() as AwardedPatch;
      return {
        patch,
        holder: memberById.get(award.memberId),
        reason: award.reason,
      };
    }),
  );

  const active = patches.filter((p) => p.active);
  const earned = active.filter((p) => earnedIds.has(p.id));
  const locked = active
    .filter((p) => !earnedIds.has(p.id) && p.category !== "legendary")
    .map((patch) => {
      const req = patch.requirement;
      const current = req ? (member?.stats?.[req.statKey] ?? 0) : 0;
      const pct = req
        ? Math.min(100, Math.round((current / req.threshold) * 100))
        : null; // manual-only
      return { patch, current, pct };
    })
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="texture-noise rounded-xl border border-primary/20 bg-card p-6 md:p-8">
        <DisplayHeading className="text-4xl text-primary">Patch Wall</DisplayHeading>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Every patch tells a story. Earn yours on the road, in church, and when
          the club calls.
        </p>
        {member && (
          <p className="font-stat mt-4 text-sm text-foreground">
            <span className="text-primary">{earned.length}</span> of {active.length}{" "}
            patches earned
          </p>
        )}
      </div>

      {/* Earned */}
      <section aria-labelledby="earned-heading">
        <h2
          id="earned-heading"
          className="flex items-center gap-2 text-lg font-semibold text-foreground"
        >
          <Award className="size-5 text-primary" aria-hidden />
          Earned
        </h2>
        {earned.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing on your wall yet. Get riding.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {earned.map((patch) => (
              <li
                key={patch.id}
                className="glow-gold rounded-lg border border-primary/40 bg-card p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className="text-xl text-primary"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {patch.name}
                  </p>
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    {CATEGORY_LABELS[patch.category]}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{patch.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Locked with progress */}
      <section aria-labelledby="locked-heading">
        <h2
          id="locked-heading"
          className="flex items-center gap-2 text-lg font-semibold text-foreground"
        >
          <Lock className="size-5 text-muted-foreground" aria-hidden />
          Still to Earn
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locked.map(({ patch, current, pct }) => (
            <li
              key={patch.id}
              className="rounded-lg border border-border bg-card/60 p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-lg font-semibold text-muted-foreground">
                  {patch.name}
                </p>
                <Badge variant="secondary">{CATEGORY_LABELS[patch.category]}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{patch.description}</p>
              {pct !== null && patch.requirement ? (
                <>
                  <div
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${patch.name} progress`}
                    className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="font-stat mt-2 text-xs text-muted-foreground">
                    {STAT_LABELS[patch.requirement.statKey]}: {current} /{" "}
                    {patch.requirement.threshold}
                    <span className="ml-2 text-primary">{pct}%</span>
                  </p>
                </>
              ) : (
                <p className="mt-3 text-xs italic text-muted-foreground">
                  Awarded by leadership — earn it when it counts.
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Hall of Legends */}
      <section aria-labelledby="legends-heading">
        <div className="texture-noise rounded-xl border border-primary/30 bg-gradient-to-b from-card to-background p-6">
          <h2
            id="legends-heading"
            className="flex items-center gap-2 text-2xl text-primary"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <Crown className="size-6" aria-hidden />
            Hall of Legends
          </h2>
          {legends.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No legends yet. Some patches can&apos;t be chased — they find you.
            </p>
          ) : (
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {legends.map(({ patch, holder, reason }, i) => (
                <li
                  key={`${patch.id}-${i}`}
                  className="rounded-lg border border-primary/40 bg-card p-5"
                >
                  <p
                    className="text-xl text-primary"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {patch.name}
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    &ldquo;{holder?.roadName ?? "Unknown"}&rdquo;
                    {holder && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {holder.displayName}
                      </span>
                    )}
                  </p>
                  {reason && (
                    <p className="mt-2 text-sm italic text-muted-foreground">
                      &ldquo;{reason}&rdquo;
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
