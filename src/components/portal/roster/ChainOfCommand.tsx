import Link from "next/link";
import { Crown } from "lucide-react";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { cn } from "@/lib/utils";
import type { RosterMember } from "./types";

/* ── Plate geometry ───────────────────────────────────────────────────
   The rings, nameplates, connectors and stat bar are PAINTED INTO the
   plate art; this component only lays live text and faces over them.
   Every number below is a pixel measured off that art in its own
   1556×720 space — positions AND type sizes, so the block scales as one
   piece with its container and a re-crop is a search-and-replace rather
   than a redesign.

   This table describes the plate TEMPLATE, not one club's picture. A club
   supplying its own plate paints to these positions; a club with no plate
   art gets the stacked panel instead (see the entry point).            */

/**
 * The window of that 1556×720 render the shipped file actually contains.
 *
 * The original carried ~44px of soft red-brown smoke down each side (18 top,
 * 11 bottom) outside the painted frame, which against Void Black read as a
 * dirty rectangle around a crisp plate. The file is now trimmed to the frame
 * itself, with two pixels of margin so the crop cannot slice the outer
 * hairline.
 *
 * Stated as an offset rather than baked into the coordinates so every constant
 * below stays exactly as it was measured off the full render and remains
 * checkable against it. A future re-crop is these four numbers.
 */
const CROP = { x: 42, y: 16, w: 1473, h: 695 } as const;

// Positions carry the crop offset. Sizes never do — a width is a distance
// between two art-space points, and subtracting the offset from one would
// shrink every box by 42px.
const px = (v: number) => `${((v - CROP.x) / CROP.w) * 100}%`;
const py = (v: number) => `${((v - CROP.y) / CROP.h) * 100}%`;
const pw = (v: number) => `${(v / CROP.w) * 100}%`;
const ph = (v: number) => `${(v / CROP.h) * 100}%`;
/** Art-space px → container units, so type scales with the plate. */
const cq = (v: number) => `${(v / CROP.w) * 100}cqw`;

/** Absolute box from art-space edges, as percentages of the plate. */
function box(x0: number, y0: number, x1: number, y1: number) {
  return { left: px(x0), top: py(y0), width: pw(x1 - x0), height: ph(y1 - y0) };
}

/** The five painted officer rings, left to right, by centre x. */
const OFFICER_CX = [307.5, 543.2, 779, 1014.8, 1250.5] as const;

/**
 * Ring centre, the face that sits inside the painted ring, and the slot's
 * bounding box (ring top → bottom of the rank plate). `face` stops a few px
 * short of the ring's inner edge so a render never laps the bezel.
 */
const OFFICER = { cy: 458, face: 106, halfPlate: 86, top: 398, bottom: 591 } as const;
const PRESIDENT = { cx: 779, cy: 171, face: 152, halfPlate: 99, top: 87, bottom: 343 } as const;

/** Where the club headcount sits on the painted stat bar, right of each icon. */
const STAT_BAR = { top: 613, bottom: 691 } as const;
const STAT_TEXT_X = [452, 748, 1050] as const;
const STAT_RIGHT_X = [600, 910, 1283] as const;

/**
 * Clear leather between the top ornament and the rule below it. Stops short
 * of 680 on purpose — that's where the president's slot (a link) begins.
 */
const HEADING_BOX = box(120, 76, 650, 248);

/** Type sizes, in the same art-space px as everything above. */
const TYPE = {
  heading: 88,
  blurb: 19,
  presidentName: 43,
  presidentRank: 15,
  officerName: 29,
  officerRank: 13,
  statValue: 37,
  statLabel: 17,
} as const;

/* ── Shared bits ──────────────────────────────────────────────────── */

/**
 * A member's render, head-cropped. The stored art is full-body, so it is
 * scaled up and pinned to the top — same trick as the roster card.
 */
function Face({
  member,
  className,
  style,
  initialsSize = "0.875rem",
}: {
  member: RosterMember;
  className?: string;
  style?: React.CSSProperties;
  /** Sized by the caller: `cqw` is meaningless outside the plate's container. */
  initialsSize?: string;
}) {
  return (
    // No background of its own: on the plate the painted ring already has a
    // dark interior, and tinting it reads as a purple lens over the leather.
    <span
      className={cn("relative block overflow-hidden rounded-full", className)}
      style={style}
    >
      {member.hasRender ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full scale-[2.6] object-contain object-top"
          style={{ transformOrigin: "top center" }}
        />
      ) : (
        <span
          className="grid size-full place-items-center uppercase text-muted-foreground"
          style={{ fontFamily: "var(--font-display)", fontSize: initialsSize }}
          aria-hidden
        >
          {member.roadName.slice(0, 2)}
        </span>
      )}
    </span>
  );
}

