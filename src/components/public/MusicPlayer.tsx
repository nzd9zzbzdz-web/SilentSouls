"use client";

import { useRef, useState } from "react";
import { Music2 } from "lucide-react";

/**
 * Floating club-anthem toggle. Off by default — browsers block audio autoplay
 * and unexpected sound is hostile UX, so playback only ever starts from this
 * button (the required user gesture). Mounted in the public layout, so the
 * track keeps playing as visitors move between pages within the site.
 */
export function MusicPlayer({ src, label = "Club Anthem" }: { src: string; label?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      audio.volume = 0.55;
      await audio.play();
      setPlaying(true);
    } catch {
      // Autoplay/interaction rejection — stay in the paused state.
      setPlaying(false);
    }
  }

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

      <audio ref={audioRef} src={src} loop preload="none" />

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause ${label.toLowerCase()}` : `Play ${label.toLowerCase()}`}
        aria-pressed={playing}
        className={`fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full border px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.16em] shadow-lg backdrop-blur-md transition-colors ${
          playing
            ? "border-primary/70 bg-background/85 text-primary"
            : "border-border bg-background/70 text-foreground hover:border-primary/50 hover:text-primary"
        }`}
      >
        {playing ? (
          <span className="flex h-4 w-4 items-end justify-center gap-[3px]" aria-hidden>
            <span className="anthem-bar h-full w-[3px] rounded-sm bg-current" />
            <span className="anthem-bar h-full w-[3px] rounded-sm bg-current" />
            <span className="anthem-bar h-full w-[3px] rounded-sm bg-current" />
          </span>
        ) : (
          <Music2 className="size-4" aria-hidden />
        )}
        <span>{playing ? "Playing" : label}</span>
      </button>
    </>
  );
}
