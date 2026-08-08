"use client";

import { useState } from "react";
import { Music2, X } from "lucide-react";

/**
 * Floating club-anthem toggle. Off by default — browsers block audio autoplay
 * and unexpected sound is hostile UX, so playback only ever starts from this
 * button (the required user gesture). Mounted in the public layout, so the
 * track keeps playing as visitors move between pages within the site.
 *
 * The anthem streams from YouTube rather than a file we host, so the embedded
 * player has to stay on screen while it plays — YouTube's embed terms forbid
 * hiding or masking it. Closing the panel unmounts the iframe, which is what
 * stops the audio.
 */
export function MusicPlayer({ videoId, label = "Club Anthem" }: { videoId: string; label?: string }) {
  const [open, setOpen] = useState(false);

  // loop=1 needs playlist=<id> to repeat a single video; nocookie keeps YouTube
  // from dropping tracking cookies on visitors who never open the player.
  const embedSrc =
    `https://www.youtube-nocookie.com/embed/${videoId}` +
    `?autoplay=1&loop=1&playlist=${videoId}&rel=0&modestbranding=1&playsinline=1`;

  return (
    <>
      <style>{`
        @keyframes anthem-eq {
          0%, 100% { transform: scaleY(0.35); }
          50%      { transform: scaleY(1); }
        }
        .anthem-bar { transform-origin: bottom; animation: anthem-eq 0.9s ease-in-out infinite; }
        .anthem-bar:nth-child(2) { animation-delay: 0.15s; }
        .anthem-bar:nth-child(3) { animation-delay: 0.3s; }
        @media (prefers-reduced-motion: reduce) {
          .anthem-bar { animation: none; transform: scaleY(0.7); }
        }
      `}</style>

      {open && (
        <div
          role="region"
          aria-label={label}
          className="fixed bottom-20 right-5 z-40 w-[min(20rem,calc(100vw-2.5rem))] overflow-hidden rounded-xl border border-primary/50 bg-background/95 shadow-xl backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-primary">
              {label}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={`Close ${label.toLowerCase()}`}
              className="rounded-full p-1 text-foreground/70 transition-colors hover:text-primary"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <iframe
            key={videoId}
            src={embedSrc}
            title={label}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full border-0"
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? `Stop ${label.toLowerCase()}` : `Play ${label.toLowerCase()}`}
        aria-pressed={open}
        aria-expanded={open}
        className={`fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full border px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.16em] shadow-lg backdrop-blur-md transition-colors ${
          open
            ? "border-primary/70 bg-background/85 text-primary"
            : "border-border bg-background/70 text-foreground hover:border-primary/50 hover:text-primary"
        }`}
      >
        {open ? (
          <span className="flex h-4 w-4 items-end justify-center gap-[3px]" aria-hidden>
            <span className="anthem-bar h-full w-[3px] rounded-sm bg-current" />
            <span className="anthem-bar h-full w-[3px] rounded-sm bg-current" />
            <span className="anthem-bar h-full w-[3px] rounded-sm bg-current" />
          </span>
        ) : (
          <Music2 className="size-4" aria-hidden />
        )}
        <span>{open ? "Playing" : label}</span>
      </button>
    </>
  );
}