/**
 * Ranks the club wears short. Keyed on the name with everything but letters
 * stripped, so "Sergeant-at-Arms", "Sergeant at Arms" and "Sgt. at Arms" all
 * land on the same badge — the rank doc is admin-editable and the punctuation
 * drifts. Anything unlisted is shown as written.
 */
const RANK_BADGES: Record<string, string> = {
  sergeantatarms: "SAA",
};

function rankBadge(name: string): string {
  return RANK_BADGES[name.toLowerCase().replace(/[^a-z]/g, "")] ?? name;
}

const SUMMARY_LABELS = ["Riding", "Officers", "Prospecting"] as const;

function summaryValues(counts: Counts) {
  return [counts.riding, counts.officers, counts.prospecting];
}

/* ── The engraved plate (lg and up, exactly the painted table) ─────── */

/**
 * One slot: a link whose bounding box spans the painted ring down to the
 * bottom of the rank plate, with the face and both plates placed inside it
 * in the slot's OWN percentage space.
 */
function PlateSlot({
  orgSlug,
  member,
  cx,
  president,
}: {
  orgSlug: string;
  /** Whoever holds this seat, or undefined while the club has not filled it. */
  member?: RosterMember;
  cx: number;
  president?: boolean;
}) {
  const g = president ? PRESIDENT : OFFICER;
  const h = g.bottom - g.top;
  const w = g.halfPlate * 2;
  // Slot-local percentages: an art-space pixel as a fraction of THIS box.
  const lx = (v: number) => `${((v - (cx - g.halfPlate)) / w) * 100}%`;
  const ly = (v: number) => `${((v - g.top) / h) * 100}%`;
  const lw = (v: number) => `${(v / w) * 100}%`;
  const lh = (v: number) => `${(v / h) * 100}%`;

  // Painted plate edges, in art space.
  const name = president ? { top: 256, bottom: 312 } : { top: 514, bottom: 561 };
  const rank = president
    ? { top: 313, bottom: 343, left: 709, right: 850 }
    : { top: 562, bottom: 591, left: cx - 70.5, right: cx + 70.5 };

  const slotBox = { left: px(cx - g.halfPlate), top: py(g.top), width: pw(w), height: ph(h) };

  // An empty seat still labels its nameplate. The ring is painted into the
  // art whether or not anyone stands in it, so a bare one reads as a picture
  // that failed to load; "Vacant" reads as a chair waiting to be filled, and
  // tells an admin setting the club up which seats are still open.
  if (!member) {
    return (
      <div className="absolute" style={slotBox} aria-hidden>
        <span
          className="absolute flex items-center justify-center overflow-hidden px-[6%]"
          style={{ left: 0, top: ly(name.top), width: "100%", height: lh(name.bottom - name.top) }}
        >
          <span
            className="max-w-full truncate leading-none text-muted-foreground/45"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: cq(president ? TYPE.presidentName : TYPE.officerName),
              textShadow: "0 2px 6px rgba(0,0,0,0.9)",
            }}
          >
            Vacant
          </span>
        </span>
      </div>
    );
  }

  return (
    <Link
      href={`/${orgSlug}/portal/brotherhood/${member.id}`}
      className="group absolute"
      style={slotBox}
    >
      <Face
        member={member}
        initialsSize={cq(president ? 38 : 27)}
        className="absolute -translate-x-1/2 -translate-y-1/2 transition-[filter] duration-200 group-hover:brightness-110"
        style={{
          left: lx(cx),
          top: ly(g.cy),
          width: lw(g.face),
          aspectRatio: "1",
          boxShadow: `0 0 ${cq(23)} rgba(0,0,0,0.85)`,
          // Renders are lit for the character stage, not for black leather —
          // without a pool behind them a dark figure vanishes into the ring.
          // Neutral (--foreground), so it reads as light rather than a tint.
          background:
            "radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--foreground) 18%, transparent), transparent 72%)",
        }}
      />

      {/* Road name, centred on the painted nameplate. */}
      <span
        className="absolute flex items-center justify-center overflow-hidden px-[6%]"
        style={{ left: 0, top: ly(name.top), width: "100%", height: lh(name.bottom - name.top) }}
      >
        <span
          className={cn(
            "max-w-full truncate leading-none transition-colors",
            president ? "text-primary" : "text-foreground group-hover:text-primary",
          )}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: cq(president ? TYPE.presidentName : TYPE.officerName),
            textShadow: "0 2px 6px rgba(0,0,0,0.9)",
          }}
        >
          {member.roadName}
        </span>
      </span>

      {/* Club rank, centred on the narrower plate below it. */}
      <span
        className="absolute flex items-center justify-center overflow-hidden"
        style={{
          left: lx(rank.left),
          top: ly(rank.top),
          width: lw(rank.right - rank.left),
          height: lh(rank.bottom - rank.top),
        }}
      >
        <span
          title={member.rankName}
          className={cn(
            "max-w-full truncate uppercase leading-none text-muted-foreground",
            president ? "tracking-[0.16em]" : "tracking-[0.05em]",
          )}
          style={{ fontSize: cq(president ? TYPE.presidentRank : TYPE.officerRank) }}
        >
          {rankBadge(member.rankName)}
        </span>
      </span>
    </Link>
  );
}

