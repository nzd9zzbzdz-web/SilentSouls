"use client";

import { useEffect, useRef } from "react";
import {
  Award,
  Bike,
  Crown,
  HeartHandshake,
  Skull,
  Star,
} from "lucide-react";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import type { PatchCategory } from "@/lib/types";

/**
 * Cinematic member "character screen": full-body render on the org's stage
 * art, service stats in a framed panel, top patches in the diamond slots.
 *
 * Layout constants are tuned to the seeded Ravens of Death stage art (3:2,
 * spotlight left-of-center, four diamond frames down the left edge). Orgs
 * without stage art get a neutral gradient stage with CSS-drawn frames —
 * same positions, no image required. All color comes from branding CSS vars.
 */

export interface StagePatch {
  name: string;
  description: string;
  category: PatchCategory;
  awardedLabel: string; // e.g. "Earned Mar 2024" or "Manually awarded"
}

export interface CharacterStageProps {
  orgName: string;
  tagline?: string;
  roadName: string;
  displayName: string;
  memberNumber: number;
  rankName: string;
  statusLabel: string;
  panelTitle?: string; // defaults to "Service Record"
  stats: { label: string; value: number | string; danger?: boolean }[];
  patches: StagePatch[]; // up to 4 — the diamond slots
  stagePath?: string; // org stage art (branding.characterStagePath)
  characterPath?: string; // member full-body render (member.photoPath)
}

const CATEGORY_ICON: Record<PatchCategory, typeof Award> = {
  activity: Bike,
  service: HeartHandshake,
  leadership: Crown,
  recognition: Star,
  legendary: Skull,
};

// Diamond slot centers, % of stage (matches the painted frames in the art).
const SLOT_POS = [22.5, 33.7, 44.9, 56.2];

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dur = 1100;
    const start = performance.now() + 500;
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / dur));
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span ref={ref}>{value}</span>;
}

