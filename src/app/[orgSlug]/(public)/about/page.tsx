import { notFound } from "next/navigation";
import { getBranding, getOrgBySlug } from "@/lib/tenant";
import { DisplayHeading } from "@/components/theme/DisplayHeading";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  const branding = await getBranding(org.id, "public");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <DisplayHeading className="text-4xl text-foreground">
        About {branding?.orgDisplayName}
      </DisplayHeading>
      <div className="mt-6 space-y-4 leading-relaxed text-foreground">
        <p>
          {branding?.mission ??
            "We are a community organization dedicated to serving San Andreas."}
        </p>
        <p>
          Founded in 2023 by a group of riders who believed their community deserved
          better, the foundation began with a single food drive in Sandy Shores.
          Today our volunteers organize programs across the state — from Paleto Bay
          to the heart of Los Santos.
        </p>
        <p>
          We believe in showing up. Not once, not when the cameras are around, but
          every week, for the people who need it. Our volunteers come from every
          walk of life, united by the road and by the belief that no neighbor
          should be left behind.
        </p>
      </div>

      <h2 className="mt-12 text-2xl font-semibold text-foreground">Our Values</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {[
          ["Loyalty to Community", "The people of San Andreas come first — always."],
          ["Respect", "Every neighbor, every volunteer, every story matters."],
          ["Commitment", "We finish what we start, and we keep our word."],
          ["Brotherhood", "No one rides alone. No one struggles alone."],
        ].map(([title, body]) => (
          <li key={title} className="rounded-lg border border-border bg-card p-5">
            <p className="font-semibold text-card-foreground">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