function ChainPlate({
  orgSlug,
  plateArt,
  title,
  blurb,
  president,
  officers,
  counts,
}: {
  orgSlug: string;
  plateArt: string;
  title: string;
  blurb: string;
  /** Undefined between presidents, or before the club has any members. */
  president?: RosterMember;
  officers: RosterMember[];
  counts: Counts;
}) {
  return (
    <div className="@container relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={plateArt}
        alt=""
        width={CROP.w}
        height={CROP.h}
        className="block w-full"
        style={{ height: "auto" }}
      />

      {/* Heading sits in the leather the art left clear for it. */}
      <div className="absolute flex flex-col justify-start" style={HEADING_BOX}>
        <DisplayHeading
          className="leading-[0.95] text-primary"
          style={{
            fontSize: cq(TYPE.heading),
            textShadow:
              "0 0 0.9em color-mix(in srgb, var(--primary) 40%, transparent), 0 3px 8px rgba(0,0,0,0.95)",
          }}
        >
          {title}
        </DisplayHeading>
        {blurb && (
          <p
            className="mt-[4%] uppercase leading-[1.7] tracking-[0.14em] text-muted-foreground"
            style={{ fontSize: cq(TYPE.blurb) }}
          >
            {blurb}
          </p>
        )}
      </div>

      <PlateSlot orgSlug={orgSlug} member={president} cx={PRESIDENT.cx} president />
      {/* Over the painted RINGS, not over the officers: the art has five and
          the club may have fewer, and a ring is a fixed place on the plate
          whether or not it is occupied. */}
      {OFFICER_CX.map((cx, i) => (
        <PlateSlot key={cx} orgSlug={orgSlug} member={officers[i]} cx={cx} />
      ))}

      {/* Headcount, seated to the right of the painted icons. */}
      <dl>
        {summaryValues(counts).map((value, i) => (
          <div
            key={SUMMARY_LABELS[i]}
            className="absolute flex items-center gap-[0.5cqw]"
            style={box(STAT_TEXT_X[i], STAT_BAR.top, STAT_RIGHT_X[i], STAT_BAR.bottom)}
          >
            <dd
              className="font-stat leading-none text-foreground"
              style={{ fontSize: cq(TYPE.statValue) }}
            >
              {value}
            </dd>
            <dt
              className="uppercase leading-none tracking-[0.14em] text-muted-foreground"
              style={{ fontSize: cq(TYPE.statLabel) }}
            >
              {SUMMARY_LABELS[i]}
            </dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ── Stacked fallback (narrow screens, or a table that isn't 5-wide) ── */

function StackChip({
  orgSlug,
  member,
  president,
}: {
  orgSlug: string;
  member: RosterMember;
  president?: boolean;
}) {
  return (
    <Link
      href={`/${orgSlug}/portal/brotherhood/${member.id}`}
      className="group flex w-24 flex-col items-center gap-1.5 text-center sm:w-28"
    >
      <Face
        member={member}
        className={cn(
          "border bg-secondary/60 transition-all duration-200 group-hover:-translate-y-0.5",
          president
            ? "size-16 border-primary/70 ring-2 ring-primary/25"
            : "size-12 border-border group-hover:border-primary/60",
        )}
      />
      <span
        className={cn(
          "w-full truncate leading-tight transition-colors",
          president ? "text-base text-primary" : "text-sm text-foreground group-hover:text-primary",
        )}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {member.roadName}
      </span>
      <span
        title={member.rankName}
        className="w-full truncate text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground"
      >
        {rankBadge(member.rankName)}
      </span>
    </Link>
  );
}

function ChainStack({
  orgSlug,
  title,
  blurb,
  president,
  officers,
  counts,
}: {
  orgSlug: string;
  title: string;
  blurb: string;
  president?: RosterMember;
  officers: RosterMember[];
  counts: Counts;
}) {
  return (
    <div className="texture-noise glass-card rounded-xl p-6 md:p-8">
      {/* Ember on purpose, and the only page heading in the portal that keeps
          it — this is the club's front door. It matches the painted plate's
          heading above, which is the same title in the other rendering; the
          two must not disagree just because a club has five officers or three. */}
      <DisplayHeading className="text-3xl text-primary md:text-4xl">{title}</DisplayHeading>
      {blurb && <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>}

      <div className="mt-8 flex flex-col items-center">
        {president && (
          <>
            <Crown className="mb-2 size-4 text-primary/70" aria-hidden />
            <StackChip orgSlug={orgSlug} member={president} president />
            {officers.length > 0 && <div className="mt-3 h-5 w-px bg-border" aria-hidden />}
          </>
        )}

        {officers.length > 0 && (
          <>
            <div
              className="h-px w-full max-w-3xl bg-gradient-to-r from-transparent via-border to-transparent"
              aria-hidden
            />
            <div className="flex flex-wrap items-start justify-center gap-x-2 gap-y-4 pt-4">
              {officers.map((officer) => (
                <div key={officer.id} className="flex flex-col items-center">
                  <div className="-mt-4 mb-2 h-4 w-px bg-border" aria-hidden />
                  <StackChip orgSlug={orgSlug} member={officer} />
                </div>
              ))}
            </div>
          </>
        )}

        <dl className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-border/60 pt-4 text-center">
          {summaryValues(counts).map((value, i) => (
            <div key={SUMMARY_LABELS[i]} className="flex items-baseline gap-1.5">
              <dd className="font-stat text-lg leading-none text-foreground">{value}</dd>
              <dt className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                {SUMMARY_LABELS[i]}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/* ── Entry point ──────────────────────────────────────────────────── */

interface Counts {
  riding: number;
  officers: number;
  prospecting: number;
}

/**
 * The club's table, drawn: President at the head, the rest of the officers
 * ranked beneath.
 *
 * Two renderings of the same data. The engraved plate is pixel-locked to the
 * painted art, so it runs only when the club HAS plate art, when its table is
 * no bigger than the one the art depicts (a president plus five officers), and
 * when there's width enough for the faces to read. An under-filled table is
 * fine and draws the spare rings as open seats. A club with more officers than
 * rings gets the stacked panel instead, because on the plate the extra officer
 * would have nowhere to stand and would drop out of the chain of command
 * silently; so does a phone, and so does a club with no plate at all.
 */
export function ChainOfCommand({
  orgSlug,
  plateArt,
  title,
  blurb,
  officers,
  counts,
}: {
  orgSlug: string;
  /** This club's plate art, or null when it has none. */
  plateArt: string | null;
  title: string;
  blurb: string;
  officers: RosterMember[];
  counts: Counts;
}) {
  const president = officers.find((o) => o.isPresident);
  const rest = officers.filter((o) => o !== president);
  // The club must HAVE plate art (one with none gets the stacked panel rather
  // than another club's engraving), and its table must not be BIGGER than the
  // one the art depicts. Fewer is fine: the spare rings are painted into the
  // picture regardless and label themselves as open seats, which is what a
  // club looks like while it is still being set up. More is not, because the
  // sixth officer would have no ring to stand in and would simply vanish from
  // the chain of command; that club keeps the stacked panel, which lays out
  // for any headcount. Width is the last condition: the faces have to read.
  const fitsPlate = Boolean(plateArt) && rest.length <= OFFICER_CX.length;

  return (
    <>
      {fitsPlate && plateArt && (
        <div className="hidden lg:block">
          <ChainPlate
            orgSlug={orgSlug}
            plateArt={plateArt}
            title={title}
            blurb={blurb}
            president={president}
            officers={rest}
            counts={counts}
          />
        </div>
      )}
      <div className={cn(fitsPlate && "lg:hidden")}>
        <ChainStack
          orgSlug={orgSlug}
          title={title}
          blurb={blurb}
          president={president}
          officers={rest}
          counts={counts}
        />
      </div>
    </>
  );
}
