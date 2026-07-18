"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GalleryPhoto } from "@/lib/gallery";

export function GalleryLightbox({ photos }: { photos: GalleryPhoto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const isOpen = openIndex !== null;

  const close = useCallback(() => setOpenIndex(null), []);
  const show = useCallback(
    (dir: 1 | -1) =>
      setOpenIndex((i) => {
        if (i === null) return i;
        setLoaded(false);
        return (i + dir + photos.length) % photos.length;
      }),
    [photos.length],
  );

  // Keyboard: Esc to close, arrows to navigate. Lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") show(1);
      else if (e.key === "ArrowLeft") show(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, close, show]);

  // Swipe left/right on touch devices.
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null || photos.length < 2) return;
    const dx = (e.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(dx) > 45) show(dx < 0 ? 1 : -1);
  };

  const active = openIndex !== null ? photos[openIndex] : null;

  return (
    <>
      {/* Masonry: photos keep their natural aspect ratio, so portraits are
          never cropped. CSS columns flow items top-to-bottom, then wrap. */}
      <div className="mx-auto max-w-6xl gap-4 px-4 [column-fill:_balance] sm:columns-2 lg:columns-3">
        {photos.map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            onClick={() => {
              setLoaded(false);
              setOpenIndex(i);
            }}
            aria-label={`View ${photo.caption || "photo"} larger`}
            className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-[#941B22]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9362B]"
          >
            <div className="overflow-hidden">
              <Image
                src={photo.src}
                alt={photo.caption || "Ravens of Death MC photo"}
                width={photo.width}
                height={photo.height}
                placeholder="blur"
                blurDataURL={photo.blurDataURL}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="h-auto w-full transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            {photo.caption && (
              <span className="block px-3 py-2 text-sm text-muted-foreground">
                {photo.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.caption || "Photo"}
          onClick={close}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
        >
          {/* Close */}
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-6" aria-hidden />
          </button>

          {/* Prev / Next (only when there's more than one) */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  show(-1);
                }}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:left-4"
              >
                <ChevronLeft className="size-7" aria-hidden />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  show(1);
                }}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:right-4"
              >
                <ChevronRight className="size-7" aria-hidden />
              </button>
            </>
          )}

          {/* Large image — optimized + blur-up while loading. Click does not close. */}
          <div
            className="relative flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {!loaded && (
              <div
                aria-hidden
                className="absolute size-10 animate-spin rounded-full border-2 border-white/30 border-t-white"
              />
            )}
            <Image
              key={active.src}
              src={active.src}
              alt={active.caption || "Ravens of Death MC photo"}
              width={active.width}
              height={active.height}
              placeholder="blur"
              blurDataURL={active.blurDataURL}
              sizes="92vw"
              onLoad={() => setLoaded(true)}
              className={`max-h-[82vh] w-auto max-w-[92vw] rounded-lg object-contain shadow-2xl transition-opacity duration-300 ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>

          <div className="mt-4 flex items-center gap-3 text-sm text-white/70">
            {active.caption && <span>{active.caption}</span>}
            {photos.length > 1 && (
              <span className="tabular-nums text-white/50">
                {openIndex! + 1} / {photos.length}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
