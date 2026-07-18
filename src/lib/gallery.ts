import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

export type GalleryPhoto = {
  src: string;
  caption: string;
  /** Intrinsic pixel dimensions — drives the masonry aspect ratio. */
  width: number;
  height: number;
  /** Tiny inlined WebP for next/image `placeholder="blur"`. */
  blurDataURL: string;
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

async function loadGalleryPhotos(): Promise<GalleryPhoto[]> {
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
let cached: Promise<GalleryPhoto[]> | null = null;

export function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  if (process.env.NODE_ENV !== "production") return loadGalleryPhotos();
  if (!cached) cached = loadGalleryPhotos();
  return cached;
}
