import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ScrollText } from "lucide-react";
import { getBranding, getOrgBySlug } from "@/lib/tenant";
import { DisplayHeading } from "@/components/theme/DisplayHeading";

const EMBER = "#D9362B";
// Committed hero clip (text-free so the headline overlays on top). Referenced
// directly rather than via a branding doc so it ships with the deploy — the
// public branding read is Firestore-only with no fallback, so a branding field
// would stay invisible in prod until that doc was separately updated.
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
  const base = `/${orgSlug}`;

  const [line1, line2] = splitName(org.name);
  const creed = branding?.tagline ?? "Brotherhood · Loyalty · Respect · Death";

  const pillars = [
    { img: "/brand/emblem-skull.webp", title: "About Us", body: "Ravens of Death MC was founded on the core values of loyalty, trust, and respect. We are brothers, nothing more, nothing less.", href: `${base}/about`, cta: "Read More" },
    { img: "/brand/emblem-winged.webp", title: "Brotherhood", body: "We ride together, we stand together, we bleed together. Our bond is unbreakable. Our brotherhood is forever.", href: `${base}/about`, cta: "Read More" },
    { img: "/brand/emblem-onepercent.webp", title: "Our Code", body: "We live by a code. It guides our actions and defines who we are. Disrespect the code, and you'll face the consequences.", href: `${base}/about`, cta: "Read More" },
    { img: "/brand/emblem-mc.webp", title: "Join the Club", body: "Think you have what it takes to be one of us? Loyalty is earned, not given. Start your journey here.", href: `${base}/join`, cta: "Apply Now" },
  ];

  const news = [
    { tag: "Ride", title: "Sunday Run to Paleto Bay", date: "This weekend" },
    { tag: "Church", title: "Monthly Church: Mandatory", date: "Next Friday" },
    { tag: "Community", title: "Summer Food Drive, Legion Square", date: "This month" },
  ];

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-[#941B22]/15 bg-black">
        {/* Full-bleed hero video. Muted + looping so browsers allow autoplay;
            playsInline keeps it inline on iOS. The branded hero image is the
            poster, so a frame shows instantly while the clip loads (and stands
            in if the video can't play). Kept to the clip's aspect on desktop,
            capped so it can't blow up on an ultrawide screen. */}
        <div className="relative w-full min-h-[440px] overflow-hidden sm:min-h-0 sm:aspect-[2400/1026] sm:max-h-[760px]">
          <video
            className="absolute inset-0 h-full w-full object-cover"
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
              <Link
                href={`${base}/about`}
                className="inline-flex min-h-12 items-center rounded-sm border px-10 text-sm font-semibold uppercase tracking-[0.22em] transition-colors duration-200 hover:bg-[#D9362B]/10"
                style={{ borderColor: EMBER, color: EMBER }}
              >
                Learn More
              </Link>
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
              <article key={p.title} className="flex flex-col items-center px-6 text-center">
                <Image
                  src={p.img}
                  alt=""
                  width={160}
                  height={160}
                  unoptimized
                  className="h-16 w-auto object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] md:h-[4.75rem]"
                />
                <h3 className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-[#EEE7E8]">
                  {p.title}
                </h3>
                <p className="mt-3 max-w-[17rem] text-sm leading-relaxed text-[#B8A0A5]">
                  {p.body}
                </p>
                <Link
                  href={p.href}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                  style={{ color: EMBER }}
                >
                  {p.cta} <ChevronRight className="size-3.5" aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Latest ── */}
      <section aria-labelledby="news-heading" className="bg-[#050407]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-baseline justify-between">
            <h2
              id="news-heading"
              className="text-sm font-semibold uppercase tracking-[0.24em]"
              style={{ color: EMBER }}
            >
              Latest from the Club
            </h2>
            <Link
              href={`${base}/events`}
              className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B8A0A5] hover:text-[#EEE7E8]"
            >
              View all
            </Link>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {news.map((n) => (
              <Link
                key={n.title}
                href={`${base}/events`}
                className="group overflow-hidden rounded-lg border border-[#941B22]/12 bg-[#151017] transition-colors hover:border-[#941B22]/40"
              >
                <div
                  className="flex aspect-[16/10] items-center justify-center"
                  style={{
                    background:
                      "radial-gradient(120% 90% at 30% 10%, rgba(84,33,63,0.08), transparent), linear-gradient(160deg,#2D111F,#050407)",
                  }}
                >
                  <ScrollText className="size-10 text-[#D9362B]/25" aria-hidden />
                </div>
                <div className="p-5">
                  <span
                    className="text-[0.6rem] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: EMBER }}
                  >
                    {n.tag}
                  </span>
                  <p className="mt-1 font-semibold text-[#EEE7E8] group-hover:text-white">
                    {n.title}
                  </p>
                  <p className="mt-1 text-xs text-[#B8A0A5]">{n.date}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

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
          <Link
            href={`${base}/join`}
            className="mt-8 inline-flex min-h-11 items-center rounded-sm px-8 text-xs font-semibold uppercase tracking-[0.16em] text-[#EEE7E8] transition-opacity duration-200 hover:opacity-90"
            style={{ background: EMBER }}
          >
            Start Your Prospect Run
          </Link>
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

