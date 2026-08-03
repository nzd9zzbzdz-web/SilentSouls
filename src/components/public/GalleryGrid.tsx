"use client";

import { LayoutGrid, type LayoutGridCard } from "@/components/ui/layout-grid";
import type { GalleryPhoto } from "@/lib/gallery";

/**
 * Public gallery: club photos in an expanding bento grid. Wide shots span two
 * columns so their crop stays gentle; portraits and squares take one. Click a
 * photo to expand it with its caption; click away or press Escape to close.
 */
export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const cards: LayoutGridCard[] = photos.map((p, i) => ({
    id: i,
    label: p.caption,
    content: (
      <p className="text-xl font-bold capitalize text-white md:text-3xl">
        {p.caption}
      </p>
    ),
    className: p.width / p.height > 1.6 ? "md:col-span-2" : "col-span-1",
    thumbnail: p.src,
    blurDataURL: p.blurDataURL,
  }));

  return <LayoutGrid cards={cards} />;
}
