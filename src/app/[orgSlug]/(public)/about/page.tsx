import { notFound } from "next/navigation";
import { getBranding, getOrgBySlug } from "@/lib/tenant";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { CLUB_CREED, CLUB_STORY } from "@/lib/constants";

/**
 * What the club says about itself. The story is branding data with a shipped
 * fallback (see CLUB_STORY) — a tenant tells its own history rather than
 * having it written into this component.
 */
const VALUES: [string, string][] = [
  ["The Patch", "Not clothing. A promise, and it has to be earned."],
  ["Loyalty", "Money comes and goes. Bikes can be replaced. Loyalty is permanent."],
  ["Freedom", "Zero percent. We don't ride another club's path."],
  ["Brotherhood", "No brother of ours ever rides alone."],
];

export default async function AboutPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  const branding = await getBranding(org.id, "public");

  const story = branding?.story?.length ? branding.story : CLUB_STORY;
  const creed = branding?.creed?.length ? branding.creed : CLUB_CREED;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-16">
      <div>
        <DisplayHeading className="text-4xl text-foreground">
          About {branding?.orgDisplayName}
        </DisplayHeading>
        <p className="mt-3 text-muted-foreground">
          How the club started, and what the patch means.
        </p>
      </div>

      <div className="space-y-4 leading-relaxed text-foreground">
        {branding?.mission && (
          <p className="text-lg text-muted-foreground">{branding.mission}</p>
        )}
        {story.map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
      </div>

      {/* The closing stanza — short lines, so they get the display face and
          room to breathe rather than reading as one more paragraph. */}
      {creed.length > 0 && (
        <div className="border-l-2 border-primary/50 pl-5">
          {creed.map((line) => (
            <DisplayHeading
              as="h2"
              key={line}
              className="text-xl leading-relaxed text-primary md:text-2xl"
            >
              {line}
            </DisplayHeading>
          ))}
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold text-foreground">What We Stand On</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {VALUES.map(([title, body]) => (
            <li key={title} className="glass-card rounded-xl p-5">
              <p className="font-semibold text-card-foreground">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
