import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getBranding, getOrgBySlug } from "@/lib/tenant";
import { getGalleryPhotos } from "@/lib/gallery";
import { listMembers, listMembersWithRender, listRanks } from "@/lib/queries";
import {
  bySeniority,
  isPubliclyVisible,
  publicCardLabel,
  type PublicRosterMember,
} from "@/lib/public-roster";
import { CHARACTER_SILHOUETTE, DEFAULT_ROSTER_BACKDROP } from "@/lib/constants";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { Button } from "@/components/ui/button";
import { HeroGalleryFilmstrip } from "@/components/public/HeroGalleryFilmstrip";
import { BrotherhoodSection } from "@/components/public/BrotherhoodSection";
import type { Timestamp } from "firebase-admin/firestore";

const EMBER = "#D9362B";
// Committed hero clip (text-free so the headline overlays on top) — fallback
// backdrop when public/gallery has no photos. Referenced directly rather than
// via a branding doc so it ships with the deploy — the public branding read is
// Firestore-only with no fallback, so a branding field would stay invisible in
// prod until that doc was separately updated.
const HERO_VIDEO = "/brand/ravens-hero.mp4";

export default async function PublicHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  const branding = await getBranding(org.id, "public");
  const photos = await getGalleryPhotos();
  const base = `/${orgSlug}`;

  const [line1, line2] = splitName(org.name);
  const creed = branding?.tagline ?? "Brotherhood · Loyalty · Respect · Death";

  // The public roster: everyone under the colors, chain of command first. The
  // same gate guards the render route, so a face can't load for anyone the
  // section doesn't list.
  const [members, ranks] = await Promise.all([listMembers(org.id), listRanks(org.id)]);
  const rankById = new Map(ranks.map((r) => [r.id, r]));
  const publicMembers = members.filter((m) =>
    isPubliclyVisible(m, rankById.get(m.rankId)),
  );
  const withRender = await listMembersWithRender(
    org.id,
    publicMembers.map((m) => m.id),
  );
  const now = new Date();
  const brotherhood: PublicRosterMember[] = publicMembers
    .map((member) => {
      const joined = (member.joinDate as Timestamp)?.toDate?.() ?? null;
      // The seeder writes the shared silhouette into photoPath when a member
      // has no art, so a set photoPath alone doesn't mean they have a render.
      const ownArt =
        member.photoPath && member.photoPath !== CHARACTER_SILHOUETTE
          ? member.photoPath
          : undefined;
      return {
        id: member.id,
        // APPROVED renders only. A member's own upload is theirs to see in the
        // portal the moment it lands, but it doesn't reach the shopfront until
        // an officer says so — the render route enforces the same rule on the
        // bytes, so this isn't the only thing standing between the two.
        imageUrl: withRender.get(member.id)?.approved
          ? `/api/orgs/${org.id}/members/${member.id}/render`
          : (ownArt ?? CHARACTER_SILHOUETTE),
        tenureLabel: publicCardLabel(member, joined, now),
        joinedAtMs: joined?.getTime() ?? Number.MAX_SAFE_INTEGER,
        bio: member.bio ?? "",
      };
    })
    .sort(bySeniority);

  const pillars = [
    { img: "/brand/emblem-skull.webp", title: "About Us", body: "Ravens of Death MC was founded on the core values of loyalty, trust, and respect. We are brothers, nothing more, nothing less.", href: `${base}/about`, cta: "Read More" },
    { img: "/brand/emblem-winged.webp", title: "Brotherhood", body: "We ride together, we stand together, we bleed together. Our bond is unbreakable. Our brotherhood is forever.", href: "#brotherhood", cta: "Meet the Club" },
    { img: "/brand/emblem-onepercent.webp", title: "Our Code", body: "We live by a code. It guides our actions and defines who we are. Disrespect the code, and you'll face the consequences.", href: `${base}/about`, cta: "Read More" },
    { img: "/brand/emblem-mc.webp", title: "Join the Club", body: "Think you have what it takes to be one of us? Loyalty is earned, not given. Start your journey here.", href: `${base}/join`, cta: "Apply Now" },
  ];

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-[#941B22]/15 bg-black">
        {/* Gallery filmstrip backdrop: club photos auto-scroll across the full
            banner width, each at its natural aspect ratio (full banner height,
            width follows) so nothing is cropped or stretched. Falls back to the
            hero clip if public/gallery is empty. */}
        <div
          className="relative w-full min-h-[440px] overflow-hidden sm:min-h-0 sm:aspect-[2400/1026] sm:max-h-[760px]"
          style={{
            background:
              "radial-gradient(120% 80% at 78% 18%, rgba(84,33,63,0.16), transparent 55%), radial-gradient(90% 60% at 50% 120%, rgba(217,54,43,0.12), transparent 60%), linear-gradient(180deg,#151017,#050407)",
          }}
        >
          {photos.length > 0 ? (
            <HeroGalleryFilmstrip photos={photos} />
          ) : (
            <video
              className="absolute inset-0 h-full w-full object-contain"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={branding?.heroImagePath}
              aria-hidden
            >
              <source src={HERO_VIDEO} type="video/mp4" />
            </video>
          )}
        </div>

        {/* Legibility scrim */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/85 via-black/35 to-transparent"
          aria-hidden
        />

        {/* Text — overlaid, pushed right of the left edge */}
        <div className="absolute inset-0 flex items-center">
          <div className="px-6 md:pl-32 md:pr-6 lg:pl-56">
            <DisplayHeading className="text-6xl leading-[0.92] text-[#EEE7E8] drop-shadow-[0_2px_16px_rgba(0,0,0,0.7)] md:text-7xl lg:text-8xl">
              {line1}
              {line2 && <span className="mt-1 block">{line2}</span>}
            </DisplayHeading>

            {/* Creed, sandwiched by ornamental rules */}
            <div className="mt-8 max-w-xl">
              <OrnamentRule />
              <p
                className="my-3.5 text-center text-base font-semibold uppercase tracking-[0.16em] md:text-lg"
                style={{ color: "#D9362B" }}
              >
                {creed.split(/\s*[·|]\s*/).join(" | ")}
              </p>
              <OrnamentRule />
            </div>

            <p className="mt-7 max-w-lg text-lg leading-relaxed text-[#EEE7E8]">
              {branding?.mission ??
                "We are the Ravens. We ride where others fear to, bound by loyalty and blood. Death rides beside us, but so does honor, and no brother of ours ever rides alone."}
            </p>
            <div className="mt-10">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="px-10 font-semibold uppercase tracking-[0.22em]"
              >
                <Link href={`${base}/about`}>Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pillars ── */}
      <section aria-labelledby="creed-heading" className="relative overflow-hidden bg-[#050407]">
        {/* Skull illustration bleeds off the left; art fades to black on the right */}
        {/* The art's canvas is near-black (~#020202), darker than the section, so an
            opaque contain image reads as a rectangle. mix-blend-mode:lighten takes the
            per-pixel max against the section bg: the dark canvas becomes exactly the
            section color (vanishes) while the brighter skull shows — no seam, any width. */}
        <Image
          src="/brand/skull-bg.webp"
          alt=""
          fill
          sizes="100vw"
          className="pointer-events-none object-contain object-left"
          style={{
            mixBlendMode: "lighten",
            filter: "brightness(3.8) contrast(1.12) saturate(1.15)",
          }}
        />
        <div className="relative px-6 py-16 md:py-20 lg:pl-[24%] lg:pr-12">
          <h2 id="creed-heading" className="sr-only">
            The club
          </h2>
          <div className="grid gap-y-12 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-4 lg:gap-x-0 lg:gap-y-0 lg:divide-x lg:divide-[#941B22]/15">
            {pillars.map((p) => (
              // The whole pillar is the target — emblem, heading and copy all
              // read as one clickable card, so aiming at the small link below
              // them is never the only way through.
              <Link
                key={p.title}
                href={p.href}
                className="group flex flex-col items-center rounded-lg px-6 py-2 text-center transition-colors duration-200 hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9362B]/60"
              >
                <Image
                  src={p.img}
                  alt=""
                  width={160}
                  height={160}
                  unoptimized
                  className="h-16 w-auto object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-105 md:h-[4.75rem]"
                />
                <h3 className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-[#EEE7E8]">
                  {p.title}
                </h3>
                <p className="mt-3 max-w-[17rem] text-sm leading-relaxed text-[#B8A0A5]">
                  {p.body}
                </p>
                <span
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] group-hover:underline"
                  style={{ color: EMBER }}
                >
                  {p.cta} <ChevronRight className="size-3.5" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Brotherhood ── */}
      <BrotherhoodSection
        members={brotherhood}
        joinHref={`${base}/join`}
        backdropPath={branding?.rosterBackdropPath ?? DEFAULT_ROSTER_BACKDROP}
      />

      {/* "Latest from the Club" used to sit here. It was three hardcoded
          placeholder items — a run "this weekend", a food drive "this month" —
          which a visitor reads as the club's actual plans. Pulled rather than
          left lying: fiction dated to the present tense ages badly on a public
          site. It comes back when there's a real source behind it (the Events
          collection, or an admin-authored feed). See git history for the
          markup, which was fine — only the data was made up. */}

      {/* ── Closing ── */}
      <section className="border-t border-[#941B22]/12 bg-[#050407]">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <DisplayHeading as="h2" className="text-3xl text-[#EEE7E8] md:text-4xl">
            Loyalty is earned, not given.
          </DisplayHeading>
          <p className="mx-auto mt-3 max-w-md text-[#B8A0A5]">
            The road is long and it isn&rsquo;t for everyone. If you think you belong
            with the Ravens, come prove it.
          </p>
          {/* The page's one true action — ember tier. */}
          <Button
            asChild
            className="mt-8 px-8 text-xs font-semibold uppercase tracking-[0.16em]"
          >
            <Link href={`${base}/join`}>Start Your Prospect Run</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

/** Thin gold rule with a centered diamond — brackets the hero creed. */
function OrnamentRule() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1" style={{ background: "rgba(84,33,63,0.45)" }} />
      <span className="size-1.5 rotate-45" style={{ background: EMBER }} />
      <span className="h-px flex-1" style={{ background: "rgba(84,33,63,0.45)" }} />
    </div>
  );
}

/** "Ravens of Death MC" → ["Ravens of Death", "MC"] for a two-line hero. */
function splitName(name: string): [string, string | null] {
  const m = name.match(/^(.*?)\s+(MC.*)$/i);
  if (m) return [m[1], m[2]];
  return [name, null];
}

