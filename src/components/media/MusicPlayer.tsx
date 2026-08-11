"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Music2, Minus, Maximize2 } from "lucide-react";

/**
 * Floating club anthem, streamed from YouTube. Shared by both surfaces — the
 * public site and the portal — which is why it lives outside `public/`; it
 * draws entirely from brand CSS vars, so each surface repaints it.
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
 *
 * Minimized also puts the panel BESIDE the pill instead of above it, which is
 * what makes it usable on the in-game phone browser (a few hundred CSS pixels
 * tall): one row of about 110px rather than a 260px stack. Both states are the
 * same JSX with different classes on purpose. Moving either element to a
 * different place in the tree would make React build a new container div, the
 * live iframe would go with the old one, and the track would restart.
 */

const VOLUME = 55;
const EXPANDED_WIDTH = 320;
const MINIMIZED_WIDTH = 156;
/** Below this, the player opens minimized unless the visitor has said otherwise. */
const COMPACT_BREAKPOINT = 640;
const STORAGE_KEY = "brotherhood:anthem-minimized";

const PREFERENCE_EVENT = "brotherhood:anthem-minimized-change";

/* Whether the player starts minimized is not React state — it is a reading of
   two things React does not own, the saved preference and the viewport, so it
   is subscribed to as an external store. That is also what lets it hydrate:
   the server has neither, renders the expanded default, and the real value
   lands on the first client snapshot.

   Embedded browsers (the in-game phone among them) can have storage switched
   off, where touching localStorage THROWS rather than returning null, so the
   choice is held in memory as well; otherwise the button would be dead
   exactly where it matters most. */
let memoryPreference: boolean | null = null;

function readPreference(): boolean | null {
  if (memoryPreference !== null) return memoryPreference;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "1" ? true : raw === "0" ? false : null;
  } catch {
    return null;
  }
}

function writePreference(value: boolean) {
  memoryPreference = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* preference just won't survive the reload */
  }
  window.dispatchEvent(new Event(PREFERENCE_EVENT));
}

const COMPACT_QUERY = `(max-width: ${COMPACT_BREAKPOINT}px)`;

function subscribeMinimized(onChange: () => void) {
  const mq = window.matchMedia(COMPACT_QUERY);
  mq.addEventListener("change", onChange);
  window.addEventListener(PREFERENCE_EVENT, onChange);
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener(PREFERENCE_EVENT, onChange);
  };
}

/** A primitive, so returning a fresh read each time can't loop React. */
function minimizedSnapshot() {
  return readPreference() ?? window.matchMedia(COMPACT_QUERY).matches;
}

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
  const minimized = useSyncExternalStore(subscribeMinimized, minimizedSnapshot, () => false);
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

      {/* One float, not two: `items-end` keeps the panel and the pill on a
          shared bottom line when they sit side by side. No `overflow-hidden`
          here, or it would clip the pill's underglow. */}
      <div
        className={`fixed bottom-3 right-3 z-40 flex items-end gap-2 sm:bottom-5 sm:right-5 ${
          minimized ? "flex-row" : "flex-col"
        }`}
      >
        <div
          role="region"
          aria-label={label}
          className={`glass-panel overflow-hidden rounded-xl transition-[width] duration-200 ${
            stopped ? "hidden" : ""
          }`}
          style={{
            // Minimized leaves room for the pill on the same line; expanded has
            // the line to itself.
            width: minimized
              ? `min(${MINIMIZED_WIDTH}px, calc(100vw - 6.5rem))`
              : `min(${EXPANDED_WIDTH}px, calc(100vw - 1.5rem))`,
          }}
        >
          <div
            className={`flex items-center justify-between gap-1 border-b border-border ${
              minimized ? "px-2 py-1" : "px-3 py-1.5"
            }`}
          >
            <span className="truncate text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-primary">
              {muted ? (minimized ? "Tap for sound" : "Tap anywhere for sound") : label}
            </span>
            <button
              type="button"
              onClick={() => writePreference(!minimized)}
              aria-label={minimized ? "Expand player" : "Minimize player"}
              className="shrink-0 rounded-full p-1 text-muted-foreground outline-none transition-colors hover:bg-accent/40 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
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

        {/* Ember glass only while the anthem plays — the pill is frosted at
            rest and earns the primary tint once it's the live control. It's a
            fixed float over the page, so the blur in `glass` is within the
            perf rule, and nothing clips the underglow's below-edge bloom.
            Minimized drops the wording and leaves a round icon: the state it
            was reading out is on the panel beside it. */}
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={playing ? `Pause ${label.toLowerCase()}` : `Play ${label.toLowerCase()}`}
          aria-pressed={playing}
          className={`glass glass-hover underglow flex shrink-0 items-center gap-2.5 rounded-full text-[0.7rem] font-semibold uppercase tracking-[0.16em] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
            minimized ? "p-3" : "px-4 py-3"
          } ${
            playing
              ? "glass-ember text-primary-foreground"
              : "text-foreground hover:text-primary"
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
          {!minimized && <span>{playing ? (muted ? "Muted" : "Playing") : label}</span>}
        </button>
      </div>
    </>
  );
}
