import Link from "next/link";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import type { PublicRosterMember } from "@/lib/public-roster";

/**
 * "The Brotherhood" on the public home page: everyone riding under the colors,
 * chain of command first.
 *
 * Deliberately not the portal roster. These cards carry a road name, a rank and
 * a face — nothing from the member's record, which is the whole point of the
 * public/portal split. Cards don't link anywhere: there is no public profile,
 * and there shouldn't be.
 */
export function BrotherhoodSection({
  members,
  joinHref,
}: {
  members: PublicRosterMember[];
  joinHref: string;
}) {
  if (members.length === 0) return null;

  const officers = members.filter((m) => m.isOfficer).length;

  return (
    <section
      id="brotherhood"
      aria-labelledby="brotherhood-heading"
      className="scroll-mt-20 border-t border-border bg-background"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Under the Colors
          </p>
          <DisplayHeading
            as="h2"
            className="mt-3 text-4xl text-foreground md:text-5xl"
          >
            The Brotherhood
          </DisplayHeading>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground">
            {members.length} riding, {officers} at the table. We ride together, we
            stand together. Every patch here was earned.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((member) => (
            <li
              key={member.id}
              className={cn(
                "group relative flex aspect-[3/4] flex-col overflow-hidden rounded-xl border bg-card",
                member.isOfficer ? "border-primary/40" : "border-border",
              )}
            >
              <div
                aria-hidden
                className={cn(
                  "absolute inset-0",
                  member.isOfficer
                    ? "bg-[radial-gradient(120%_75%_at_50%_18%,color-mix(in_oklab,var(--primary)_26%,transparent),transparent_70%)]"
                    : "bg-[radial-gradient(120%_75%_at_50%_18%,color-mix(in_oklab,var(--primary)_11%,transparent),transparent_70%)]",
                )}
              />

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={member.imageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-x-0 bottom-0 mx-auto h-[86%] w-full object-contain object-bottom drop-shadow-[0_18px_22px_rgba(0,0,0,0.55)] transition-transform duration-500 group-hover:scale-[1.04]"
              />

              {/* Scrim so the nameplate stays legible over any render */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[rgba(0,0,0,0.92)] via-[rgba(0,0,0,0.55)] to-transparent"
              />

              {member.rankOrder === 1 && (
                <div className="relative flex justify-end p-3">
                  <Crown className="size-4 text-primary drop-shadow" aria-label="President" />
                </div>
              )}

              <div className="relative mt-auto p-3">
                <div
                  className={cn(
                    "mb-1.5 inline-block rounded border px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em]",
                    member.isOfficer
                      ? "border-primary/60 bg-black/40 text-primary"
                      : "border-white/20 bg-black/40 text-white/70",
                  )}
                >
                  {member.rankName}
                </div>
                <p
                  className={cn(
                    "truncate text-lg leading-tight drop-shadow",
                    member.isOfficer ? "text-primary" : "text-white",
                  )}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  &ldquo;{member.roadName}&rdquo;
                </p>
                <p className="truncate text-[0.7rem] text-white/55">
                  Riding since {member.joinedLabel}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-12 text-center">
          <Link
            href={joinHref}
            className="inline-flex min-h-11 items-center rounded-sm border border-primary px-8 text-xs font-semibold uppercase tracking-[0.16em] text-primary transition-colors duration-200 hover:bg-primary/10"
          >
            Ride With Us
          </Link>
        </div>
      </div>
    </section>
  );
}
