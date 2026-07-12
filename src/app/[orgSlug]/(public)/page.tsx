import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ScrollText } from "lucide-react";
import { getBranding, getOrgBySlug } from "@/lib/tenant";
import { DisplayHeading } from "@/components/theme/DisplayHeading";

const GOLD = "#D4AF37";

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
  const creed = branding?.tagline ?? "Brotherhood · Loyalty · Respect · Silence";

  const pillars = [
    { img: "/brand/emblem-skull.webp", title: "About Us", body: "Silent Souls MC was founded on the core values of loyalty, trust, and respect. We are brothers — nothing more, nothing less.", href: `${base}/about`, cta: "Read More" },
    { img: "/brand/emblem-winged.webp", title: "Brotherhood", body: "We ride together, we stand together, we bleed together. Our bond is unbreakable. Our brotherhood is forever.", href: `${base}/about`, cta: "Read More" },
    { img: "/brand/emblem-onepercent.webp", title: "Our Code", body: "We live by a code. It guides our actions and defines who we are. Disrespect the code, and you'll face the consequences.", href: `${base}/about`, cta: "Read More" },
    { img: "/brand/emblem-mc.webp", title: "Join the Club", body: "Think you have what it takes to be one of us? Loyalty is earned, not given. Start your journey here.", href: `${base}/join`, cta: "Apply Now" },
  ];

  const news = [
    { tag: "Ride", title: "Sunday Run to Paleto Bay", date: "This weekend" },
    { tag: "Church", title: "Monthly Church — Mandatory", date: "Next Friday" },
    { tag: "Community", title: "Summer Food Drive, Legion Square", date: "This month" },
  ];

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-[#D4AF37]/15 bg-black">
        {/* Backdrop locked to the image's own aspect so the full photo shows,
            capped so it can't blow up on an ultrawide screen. */}
        <div className="relative w-full min-h-[440px] overflow-hidden sm:min-h-0 sm:aspect-[2400/1026] sm:max-h-[760px]">
          {branding?.heroImagePath ? (
            <Image
              src={branding.heroImagePath}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: "center 42%" }}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 80% at 78% 18%, rgba(212,175,55,0.10), transparent 55%), radial-gradient(90% 60% at 50% 120%, rgba(185,28,28,0.10), transparent 60%), linear-gradient(180deg,#0d0b08,#080706)",
              }}
              aria-hidden
            />
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
            <DisplayHeading className="text-6xl leading-[0.92] text-[#F5EFE1] drop-shadow-[0_2px_16px_rgba(0,0,0,0.7)] md:text-7xl lg:text-8xl">
              {line1}
              {line2 && <span className="mt-1 block">{line2}</span>}
            </DisplayHeading>

            {/* Creed, sandwiched by ornamental rules */}
            <div className="mt-8 max-w-xl">
              <OrnamentRule />
              <p
                className="my-3.5 text-center text-base font-semibold uppercase tracking-[0.16em] md:text-lg"
                style={{ color: "#E3BC4E" }}
              >
                {creed.split(/\s*[·|]\s*/).join(" | ")}
              </p>
              <OrnamentRule />
            </div>

            <p className="mt-7 max-w-lg text-lg leading-relaxed text-[#E4DCCB]">
              {branding?.mission ??
                "We are the silent ones. We ride in shadows, bound by loyalty and respect. Our souls may be silent, but our presence speaks louder than words."}
            </p>
            <div className="mt-10">
              <Link
                href={`${base}/about`}
                className="inline-flex min-h-12 items-center rounded-sm border px-10 text-sm font-semibold uppercase tracking-[0.22em] transition-colors duration-200 hover:bg-[#D4AF37]/10"
                style={{ borderColor: GOLD, color: GOLD }}
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pillars ── */}
      <section aria-labelledby="creed-heading" className="relative overflow-hidden bg-[#0a0806]">
        {/* Skull illustration bleeds off the left; art fades to black on the right */}
        <Image
          src="/brand/skull-bg.webp"
          alt=""
          fill
          sizes="100vw"
          className="pointer-events-none object-cover object-left"
        />
        <div className="relative px-6 py-16 md:py-20 lg:pl-[26%] lg:pr-16">
          <h2 id="creed-heading" className="sr-only">
            The club
          </h2>
          <div className="grid gap-y-12 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-4 lg:gap-x-0 lg:gap-y-0 lg:divide-x lg:divide-[#D4AF37]/15">
            {pillars.map((p) => (
              <article key={p.title} className="flex flex-col items-center px-6 text-center">
                <Image
                  src={p.img}
                  alt=""
                  width={160}
                  height={160}
                  className="h-16 w-auto object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] md:h-[4.75rem]"
                />
                <h3 className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-[#EDE6D3]">
                  {p.title}
                </h3>
                <p className="mt-3 max-w-[17rem] text-sm leading-relaxed text-[#9a8f79]">
                  {p.body}
                </p>
                <Link
                  href={p.href}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                  style={{ color: GOLD }}
                >
                  {p.cta} <ChevronRight className="size-3.5" aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Latest ── */}
      <section aria-labelledby="news-heading" className="bg-[#080706]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-baseline justify-between">
            <h2
              id="news-heading"
              className="text-sm font-semibold uppercase tracking-[0.24em]"
              style={{ color: GOLD }}
            >
              Latest from the Club
            </h2>
            <Link
              href={`${base}/events`}
              className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f846d] hover:text-[#EDE6D3]"
            >
              View all
            </Link>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {news.map((n) => (
              <Link
                key={n.title}
                href={`${base}/events`}
                className="group overflow-hidden rounded-lg border border-[#D4AF37]/12 bg-[#111009] transition-colors hover:border-[#D4AF37]/40"
              >
                <div
                  className="flex aspect-[16/10] items-center justify-center"
                  style={{
                    background:
                      "radial-gradient(120% 90% at 30% 10%, rgba(212,175,55,0.08), transparent), linear-gradient(160deg,#17130b,#0b0a07)",
                  }}
                >
                  <ScrollText className="size-10 text-[#D4AF37]/25" aria-hidden />
                </div>
                <div className="p-5">
                  <span
                    className="text-[0.6rem] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: GOLD }}
                  >
                    {n.tag}
                  </span>
                  <p className="mt-1 font-semibold text-[#EDE6D3] group-hover:text-white">
                    {n.title}
                  </p>
                  <p className="mt-1 text-xs text-[#8f846d]">{n.date}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing ── */}
      <section className="border-t border-[#D4AF37]/12 bg-[#0a0908]">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <DisplayHeading as="h2" className="text-3xl text-[#EDE6D3] md:text-4xl">
            Loyalty is earned, not given.
          </DisplayHeading>
          <p className="mx-auto mt-3 max-w-md text-[#8f846d]">
            The road is long and it isn&rsquo;t for everyone. If you think you belong
            with the Souls, come prove it.
          </p>
          <Link
            href={`${base}/join`}
            className="mt-8 inline-flex min-h-11 items-center rounded-sm px-8 text-xs font-semibold uppercase tracking-[0.16em] text-[#1a1408] transition-opacity duration-200 hover:opacity-90"
            style={{ background: GOLD }}
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
      <span className="h-px flex-1" style={{ background: "rgba(212,175,55,0.45)" }} />
      <span className="size-1.5 rotate-45" style={{ background: GOLD }} />
      <span className="h-px flex-1" style={{ background: "rgba(212,175,55,0.45)" }} />
    </div>
  );
}

/** "Silent Souls MC" → ["Silent Souls", "MC"] for a two-line hero. */
function splitName(name: string): [string, string | null] {
  const m = name.match(/^(.*?)\s+(MC.*)$/i);
  if (m) return [m[1], m[2]];
  return [name, null];
}

