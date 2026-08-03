import Image from "next/image";
import type { GalleryPhoto } from "@/lib/gallery";

/**
 * Full-bleed auto-scrolling filmstrip for the public hero. Every photo is
 * rendered at the banner's full height at its natural aspect ratio (portraits
 * narrow, landscapes wide) so nothing is cropped or stretched. The strip is
 * duplicated once and translated -50% for a seamless CSS-only loop — no JS,
 * so this stays a server component (same pattern as image-auto-slider).
 */
export function HeroGalleryFilmstrip({ photos }: { photos: GalleryPhoto[] }) {
  if (photos.length === 0) return null;

  // Constant scroll speed regardless of the photo mix: strip width in units of
  // banner height = sum of aspect ratios; ~6s per unit ≈ a calm ~120px/s on a
  // 760px-tall banner.
  const aspectSum = photos.reduce((sum, p) => sum + p.width / p.height, 0);
  const duration = Math.max(30, Math.round(aspectSum * 6));

  const strip = [...photos, ...photos];

  return (
    <>
      <style>{`
        @keyframes hgf-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hgf-strip { animation: none !important; }
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="hgf-strip flex h-full w-max items-center gap-3"
          style={{ animation: `hgf-scroll ${duration}s linear infinite` }}
        >
          {strip.map((p, i) => (
            <Image
              key={`${p.src}-${i}`}
              src={p.src}
              alt=""
              width={p.width}
              height={p.height}
              sizes={`${Math.round((p.width / p.height) * 760)}px`}
              loading={i < 3 ? "eager" : "lazy"}
              placeholder="blur"
              blurDataURL={p.blurDataURL}
              className="h-full w-auto flex-shrink-0"
            />
          ))}
        </div>
      </div>
    </>
  );
}
