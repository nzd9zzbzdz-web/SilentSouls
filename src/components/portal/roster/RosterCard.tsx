import Link from "next/link";
import {
  Award,
  Bike,
  Crown,
  HeartHandshake,
  ImageOff,
  Skull,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PatchCategory } from "@/lib/types";
import type { RosterMember } from "./types";

const CATEGORY_ICON: Record<PatchCategory, typeof Award> = {
  activity: Bike,
  service: HeartHandshake,
  leadership: Crown,
  recognition: Star,
  legendary: Skull,
};

/**
 * A member's slot on the lineup wall: their character render standing in a
 * lit frame, colors and rank on the plate below. Members without a render get
 * the silhouette, deliberately fogged so an empty frame reads as "art pending"
 * rather than as the member's actual look.
 */
export function RosterCard({
  orgSlug,
  member,
  viewerCanManageArt,
}: {
  orgSlug: string;
  member: RosterMember;
  viewerCanManageArt: boolean;
}) {
  const { hasRender, isOfficer, isPresident } = member;

  return (
    <Link
      href={`/${orgSlug}/portal/brotherhood/${member.id}`}
      className={cn(
        "group relative flex aspect-[3/4] flex-col overflow-hidden rounded-xl border bg-card transition-all duration-300",
        "hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none",
        isOfficer
          ? "border-primary/40 hover:border-primary/80 hover:shadow-[0_18px_45px_-18px_var(--primary)]"
          : "border-border hover:border-primary/50 hover:shadow-[0_14px_35px_-20px_var(--primary)]",
        isPresident && "ring-1 ring-primary/50",
      )}
    >
      {/* Stage light behind the figure */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          isOfficer
            ? "bg-[radial-gradient(120%_75%_at_50%_18%,color-mix(in_oklab,var(--primary)_28%,transparent),transparent_70%)]"
            : "bg-[radial-gradient(120%_75%_at_50%_18%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_70%)]",
          "opacity-70 group-hover:opacity-100",
        )}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={member.imageUrl}
        alt={hasRender ? `${member.roadName} character render` : ""}
        loading="lazy"
        decoding="async"
        className={cn(
          "absolute inset-x-0 bottom-0 mx-auto h-[86%] w-full object-contain object-bottom transition-transform duration-500 group-hover:scale-[1.04]",
          hasRender
            ? "drop-shadow-[0_18px_22px_rgba(0,0,0,0.55)]"
            : "opacity-25 grayscale",
        )}
      />

      {/* Scrim so the nameplate stays legible over any render */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[rgba(0,0,0,0.92)] via-[rgba(0,0,0,0.55)] to-transparent"
      />

      <div className="relative flex items-start justify-between p-3">
        <span className="font-stat rounded bg-black/40 px-1.5 py-0.5 text-[0.6rem] tracking-widest text-white/70 backdrop-blur-sm">
          No. {member.memberNumber}
        </span>
        {isPresident && (
          <Crown className="size-4 text-primary drop-shadow" aria-label="President" />
        )}
        {!hasRender && viewerCanManageArt && (
          <span className="inline-flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.12em] text-white/55 backdrop-blur-sm">
            <ImageOff className="size-2.5" aria-hidden />
            No render
          </span>
        )}
      </div>

      {/* Nameplate */}
      <div className="relative mt-auto p-3 pt-0">
        <div
          className={cn(
            "mb-1.5 inline-block rounded border px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em]",
            isOfficer
              ? "border-primary/60 bg-black/40 text-primary"
              : "border-white/20 bg-black/40 text-white/70",
          )}
        >
          {member.rankName}
        </div>
        <p
          className={cn(
            "truncate text-lg leading-tight drop-shadow",
            isOfficer ? "text-primary" : "text-white",
          )}
          style={{ fontFamily: "var(--font-display)" }}
        >
          &ldquo;{member.roadName}&rdquo;
        </p>
        <p className="truncate text-[0.7rem] text-white/55">{member.displayName}</p>

        <div className="mt-2 flex items-center justify-between border-t border-white/15 pt-2 text-[0.65rem] text-white/60">
          <span className="inline-flex items-center gap-1">
            <Award className="size-3 text-primary/80" aria-hidden />
            <span className="font-stat text-white/85">{member.patchCount}</span>
          </span>
          <span>Since {member.joinedLabel}</span>
        </div>
      </div>

      {/* Quick peek — additive only; everything above stays readable without it */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-3 border-t border-primary/30 bg-[rgba(0,0,0,0.88)] p-3 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
      >
        {member.rapStatus && (
          <p className="mb-2 text-[0.55rem] uppercase tracking-[0.16em] text-white/45">
            Status ·{" "}
            <span className="text-primary/90">{member.rapStatus}</span>
          </p>
        )}
        {member.topPatches.length > 0 ? (
          <ul className="space-y-1">
            {member.topPatches.map((p) => {
              const Icon = CATEGORY_ICON[p.category];
              return (
                <li
                  key={p.name}
                  className="flex items-center gap-1.5 text-[0.68rem] text-white/80"
                >
                  {p.artUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- streamed by the art route, already sized
                    <img
                      src={p.artUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-6 shrink-0 object-contain"
                    />
                  ) : (
                    <Icon className="size-3 shrink-0 text-primary/80" aria-hidden />
                  )}
                  <span className="truncate">{p.name}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[0.68rem] italic text-white/45">No patches earned yet.</p>
        )}
      </div>
    </Link>
  );
}
