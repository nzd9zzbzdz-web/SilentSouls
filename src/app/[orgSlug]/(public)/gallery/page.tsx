import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Image as ImageIcon } from "lucide-react";
import { getOrgBySlug } from "@/lib/tenant";
import { DisplayHeading } from "@/components/theme/DisplayHeading";

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
    <div className="mx-auto max-w-6xl px-4 py-16">
      <DisplayHeading className="text-4xl text-foreground">Gallery</DisplayHeading>
      <p className="mt-3 text-muted-foreground">
        Moments from our drives, builds, and community days.
      </p>

      {photos.length > 0 ? (
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <figure
              key={photo.src}
              className="group overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={photo.src}
                  alt={photo.caption || "Silent Souls MC photo"}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              {photo.caption && (
                <figcaption className="px-3 py-2 text-sm capitalize text-muted-foreground">
                  {photo.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      ) : (
        <div className="mt-12 rounded-lg border border-border bg-card p-10 text-center">
          <ImageIcon className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-medium text-card-foreground">Photos coming soon</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;re gathering shots from our latest events — check back after the
            next food drive.
          </p>
        </div>
      )}
    </div>
  );
}
