import { notFound } from "next/navigation";
import { Image as ImageIcon } from "lucide-react";
import { getOrgBySlug } from "@/lib/tenant";
import { getGalleryPhotos } from "@/lib/gallery";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { Component as ImageAutoSlider } from "@/components/ui/image-auto-slider";
import { GalleryLightbox } from "@/components/public/GalleryLightbox";

export default async function PublicGalleryPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const photos = await getGalleryPhotos();

  return (
    <div className="py-16">
      <div className="mx-auto max-w-6xl px-4">
        <DisplayHeading className="text-4xl text-foreground">Gallery</DisplayHeading>
        <p className="mt-3 text-muted-foreground">
          Moments from our drives, builds, and community days.
        </p>
      </div>

      {photos.length > 0 ? (
        <>
          {/* Auto-scrolling showcase band (hover to pause) */}
          <div className="mt-10">
            <ImageAutoSlider images={photos.map((p) => p.src)} />
          </div>

          <div className="mt-12">
            <GalleryLightbox photos={photos} />
          </div>
        </>
      ) : (
        <div className="mx-auto mt-12 max-w-6xl px-4">
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <ImageIcon className="mx-auto size-10 text-muted-foreground" aria-hidden />
            <p className="mt-4 font-medium text-card-foreground">Photos coming soon</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;re gathering shots from our latest events. Check back after the
              next food drive.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
