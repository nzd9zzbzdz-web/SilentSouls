"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Music2, Minus, Maximize2 } from "lucide-react";

/**
 * Floating club anthem, streamed from YouTube.
 *
 * Two browser/platform rules shape this component, and both are worth knowing
 * before changing it:
 *
 * 1. No browser will autoplay audible sound before the visitor interacts with
 *    the page. So the track starts MUTED on load and unmutes on the first
 *    pointer/key/scroll event anywhere in the window — which is why this needs
 *    the IFrame Player API rather than a plain `<iframe>`; a URL parameter
 *    can't unmute after load.
 * 2. YouTube's embed terms forbid hiding or masking the player while it plays,
 *    so "minimized" shrinks it rather than removing it. The panel does go away
 *    entirely while paused, since nothing is playing to mask. The iframe stays
 *    mounted throughout so playback position survives minimize/pause.
 */

const VOLUME = 55;
const EXPANDED_WIDTH = 320;
const MINIMIZED_WIDTH = 200;

type YouTubePlayer = {
  playVideo(): void;
  pauseVideo(): void;
  unMute(): void;
  setVolume(v: number): void;
  destroy(): void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: unknown) => YouTubePlayer;
      PlayerState: { PLAYING: number; BUFFERING: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Loads the IFrame API once per page, no matter how many callers ask. */
let apiPromise: Promise<NonNullable<Window["YT"]>> | null = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export function MusicPlayer({ videoId, label = "Club Anthem" }: { videoId: string; label?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [minimized, setMinimized] = useState(false);
  // Explicit pause via the pill, which is the only thing that hides the panel.
  // Deliberately NOT `!playing`: the panel has to be on screen from first paint
  // or the iframe mounts into `display:none` and browsers decline to autoplay.
  const [stopped, setStopped] = useState(false);

  // Set during the pointerdown that unmutes, so the click completing that same
  // gesture doesn't immediately pause what it just turned on.
  const justUnmutedRef = useRef(false);

  const unmute = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    justUnmutedRef.current = true;
    player.unMute();
    player.setVolume(VOLUME);
    player.playVideo();
    setMuted(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // YT.Player REPLACES the element it is handed, so give it a throwaway child
    // rather than the ref'd container we need to keep.
    const mount = document.createElement("div");
    containerRef.current?.appendChild(mount);

    void loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(mount, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          autoplay: 1,
          mute: 1,
          loop: 1,
          playlist: videoId, // loop=1 only repeats a single video alongside this
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (e: { target: YouTubePlayer }) => {
            e.target.setVolume(VOLUME);
            e.target.playVideo();
          },
          onStateChange: (e: { data: number; target: YouTubePlayer }) => {
            setPlaying(e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.BUFFERING);
            // The playlist trick above is unreliable on some clients; this is
            // the belt to its braces.
            if (e.data === YT.PlayerState.ENDED) e.target.playVideo();
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      mount.remove();
    };
  }, [videoId]);

  // First interaction anywhere turns the sound on. Clicks inside the iframe
  // never reach us, but those visitors are driving YouTube's controls anyway.
  useEffect(() => {
    if (!muted) return;
    const opts = { once: true, passive: true, capture: true } as const;
    const events = ["pointerdown", "keydown", "touchstart", "scroll", "wheel"] as const;
    events.forEach((type) => window.addEventListener(type, unmute, opts));
    return () => events.forEach((type) => window.removeEventListener(type, unmute, opts));
  }, [muted, unmute]);

  function togglePlayback() {
    const player = playerRef.current;
    if (!player) return;
    // This click is the gesture that just unmuted us; it isn't also a pause.
    if (justUnmutedRef.current) {
      justUnmutedRef.current = false;
      return;
    }
    if (playing) {
      player.pauseVideo();
      setStopped(true);
    } else {
      player.playVideo();
      setStopped(false);
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

      <div
        role="region"
        aria-label={label}
        className={`fixed bottom-20 right-5 z-40 overflow-hidden rounded-xl border border-primary/50 bg-background/95 shadow-xl backdrop-blur-md transition-[width] duration-200 ${
          stopped ? "hidden" : ""
        }`}
        style={{
          width: `min(${minimized ? MINIMIZED_WIDTH : EXPANDED_WIDTH}px, calc(100vw - 2.5rem))`,
        }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
          <span className="truncate text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-primary">
            {muted ? "Tap anywhere for sound" : label}
          </span>
          <button
            type="button"
            onClick={() => setMinimized((v) => !v)}
            aria-label={minimized ? "Expand player" : "Minimize player"}
            className="shrink-0 rounded-full p-1 text-foreground/70 transition-colors hover:text-primary"
          >
            {minimized ? (
              <Maximize2 className="size-3.5" aria-hidden />
            ) : (
              <Minus className="size-3.5" aria-hidden />
            )}
          </button>
        </div>
        <div ref={containerRef} className="aspect-video w-full [&_iframe]:size-full [&_iframe]:border-0" />
      </div>

      <button
        type="button"
        onClick={togglePlayback}
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
        <span>{playing ? (muted ? "Muted" : "Playing") : label}</span>
      </button>
    </>
  );
}
