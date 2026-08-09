import Link from "next/link";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RosterMember } from "./types";

function OfficerChip({
  orgSlug,
  member,
  size,
}: {
  orgSlug: string;
  member: RosterMember;
  size: "president" | "officer";
}) {
  const president = size === "president";
  return (
    <Link
      href={`/${orgSlug}/portal/brotherhood/${member.id}`}
      className="group flex w-24 flex-col items-center gap-1.5 text-center sm:w-28"
    >
      <span
        className={cn(
          "relative block overflow-hidden rounded-full border bg-secondary transition-all duration-200",
          president
            ? "size-16 border-primary/70 ring-2 ring-primary/25"
            : "size-12 border-border group-hover:border-primary/60",
          "group-hover:-translate-y-0.5",
        )}
      >
        {member.hasRender ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            // Renders are full-body: scale up and pin to the top for a head crop.
            className="absolute inset-0 size-full scale-[2.6] object-contain object-top"
            style={{ transformOrigin: "top center" }}
          />
        ) : (
          <span
            className="grid size-full place-items-center text-sm uppercase text-muted-foreground"
            style={{ fontFamily: "var(--font-display)" }}
            aria-hidden
          >
            {member.roadName.slice(0, 2)}
          </span>
        )}
      </span>
      <span
        className={cn(
          "w-full truncate leading-tight transition-colors",
          president ? "text-base text-primary" : "text-sm text-foreground group-hover:text-primary",
        )}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {member.roadName}
      </span>
      <span className="w-full truncate text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground">
        {member.rankName}
      </span>
    </Link>
  );
}

/**
 * The club's table, drawn: President at the head, the rest of the officers
 * ranked beneath. Falls back to a plain officer row when there's no president
 * on the books (a club mid-election shouldn't render a broken tree).
 */
export function ChainOfCommand({
  orgSlug,
  officers,
  counts,
}: {
  orgSlug: string;
  officers: RosterMember[];
  counts: { riding: number; officers: number; prospecting: number };
}) {
  const president = officers.find((o) => o.isPresident);
  const rest = officers.filter((o) => o !== president);

  const summary = [
    { value: counts.riding, label: "Riding" },
    { value: counts.officers, label: "Officers" },
    { value: counts.prospecting, label: "Prospecting" },
  ];

  return (
    <div className="flex flex-col items-center">
      {president && (
        <>
          <Crown className="mb-2 size-4 text-primary/70" aria-hidden />
          <OfficerChip orgSlug={orgSlug} member={president} size="president" />
          {rest.length > 0 && (
            <div className="mt-3 h-5 w-px bg-border" aria-hidden />
          )}
        </>
      )}

      {rest.length > 0 && (
        <>
          <div
            className="h-px w-full max-w-3xl bg-gradient-to-r from-transparent via-border to-transparent"
            aria-hidden
          />
          <div className="flex flex-wrap items-start justify-center gap-x-2 gap-y-4 pt-4">
            {rest.map((officer) => (
              <div key={officer.id} className="flex flex-col items-center">
                <div className="-mt-4 mb-2 h-4 w-px bg-border" aria-hidden />
                <OfficerChip orgSlug={orgSlug} member={officer} size="officer" />
              </div>
            ))}
          </div>
        </>
      )}

      <dl className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-border/60 pt-4 text-center">
        {summary.map((s) => (
          <div key={s.label} className="flex items-baseline gap-1.5">
            <dd className="font-stat text-lg leading-none text-foreground">{s.value}</dd>
            <dt className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
              {s.label}
            </dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
