"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type Photo = { src: string; caption: string };

export function GalleryLightbox({ photos }: { photos: Photo[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isOpen = openIndex !== null;

  const close = useCallback(() => setOpenIndex(null), []);
  const show = useCallback(
    (dir: 1 | -1) =>
      setOpenIndex((i) =>
        i === null ? i : (i + dir + photos.length) % photos.length,
      ),
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

  const active = openIndex !== null ? photos[openIndex] : null;

  return (
    <>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            onClick={() => setOpenIndex(i)}
            aria-label={`View ${photo.caption || "photo"} larger`}
            className="group block overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-[#941B22]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9362B]"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={photo.src}
                alt={photo.caption || "Ravens of Death MC photo"}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            {photo.caption && (
              <span className="block px-3 py-2 text-sm capitalize text-muted-foreground">
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

          {/* Large stationary image — click on it does not close */}
          <img
            src={active.src}
            alt={active.caption || "Ravens of Death MC photo"}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[82vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          />
          {active.caption && (
            <p className="mt-4 text-center text-sm capitalize text-white/70">
              {active.caption}
            </p>
          )}
        </div>
      )}
    </>
  );
}
