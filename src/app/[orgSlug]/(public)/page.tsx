import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ScrollText, Shield, Skull, Users } from "lucide-react";
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
    { icon: Skull, title: "About Us", body: "Founded on loyalty, trust, and respect. We are brothers — nothing more, nothing less.", href: `${base}/about`, cta: "Read More" },
    { icon: Shield, title: "Brotherhood", body: "We ride together, we stand together. Our bond is unbreakable. Our brotherhood is forever.", href: `${base}/about`, cta: "Read More" },
    { icon: Diamond1, title: "Our Code", body: "We live by a code. It guides our actions and defines who we are. Disrespect it, face the consequences.", href: `${base}/about`, cta: "Read More" },
    { icon: DiamondMC, title: "Join the Club", body: "Think you have what it takes to ride with us? Loyalty is earned, not given. Start your journey here.", href: `${base}/join`, cta: "Apply Now" },
  ];

  const news = [
    { tag: "Ride", title: "Sunday Run to Paleto Bay", date: "This weekend" },
    { tag: "Church", title: "Monthly Church — Mandatory", date: "Next Friday" },
    { tag: "Community", title: "Summer Food Drive, Legion Square", date: "This month" },
  ];

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-[#D4AF37]/15 bg-[#0a0908]">
        {/* Cinematic backdrop (swap for a real hero photo when available) */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 80% at 78% 18%, rgba(212,175,55,0.10), transparent 55%), radial-gradient(90% 60% at 50% 120%, rgba(185,28,28,0.10), transparent 60%), linear-gradient(180deg,#0d0b08,#080706)",
            }}
          />
          <Skull
            className="absolute -right-10 top-1/2 hidden -translate-y-1/2 text-[#D4AF37]/[0.06] md:block"
            style={{ width: "40rem", height: "40rem" }}
            aria-hidden
          />
          {/* road vanishing point */}
          <div
            className="absolute inset-x-0 bottom-0 h-2/3"
            style={{
              background: "linear-gradient(180deg,transparent, rgba(0,0,0,0.6))",
              maskImage: "radial-gradient(60% 100% at 50% 100%, black, transparent)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-24 md:py-36">
          <div className="max-w-2xl">
            <DisplayHeading className="text-5xl leading-[0.95] text-[#EDE6D3] md:text-7xl">
              {line1}
              {line2 && <span className="mt-1 block">{line2}</span>}
            </DisplayHeading>
            <p
              className="mt-6 text-sm font-semibold uppercase tracking-[0.28em] md:text-base"
              style={{ color: GOLD }}
            >
              {creed}
            </p>
            <p className="mt-6 max-w-lg leading-relaxed text-[#A79C84]">
              {branding?.mission ??
                "We are the silent ones. We ride in shadows, bound by loyalty and respect. Our souls may be silent, but our presence speaks louder than words."}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href={`${base}/about`}
                className="inline-flex min-h-11 items-center gap-2 rounded-sm border px-7 text-xs font-semibold uppercase tracking-[0.16em] transition-colors duration-200"
                style={{ borderColor: GOLD, color: GOLD }}
              >
                Learn More <ChevronRight className="size-4" aria-hidden />
              </Link>
              <Link
                href={`${base}/join`}
                className="inline-flex min-h-11 items-center rounded-sm px-7 text-xs font-semibold uppercase tracking-[0.16em] text-[#1a1408] transition-opacity duration-200 hover:opacity-90"
                style={{ background: GOLD }}
              >
                Prospect With Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pillars ── */}
      <section aria-labelledby="creed-heading" className="relative bg-[#0b0a08]">
        <Skull
          className="pointer-events-none absolute -left-16 top-1/2 hidden -translate-y-1/2 text-[#D4AF37]/[0.04] lg:block"
          style={{ width: "28rem", height: "28rem" }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl gap-px border-y border-[#D4AF37]/10 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:px-8">
          <h2 id="creed-heading" className="sr-only">
            The club
          </h2>
          {pillars.map((p) => (
            <article key={p.title} className="flex flex-col items-center px-4 py-6 text-center">
              <p.icon className="size-11" style={{ color: GOLD }} aria-hidden />
              <h3
                className="mt-4 text-lg uppercase tracking-[0.12em] text-[#EDE6D3]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {p.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#8f846d]">{p.body}</p>
              <Link
                href={p.href}
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ color: GOLD }}
              >
                {p.cta} <ChevronRight className="size-3.5" aria-hidden />
              </Link>
            </article>
          ))}
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

/** "Silent Souls MC" → ["Silent Souls", "MC"] for a two-line hero. */
function splitName(name: string): [string, string | null] {
  const m = name.match(/^(.*?)\s+(MC.*)$/i);
  if (m) return [m[1], m[2]];
  return [name, null];
}

// Gold heraldic emblems (CSS, no assets needed).
function Diamond1({ className }: { className?: string }) {
  return (
    <span className={className} style={{ display: "inline-grid", placeItems: "center" }} aria-hidden>
      <span
        style={{
          width: "2.4rem",
          height: "2.4rem",
          transform: "rotate(45deg)",
          border: `2px solid ${GOLD}`,
          borderRadius: 4,
          display: "grid",
          placeItems: "center",
        }}
      >
        <span style={{ transform: "rotate(-45deg)", color: GOLD, fontWeight: 700, fontSize: "0.75rem" }}>1%</span>
      </span>
    </span>
  );
}
function DiamondMC({ className }: { className?: string }) {
  return (
    <span className={className} style={{ display: "inline-grid", placeItems: "center" }} aria-hidden>
      <span
        style={{
          width: "2.4rem",
          height: "2.4rem",
          transform: "rotate(45deg)",
          border: `2px solid ${GOLD}`,
          borderRadius: 4,
          display: "grid",
          placeItems: "center",
        }}
      >
        <span
          style={{ transform: "rotate(-45deg)", color: GOLD, fontWeight: 700, fontSize: "0.7rem", fontFamily: "var(--font-display)" }}
        >
          MC
        </span>
      </span>
    </span>
  );
}