export function CharacterStage({
  orgName,
  tagline,
  roadName,
  displayName,
  memberNumber,
  rankName,
  statusLabel,
  panelTitle = "Service Record",
  stats,
  patches,
  stagePath,
  characterPath,
}: CharacterStageProps) {
  const slots = SLOT_POS.map((top, i) => ({ top, patch: patches[i] ?? null }));
  const stageRef = useRef<HTMLDivElement>(null);

  // Scroll-wheel camera: wheel over the stage dollies in toward the character
  // and the record panel (0 = full scene, 1 = focused). Drives a single CSS
  // custom property; all layer transforms derive from it for parallax depth.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let target = 0;
    let current = 0;
    let raf = 0;
    let running = false;

    const tick = () => {
      current += (target - current) * 0.13;
      if (Math.abs(target - current) < 0.002) {
        current = target;
        running = false;
      }
      el.style.setProperty("--focus", current.toFixed(4));
      if (running) raf = requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      target = Math.min(1, Math.max(0, target + e.deltaY * 0.0014));
      if (reduced) {
        current = target;
        el.style.setProperty("--focus", current.toFixed(4));
        return;
      }
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className="charstage"
      data-has-art={stagePath ? "true" : "false"}
    >
      <style>{CSS_TEXT}</style>

      {stagePath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="charstage-bg" src={stagePath} alt="" />
      ) : (
        <div className="charstage-bg charstage-bg-fallback" />
      )}

      {characterPath && (
        <div className="charstage-char-rig">
          <div className="charstage-shadow" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="charstage-character"
            src={characterPath}
            alt={`${roadName} character render`}
          />
        </div>
      )}

      <div className="charstage-nameplate">
        <DisplayHeading as="h2" className="charstage-name">
          &ldquo;{roadName}&rdquo;
        </DisplayHeading>
        <p className="charstage-role">
          {orgName}
          {tagline ? ` — ${tagline}` : ""}
        </p>
        <div className="charstage-rule" />
      </div>

      {/* Patch diamonds over the painted frames */}
      {slots.map(({ top, patch }, i) => {
        const Icon = patch ? CATEGORY_ICON[patch.category] : Award;
        return (
          <div
            key={i}
            className={`charstage-slot ${patch ? "earned" : "empty"}`}
            style={{ top: `${top - 4.5}%` }}
          >
            <Icon className="charstage-slot-icon" aria-hidden />
            {patch && (
              <>
                <div className="charstage-slot-label" aria-hidden>
                  {patch.name}
                </div>
                <div className="charstage-tip" role="tooltip">
                  <p className="charstage-tip-name">{patch.name}</p>
                  <p className="charstage-tip-desc">{patch.description}</p>
                  <p className="charstage-tip-meta">{patch.awardedLabel}</p>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Service record panel */}
      <div className="charstage-panel-rig">
      <section className="charstage-panel" aria-label="Service record">
        <header>
          <DisplayHeading as="h3" className="charstage-panel-title">
            {panelTitle}
          </DisplayHeading>
          <p className="charstage-panel-sub">
            {rankName} · Member #{memberNumber}
          </p>
        </header>
        <ul className="charstage-stats">
          {stats.map((s) => (
            <li
              key={s.label}
              className={`charstage-stat${s.danger ? " charstage-stat-danger" : ""}`}
            >
              <span className="charstage-stat-label">{s.label}</span>
              <span className="charstage-dots" />
              <span className="charstage-stat-value font-stat">
                {typeof s.value === "number" ? (
                  <CountUp value={s.value} />
                ) : (
                  s.value
                )}
              </span>
            </li>
          ))}
        </ul>
        <footer>
          <span className="charstage-status-label">Status</span>
          <span className="charstage-status">{statusLabel}</span>
        </footer>
      </section>
      </div>

      <p className="charstage-scroll-hint" aria-hidden>
        Scroll to focus
      </p>
      <p className="charstage-legal">{displayName}</p>
    </div>
  );
}

// Scoped by the charstage- prefix. Gold/red/fonts all come from branding vars.
const CSS_TEXT = `
.charstage {
  position: relative;
  aspect-ratio: 3 / 2;
  width: 100%;
  overflow: hidden;
  border-radius: var(--radius, 0.5rem);
  border: 1px solid var(--border);
  container-type: inline-size;
  background: var(--background);
}
.charstage-bg {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  /* wheel dolly: zoom past the character for depth */
  transform-origin: 26% 72%;
  transform: scale(calc(1 + var(--focus, 0) * 0.55));
  will-change: transform;
}
.charstage-bg-fallback {
  background:
    radial-gradient(ellipse 30% 12% at 25.5% 86%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 70%),
    radial-gradient(ellipse 45% 60% at 25.5% 30%, color-mix(in srgb, var(--primary) 7%, transparent), transparent 75%),
    linear-gradient(var(--card), var(--background));
}
/* CSS diamond frames — invisible on top of the painted ones, structure without art */
.charstage[data-has-art="false"] .charstage-slot::before {
  content: '';
  position: absolute; inset: 16%;
  transform: rotate(45deg);
  border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
}

.charstage-char-rig {
  position: absolute; inset: 0;
  pointer-events: none;
  transform-origin: 26% 86%;
  transform: translateX(calc(var(--focus, 0) * 3cqw)) scale(calc(1 + var(--focus, 0) * 0.3));
  will-change: transform;
}
.charstage-character {
  position: absolute;
  left: 3.5%; bottom: 12%;
  height: 66%;
  filter: drop-shadow(0 1.5cqw 1.2cqw rgba(0,0,0,0.7));
  animation: charstage-in 1s ease-out both;
}
.charstage-shadow {
  position: absolute;
  left: 18%; bottom: 11%;
  width: 15%; height: 3.5%;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.75), transparent 70%);
  border-radius: 50%;
}

.charstage-nameplate {
  position: absolute;
  left: 25.5%; bottom: 1.6%;
  transform: translateX(-50%);
  text-align: center;
  animation: charstage-name-in 1.2s 0.2s ease-out both;
  z-index: 2;
}
.charstage-name {
  font-size: 3.6cqw;
  color: var(--primary);
  letter-spacing: 0.06em;
  text-shadow: 0 0 1.4cqw color-mix(in srgb, var(--primary) 40%, transparent), 0 0.2cqw 0.5cqw rgba(0,0,0,0.9);
  white-space: nowrap;
}
.charstage-role {
  font-size: 1.05cqw;
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--primary) 70%, transparent);
  margin-top: 0.3cqw;
  white-space: nowrap;
}
.charstage-rule {
  height: 1px; margin-top: 0.7cqw;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--primary) 55%, transparent), transparent);
}

.charstage-slot {
  position: absolute;
  left: 2.45%;
  width: 4.6%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  /* fade the trophy rail away as the camera pushes in */
  opacity: calc(1 - var(--focus, 0) * 1.4);
  transform: translateX(calc(var(--focus, 0) * -4cqw));
  will-change: transform, opacity;
}
.charstage-slot-icon {
  width: 50%; height: 50%;
  color: color-mix(in srgb, var(--primary) 35%, var(--muted-foreground));
  opacity: 0.35;
  transition: transform 0.25s;
}
.charstage-slot.earned .charstage-slot-icon {
  color: var(--primary);
  opacity: 1;
  filter: drop-shadow(0 0 0.6cqw color-mix(in srgb, var(--primary) 70%, transparent));
}
.charstage-slot:hover .charstage-slot-icon { transform: scale(1.15); }
.charstage-slot-label {
  position: absolute;
  left: 112%; bottom: 52%;
  font-size: 0.72cqw;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--primary) 85%, var(--foreground));
  text-shadow: 0 0 0.8cqw color-mix(in srgb, var(--primary) 40%, transparent);
  white-space: nowrap;
  pointer-events: none;
}
.charstage-tip {
  position: absolute;
  left: 118%; top: 50%;
  transform: translateY(-50%);
  width: max-content; max-width: 24cqw;
  background: rgba(5, 4, 2, 0.88);
  border: 1px solid color-mix(in srgb, var(--primary) 55%, transparent);
  padding: 0.8cqw 1.1cqw;
  opacity: 0; visibility: hidden;
  transition: opacity 0.2s;
  pointer-events: none;
  z-index: 6;
}
.charstage-slot:hover .charstage-tip { opacity: 1; visibility: visible; }
.charstage-tip-name { font-size: 1.15cqw; font-weight: 600; color: var(--primary); letter-spacing: 0.04em; }
.charstage-tip-desc { font-size: 0.9cqw; color: var(--muted-foreground); margin-top: 0.2cqw; }
.charstage-tip-meta { font-size: 0.72cqw; letter-spacing: 0.18em; text-transform: uppercase; color: color-mix(in srgb, var(--primary) 75%, transparent); margin-top: 0.5cqw; }

.charstage-panel-rig {
  position: absolute;
  left: 41%; top: 13%;
  width: 20%; height: 57%;
  transform-origin: 20% 45%;
  transform: translateX(calc(var(--focus, 0) * 2cqw)) scale(calc(1 + var(--focus, 0) * 0.14));
  will-change: transform;
  z-index: 3;
}
.charstage-panel {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  background: rgba(5, 4, 2, 0.78);
  border: 1px solid color-mix(in srgb, var(--primary) 55%, transparent);
  box-shadow: 0 1.6cqw 3.5cqw rgba(0,0,0,0.8);
  backdrop-filter: blur(3px);
  animation: charstage-fade 1.2s 0.45s ease-out both;
}
.charstage-panel::before, .charstage-panel::after {
  content: '';
  position: absolute;
  width: 1cqw; height: 1cqw;
  border-color: var(--primary);
  border-style: solid;
}
.charstage-panel::before { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
.charstage-panel::after  { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }
.charstage-panel header {
  padding: 1.1cqw 1.2cqw 0.8cqw;
  border-bottom: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
  text-align: center;
}
.charstage-panel-title { font-size: 1.7cqw; color: var(--primary); letter-spacing: 0.08em; }
.charstage-panel-sub {
  font-size: 0.72cqw; letter-spacing: 0.3em; text-transform: uppercase;
  color: var(--muted-foreground); margin-top: 0.2cqw;
}
.charstage-stats {
  list-style: none; margin: 0; padding: 0.4cqw 0;
  flex: 1; display: flex; flex-direction: column; justify-content: space-evenly;
}
.charstage-stat {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 0.8cqw; padding: 0.35cqw 1.4cqw; position: relative;
}
.charstage-stat + .charstage-stat::before {
  content: '';
  position: absolute; top: 0; left: 8%; right: 8%; height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--primary) 18%, transparent), transparent);
}
.charstage-stat-label {
  font-size: 0.85cqw; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--foreground); opacity: 0.85; white-space: nowrap;
}
.charstage-dots {
  flex: 1;
  border-bottom: 1px dotted color-mix(in srgb, var(--primary) 30%, transparent);
  transform: translateY(-0.25cqw);
}
.charstage-stat-value {
  font-size: 1.35cqw; font-weight: 600;
  color: var(--primary);
  text-shadow: 0 0 0.8cqw color-mix(in srgb, var(--primary) 35%, transparent);
  white-space: nowrap;
}
.charstage-stat-danger .charstage-stat-value {
  color: var(--destructive);
  text-shadow: 0 0 0.8cqw color-mix(in srgb, var(--destructive) 40%, transparent);
}
.charstage-panel footer {
  padding: 0.8cqw 1.4cqw 1cqw;
  border-top: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
  display: flex; justify-content: space-between; align-items: center;
}
.charstage-status-label {
  font-size: 0.72cqw; letter-spacing: 0.28em; text-transform: uppercase;
  color: var(--muted-foreground);
}
.charstage-status {
  font-size: 1.05cqw; font-weight: 600; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--primary);
}

.charstage-legal {
  position: absolute; right: 1.6%; bottom: 2%;
  font-size: 0.8cqw; letter-spacing: 0.22em; text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 35%, transparent);
}

.charstage-scroll-hint {
  position: absolute; bottom: 2.2%; left: 50%;
  transform: translateX(-50%);
  font-size: 0.78cqw; letter-spacing: 0.32em; text-transform: uppercase;
  color: color-mix(in srgb, var(--primary) 45%, transparent);
  opacity: calc(1 - var(--focus, 0) * 2);
  pointer-events: none;
}

@keyframes charstage-in { from { opacity: 0; transform: translateY(0.8cqw); } to { opacity: 1; transform: translateY(0); } }
@keyframes charstage-fade { from { opacity: 0; transform: translateY(0.6cqw); } to { opacity: 1; transform: translateY(0); } }
@keyframes charstage-name-in { from { opacity: 0; transform: translate(-50%, 0.6cqw); } to { opacity: 1; transform: translate(-50%, 0); } }
@media (prefers-reduced-motion: reduce) {
  .charstage * { animation: none !important; }
}
`;
