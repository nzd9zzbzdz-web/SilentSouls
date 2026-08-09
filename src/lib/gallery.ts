import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { listGalleryPhotos } from "@/lib/queries";
import type { GalleryPhoto } from "@/lib/types";
import type { Timestamp } from "firebase-admin/firestore";

/**
 * One photo as the public surfaces want it, whichever side it came from —
 * a file shipped in `public/gallery` or a member upload in Firestore.
 *
 * Distinct from `GalleryPhoto` in types.ts, which is the Firestore DOCUMENT.
 * This is the display shape the filmstrip, the slider and the masonry consume.
 */
export type GalleryImage = {
  src: string;
  caption: string;
  /** Intrinsic pixel dimensions — drives the masonry aspect ratio. */
  width: number;
  height: number;
  /** Tiny inlined WebP for next/image `placeholder="blur"`. */
  blurDataURL: string;
  /**
   * Skip Next's image optimizer. True for uploads: the action already capped
   * them at 1600px webp and the route serves them `immutable`, so optimizing
   * again would bill a transformation to re-encode what we sized ourselves.
   * Shipped disk photos are full-size PNGs and still want the optimizer.
   */
  unoptimized?: boolean;
};

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

// Curated titles + display order. Any file present in public/gallery but NOT
// listed here still shows up (caption derived from its filename) after the
// curated set, so dropping in new photos never silently hides them. To rename
// or reorder a photo, edit this list — nothing else needs to change.
const CURATION: { file: string; title: string }[] = [
  { file: "group photo.png", title: "The Crew" },
  { file: "Group photo 2.png", title: "Group Photo" },
  { file: "Group Talk.png", title: "Group Talk" },
  { file: "Bikers at the bar.png", title: "Bikers at the Bar" },
  { file: "2 riders.png", title: "Two Riders" },
  { file: "City Skyline.png", title: "City Skyline" },
  { file: "World Burns.png", title: "Watching the World Burn" },
  { file: "Prez and Gus.png", title: "Prez & Gus" },
  { file: "Prez.png", title: "Prez" },
  { file: "Prez 2.png", title: "Prez" },
  { file: "Gus Pickens.png", title: "Gus Pickens" },
  { file: "Gage Creed.png", title: "Gage Creed" },
  {
    file: "Gage Creed and his special friend.png",
    title: "Gage Creed & His Special Friend",
  },
  { file: "The Kid.png", title: "The Kid" },
  { file: "The Kid 2.png", title: "The Kid" },
  { file: "Winter Vetrov.png", title: "Winter Vetrov" },
  { file: "Winter and Morrigan.png", title: "Winter & Morrigan" },
  { file: "Promo 1.png", title: "Club Promo" },
  { file: "Promo 2.png", title: "Club Promo" },
  { file: "Club Promo Shat.png", title: "Club Promo" },
  { file: "Club Promo Shat 2.png", title: "Club Promo" },
  { file: "Beach Gus.png", title: "Gus at the Beach" },
  { file: "Beach Gus 2.png", title: "Gus at the Beach" },
  { file: "Prez Pier.png", title: "Prez on the Pier" },
  { file: "Xander Paleto.png", title: "Xander in Paleto" },
];

// Caption for files not in CURATION: strip an ordering prefix like "01-" and
// turn separators into spaces.
function deriveCaption(file: string): string {
  return path
    .basename(file, path.extname(file))
    .replace(/^\d+[-_\s]*/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

async function loadGalleryPhotos(): Promise<GalleryImage[]> {
  const dir = path.join(process.cwd(), "public", "gallery");
  let files: string[];
  try {
    files = fs
      .readdirSync(dir)
      .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()));
  } catch {
    return [];
  }

  const orderOf = new Map(CURATION.map((c, i) => [c.file, i]));
  const titleOf = new Map(CURATION.map((c) => [c.file, c.title]));

  files.sort((a, b) => {
    const ia = orderOf.get(a) ?? Number.POSITIVE_INFINITY;
    const ib = orderOf.get(b) ?? Number.POSITIVE_INFINITY;
    return ia === ib ? a.localeCompare(b) : ia - ib;
  });

  return Promise.all(
    files.map(async (file) => {
      const full = path.join(dir, file);
      let width = 1200;
      let height = 900;
      let blurDataURL =
        "data:image/svg+xml;base64," +
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"><rect width="4" height="3" fill="#12090c"/></svg>',
        ).toString("base64");

      try {
        const meta = await sharp(full).metadata();
        if (meta.width && meta.height) {
          width = meta.width;
          height = meta.height;
        }
        const blur = await sharp(full)
          .resize(24, null, { fit: "inside" })
          .webp({ quality: 30 })
          .toBuffer();
        blurDataURL = `data:image/webp;base64,${blur.toString("base64")}`;
      } catch {
        // Keep the fallback dimensions + solid-color placeholder.
      }

      return {
        src: `/gallery/${file}`,
        caption: titleOf.get(file) ?? deriveCaption(file),
        width,
        height,
        blurDataURL,
      };
    }),
  );
}

// The gallery folder is immutable within a deployment, so in production we
// compute the manifest (dimensions + blur placeholders) once per server
// instance. In dev we recompute so newly dropped photos appear on refresh.
let cached: Promise<GalleryImage[]> | null = null;

/** The photos shipped in `public/gallery`, in curated order. */
export function getGalleryPhotos(): Promise<GalleryImage[]> {
  if (process.env.NODE_ENV !== "production") return loadGalleryPhotos();
  if (!cached) cached = loadGalleryPhotos();
  return cached;
}

/**
 * Where a gallery photo's bytes are served from. The `v` is the photo's
 * updatedAt, so the URL changes only when the image does and the route can
 * answer `immutable` — same contract as `patchArtUrl`.
 */
export function galleryPhotoUrl(orgId: string, photo: GalleryPhoto): string {
  const v = (photo.updatedAt as Timestamp)?.toMillis?.() ?? 0;
  return `/api/orgs/${orgId}/gallery/${photo.id}?v=${v}`;
}

/**
 * The public gallery: member uploads the club has published, newest first,
 * followed by the curated set shipped on disk.
 *
 * The two sources are MERGED rather than migrated. `public/gallery` is already
 * committed, already live, and costs nothing to serve; moving those twenty-odd
 * files into Firestore would be a destructive one-way step against production
 * data for no gain. New photos simply lead, which is what a club gallery
 * wants — the founding shots keep their curated order underneath.
 */
export async function composeGallery(orgId: string): Promise<GalleryImage[]> {
  const [uploads, disk] = await Promise.all([
    listGalleryPhotos(orgId),
    getGalleryPhotos(),
  ]);

  const published: GalleryImage[] = uploads
    .filter((p) => p.status === "approved" && p.visibility === "public")
    .map((p) => ({
      src: galleryPhotoUrl(orgId, p),
      caption: p.caption ?? "",
      width: p.width,
      height: p.height,
      blurDataURL: p.blurDataURL,
      unoptimized: true,
    }));

  return [...published, ...disk];
}
