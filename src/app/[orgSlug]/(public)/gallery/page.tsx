import { notFound } from "next/navigation";
import { Image as ImageIcon } from "lucide-react";
import { getOrgBySlug } from "@/lib/tenant";
import { DisplayHeading } from "@/components/theme/DisplayHeading";

export default async function PublicGalleryPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  // M7 surfaces approved, public-flagged photos here.
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <DisplayHeading className="text-4xl text-foreground">Gallery</DisplayHeading>
      <p className="mt-3 text-muted-foreground">
        Moments from our drives, builds, and community days.
      </p>
      <div className="mt-12 rounded-lg border border-border bg-card p-10 text-center">
        <ImageIcon className="mx-auto size-10 text-muted-foreground" aria-hidden />
        <p className="mt-4 font-medium text-card-foreground">Photos coming soon</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;re gathering shots from our latest events — check back after the
          next food drive.
        </p>
      </div>
    </div>
  );
}
