import { Award, Check, Lock } from "lucide-react";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { remainingLabel, type Ladder, type LadderTier } from "@/lib/patch-ladders";

/**
 * The Patches tab on a member's profile: one ladder per stat, five rungs each,
 * showing where they got to and what the next one costs.
 *
 * Deliberately not the Patch Wall. The wall is a catalogue of everything the
 * club offers; this is one member's climb, so it leads with the levels they
 * hold and keeps the unearned rungs visible but quiet.
 *
 * Every rung is a threshold on a stat that members log and officers approve, so
 * nothing here is hand-maintained — the ladders move when the record does.
 */

const RARITY_COLOR: Record<string, string> = {
  common: "#A8A29E",
  rare: "#5F9BD5",
  epic: "#B084E0",
  legendary: "#E0B84A",
};

const ROMAN = ["I", "II", "III", "IV", "V"];

function tierColor(tier: LadderTier): string {
  return RARITY_COLOR[tier.patch.rarity ?? "common"] ?? RARITY_COLOR.common;
}

function Rung({ tier, isNext }: { tier: LadderTier; isNext: boolean }) {
  const color = tierColor(tier);
  const numeral = ROMAN[tier.tier - 1] ?? String(tier.tier);

  return (
    <li className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
      <span
        aria-hidden
        className={
          "flex size-7 items-center justify-center rounded-full border text-[0.6rem] font-bold " +
          (tier.earned
            ? "border-transparent text-background"
            : isNext
              ? "border-dashed border-primary/60 bg-transparent text-primary"
              : "border-border bg-transparent text-muted-foreground/50")
        }
        style={tier.earned ? { background: color, boxShadow: `0 0 10px ${color}66` } : undefined}
      >
        {tier.earned ? <Check className="size-3.5" strokeWidth={3} /> : numeral}
      </span>
      <span
        className={
          "text-[0.68rem] leading-tight " +
          (tier.earned
            ? "font-semibold text-foreground"
            : isNext
              ? "text-primary"
              : "text-muted-foreground/60")
        }
        style={tier.earned ? { color } : undefined}
        title={tier.patch.description}
      >
        {tier.patch.name}
      </span>
      <span className="sr-only">
        {tier.earned
          ? `Earned${tier.awardedAt ? ` ${tier.awardedAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}`
          : `Locked — ${tier.patch.description}`}
      </span>
    </li>
  );
}

function LadderRow({ ladder }: { ladder: Ladder }) {
  const remaining = remainingLabel(ladder);
  const maxed = !ladder.next;

  return (
    <li className="rounded-lg border border-border bg-card/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          {ladder.label}
        </h3>
        <p className="font-stat text-sm text-muted-foreground">
          <span className="text-primary">{ladder.format(ladder.current)}</span>
          <span className="ml-3 text-xs">
            {ladder.earnedCount}/{ladder.tiers.length}
          </span>
        </p>
      </div>

      <ul className="mt-4 flex items-start justify-between gap-1">
        {ladder.tiers.map((tier) => (
          <Rung
            key={tier.patch.id}
            tier={tier}
            isNext={ladder.next?.patch.id === tier.patch.id}
          />
        ))}
      </ul>

      <div
        role="progressbar"
        aria-valuenow={ladder.pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${ladder.label} progress toward ${ladder.next?.patch.name ?? "complete"}`}
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={"h-full rounded-full " + (maxed ? "bg-primary" : "bg-primary/70")}
          style={{ width: `${ladder.pct}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {maxed ? (
          <span className="font-semibold text-primary">Ladder topped out.</span>
        ) : (
          <>
            <span className="font-stat text-foreground">{remaining}</span> more to{" "}
            <span className="font-semibold text-primary">{ladder.next!.patch.name}</span>
            <span className="ml-2 font-stat">{ladder.pct}%</span>
          </>
        )}
      </p>
    </li>
  );
}

export function PatchLadders({
  ladders,
  roadName,
  isSelf,
}: {
  ladders: Ladder[];
  roadName: string;
  isSelf: boolean;
}) {
  const earned = ladders.reduce((n, l) => n + l.earnedCount, 0);
  const total = ladders.reduce((n, l) => n + l.tiers.length, 0);

  return (
    <section
      aria-label="Patches"
      className="texture-noise rounded-xl border border-primary/20 bg-card p-6 md:p-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <DisplayHeading as="h2" className="text-2xl text-primary md:text-3xl">
            Patches
          </DisplayHeading>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSelf
              ? "Every level you've climbed, and what the next one costs."
              : `Every level ${roadName ? `"${roadName}"` : "this member"} has climbed.`}
          </p>
        </div>
        <p className="font-stat flex items-center gap-2 text-sm text-foreground">
          <Award className="size-4 text-primary" aria-hidden />
          <span className="text-primary">{earned}</span> of {total} earned
        </p>
      </div>

      {ladders.length === 0 ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="size-4" aria-hidden />
          No patches configured yet.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {ladders.map((ladder) => (
            <LadderRow key={ladder.statKey} ladder={ladder} />
          ))}
        </ul>
      )}
    </section>
  );
}
