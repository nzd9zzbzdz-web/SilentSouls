import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { Image as ImageIcon } from "lucide-react";
import { getOrgBySlug } from "@/lib/tenant";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { Component as ImageAutoSlider } from "@/components/ui/image-auto-slider";
import { GalleryLightbox } from "@/components/public/GalleryLightbox";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

// Reads photos dropped into public/gallery. Files are committed with the repo,
// so this resolves the same set at build time and on the server. Caption is
// derived from the filename (strip an optional ordering prefix like "01-").
function getGalleryPhotos(): { src: string; caption: string }[] {
  const dir = path.join(process.cwd(), "public", "gallery");
  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return files
    .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
    .sort()
    .map((f) => ({
      src: `/gallery/${f}`,
      caption: path
        .basename(f, path.extname(f))
        .replace(/^\d+[-_\s]*/, "")
        .replace(/[-_]+/g, " ")
        .trim(),
    }));
}

export default async function PublicGalleryPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const photos = getGalleryPhotos();

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
              We&apos;re gathering shots from our latest events — check back after the
              next food drive.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
