import Link from "next/link";
import { notFound } from "next/navigation";
import { HandHeart, HeartHandshake, Users, Utensils } from "lucide-react";
import { getBranding, getOrgBySlug } from "@/lib/tenant";
import { DisplayHeading } from "@/components/theme/DisplayHeading";

export default async function PublicHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  const branding = await getBranding(org.id, "public");

  const programs = [
    {
      icon: Utensils,
      title: "Community Food Drives",
      body: "Quarterly food drives across Los Santos putting meals on the tables of families who need them most.",
    },
    {
      icon: Users,
      title: "Youth Mentorship",
      body: "Riders and volunteers mentoring at-risk youth — showing up, week after week, when it counts.",
    },
    {
      icon: HandHeart,
      title: "Veteran Support",
      body: "Standing beside the veterans of San Andreas with housing help, rides to appointments, and brotherhood.",
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-secondary">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <DisplayHeading className="text-4xl leading-tight text-secondary-foreground md:text-5xl">
              Lifting up San Andreas, one neighborhood at a time.
            </DisplayHeading>
            <p className="mt-4 max-w-prose text-lg leading-relaxed text-muted-foreground">
              {branding?.mission ??
                "We bring neighbors together through food drives, mentorship, and community restoration projects."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${orgSlug}/donate`}
                className="flex min-h-11 items-center rounded-md bg-accent px-6 text-sm font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90"
              >
                Donate Today
              </Link>
              <Link
                href={`/${orgSlug}/events`}
                className="flex min-h-11 items-center rounded-md border border-border bg-background px-6 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-muted"
              >
                Upcoming Events
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="flex size-56 items-center justify-center rounded-full bg-primary/10 md:size-72">
              <HeartHandshake className="size-28 text-primary md:size-36" aria-hidden />
            </div>
          </div>
        </div>
      </section>

      {/* Impact stats */}
      <section aria-labelledby="impact-heading" className="mx-auto max-w-6xl px-4 py-16">
        <h2 id="impact-heading" className="sr-only">
          Our impact
        </h2>
        <dl className="grid gap-8 text-center sm:grid-cols-3">
          {[
            { value: "12,400+", label: "Meals served since 2023" },
            { value: "85", label: "Youth mentored this year" },
            { value: "31", label: "Neighborhood projects completed" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border p-6">
              <dt className="text-sm text-muted-foreground">{stat.label}</dt>
              <dd className="mt-1 text-3xl font-bold text-primary">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Programs */}
      <section aria-labelledby="programs-heading" className="bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <DisplayHeading as="h2" className="text-3xl text-foreground">
            What We Do
          </DisplayHeading>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {programs.map((program) => (
              <article key={program.title} className="rounded-lg border border-border bg-card p-6">
                <program.icon className="size-8 text-primary" aria-hidden />
                <h3 className="mt-4 text-lg font-semibold text-card-foreground">
                  {program.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {program.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <DisplayHeading as="h2" className="text-3xl text-foreground">
          Every hand makes the load lighter.
        </DisplayHeading>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Whether you can give an hour, a dollar, or a Saturday morning — there is a
          place for you here.
        </p>
        <Link
          href={`/${orgSlug}/donate`}
          className="mt-8 inline-flex min-h-11 items-center rounded-md bg-accent px-8 text-sm font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90"
        >
          Get Involved
        </Link>
      </section>
    </>
  );
}
