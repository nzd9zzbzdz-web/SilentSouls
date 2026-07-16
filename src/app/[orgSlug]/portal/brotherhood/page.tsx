import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Crown, ShieldHalf, UserRound } from "lucide-react";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { requireOrgRole } from "@/lib/auth/session";
import { getOrgBySlug } from "@/lib/tenant";
import { listMembers, listRanks } from "@/lib/queries";
import type { Member, Rank } from "@/lib/types";
import type { Timestamp } from "firebase-admin/firestore";
import { cn } from "@/lib/utils";

type TierKey = "officers" | "patched" | "prospects" | "hangarounds";

const TIERS: { key: TierKey; label: string; blurb: string }[] = [
  { key: "officers", label: "Officers", blurb: "Those who carry the gavel." },
  { key: "patched", label: "Patched Members", blurb: "Full colors, earned." },
  { key: "prospects", label: "Prospects", blurb: "Earning their bottom rocker." },
  { key: "hangarounds", label: "Hangarounds", blurb: "Around, not in — yet." },
];

function fmtJoined(d?: Date): string {
  return d ? d.toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—";
}

function MemberCard({
  orgSlug,
  member,
  rank,
  officer,
}: {
  orgSlug: string;
  member: Member;
  rank?: Rank;
  officer: boolean;
}) {
  const joined = fmtJoined((member.joinDate as Timestamp)?.toDate?.());
  const president = rank?.order === 1;
  return (
    <Link
      href={`/${orgSlug}/portal/brotherhood/${member.id}`}
      className={cn(
        "group relative flex flex-col gap-4 rounded-xl border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5",
        officer
          ? "border-primary/40 shadow-[0_0_0_1px_rgba(84,33,63,0.08)] hover:border-primary/70 hover:shadow-[0_10px_30px_-12px_rgba(84,33,63,0.35)]"
          : "border-border hover:border-primary/40",
      )}
    >
      {president && (
        <Crown
          className="absolute right-4 top-4 size-4 text-primary/80"
          aria-label="President"
        />
      )}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "grid size-14 shrink-0 place-items-center rounded-full text-lg font-bold uppercase tracking-tight",
            officer
              ? "bg-gradient-to-b from-[#2D111F] to-[#151017] text-primary ring-2 ring-primary/60"
              : "bg-secondary text-secondary-foreground ring-1 ring-border",
          )}
          style={{ fontFamily: "var(--font-display)" }}
          aria-hidden
        >
          {member.roadName.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-xl leading-tight",
              officer ? "text-primary" : "text-foreground",
            )}
            style={{ fontFamily: "var(--font-display)" }}
          >
            &ldquo;{member.roadName}&rdquo;
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {member.displayName} · No. {member.memberNumber}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "self-start rounded-md border px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em]",
          officer
            ? "border-primary/50 text-primary"
            : "border-border text-muted-foreground",
        )}
      >
        {rank?.name ?? "—"}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Award className="size-3.5 text-primary/70" aria-hidden />
          <span className="font-stat text-foreground">{member.patchCount}</span> patches
        </span>
        <span>Since {joined}</span>
      </div>
    </Link>
  );
}

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

  const tierOf = (m: Member): TierKey => {
    const rank = rankById.get(m.rankId);
    if (rank?.isOfficer) return "officers";
    if (m.status === "prospect") return "prospects";
    if (m.status === "hangaround") return "hangarounds";
    return "patched";
  };

  const byTier = new Map<TierKey, Member[]>();
  for (const m of active) {
    const key = tierOf(m);
    (byTier.get(key) ?? byTier.set(key, []).get(key)!).push(m);
  }
  for (const list of byTier.values()) {
    list.sort(
      (a, b) =>
        (rankById.get(a.rankId)?.order ?? 99) - (rankById.get(b.rankId)?.order ?? 99) ||
        a.memberNumber - b.memberNumber,
    );
  }

  const officerCount = byTier.get("officers")?.length ?? 0;
  const prospectCount = byTier.get("prospects")?.length ?? 0;

  const standing = [
    { icon: UserRound, value: active.length, label: "Riding" },
    { icon: ShieldHalf, value: officerCount, label: "Officers" },
    { icon: Award, value: prospectCount, label: "Prospecting" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="texture-noise rounded-xl border border-primary/20 bg-card p-6 md:p-8">
        <DisplayHeading className="text-4xl text-primary">Brotherhood</DisplayHeading>
        <p className="mt-2 text-sm text-muted-foreground">
          Every rider under the colors — the whole club, in order of the patch.
        </p>
        <dl className="mt-6 grid max-w-md grid-cols-3 gap-4">
          {standing.map((s) => (
            <div key={s.label} className="flex items-center gap-2.5">
              <s.icon className="size-5 text-primary/70" aria-hidden />
              <div>
                <dd className="font-stat text-xl leading-none text-foreground">{s.value}</dd>
                <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  {s.label}
                </dt>
              </div>
            </div>
          ))}
        </dl>
      </div>

      {TIERS.map(({ key, label, blurb }) => {
        const list = byTier.get(key);
        if (!list || list.length === 0) return null;
        return (
          <section key={key} aria-labelledby={`tier-${key}`}>
            <div className="flex items-baseline gap-3 border-b border-border pb-2">
              <h2
                id={`tier-${key}`}
                className="text-sm font-semibold uppercase tracking-[0.18em] text-primary"
              >
                {label}
              </h2>
              <span className="font-stat text-xs text-muted-foreground">{list.length}</span>
              <span className="ml-auto hidden text-xs italic text-muted-foreground sm:block">
                {blurb}
              </span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((member) => (
                <MemberCard
                  key={member.id}
                  orgSlug={orgSlug}
                  member={member}
                  rank={rankById.get(member.rankId)}
                  officer={key === "officers"}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
