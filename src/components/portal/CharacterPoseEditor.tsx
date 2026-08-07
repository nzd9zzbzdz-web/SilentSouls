"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Move, RotateCcw, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CharacterStage, type CharacterStageProps } from "./CharacterStage";
import { saveCharacterPose } from "@/actions/character";
import { CHARACTER_POSE_LIMITS, DEFAULT_CHARACTER_POSE } from "@/lib/constants";
import type { CharacterPose } from "@/lib/types";

const L = CHARACTER_POSE_LIMITS;
const clamp = (n: number, { min, max }: { min: number; max: number }) =>
  Math.min(max, Math.max(min, n));

/**
 * Officer control for where a member's render stands on their stage.
 *
 * Renders the stage as normal and, in edit mode, lays a drag surface over it.
 * The overlay is why editing is a mode rather than always-on: the stage already
 * owns wheel events for its focus dolly, and a permanently draggable figure
 * would swallow that from every member viewing the page.
 *
 * Position is stored as percentages of the stage box, so dragging works out to
 * the same pose at any window size.
 */
export function CharacterPoseEditor({
  orgId,
  memberId,
  canEdit,
  initialPose,
  ...stageProps
}: CharacterStageProps & {
  orgId: string;
  memberId: string;
  canEdit: boolean;
  initialPose?: CharacterPose;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [pose, setPose] = useState<CharacterPose>(
    initialPose ?? DEFAULT_CHARACTER_POSE,
  );
  // What's on the server, so Cancel can put it back. State rather than a ref
  // because it renders: it's what Save compares against to know it's enabled.
  const [savedPose, setSavedPose] = useState<CharacterPose>(
    initialPose ?? DEFAULT_CHARACTER_POSE,
  );
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ px: number; py: number; pose: CharacterPose } | null>(null);

  function beginDrag(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, pose };
  }

  function onDrag(e: React.PointerEvent<HTMLDivElement>) {
    const start = dragRef.current;
    const box = surfaceRef.current?.getBoundingClientRect();
    if (!start || !box) return;
    // Pixels → percent of the stage. y is measured from the bottom, so a
    // downward drag (positive dy) has to *lower* the value.
    const dx = ((e.clientX - start.px) / box.width) * 100;
    const dy = ((e.clientY - start.py) / box.height) * 100;
    setPose({
      x: clamp(start.pose.x + dx, L.x),
      y: clamp(start.pose.y - dy, L.y),
      scale: start.pose.scale,
    });
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  }

  function nudge(dx: number, dy: number) {
    setPose((p) => ({
      ...p,
      x: clamp(p.x + dx, L.x),
      y: clamp(p.y + dy, L.y),
    }));
  }

  function persist(next: CharacterPose | null) {
    startTransition(async () => {
      const result = await saveCharacterPose({ orgId, memberId, pose: next });
      if (!result.ok) {
        toast.error(result.error ?? "Could not save position");
        return;
      }
      const applied = next ?? DEFAULT_CHARACTER_POSE;
      setSavedPose(applied);
      setPose(applied);
      setEditing(false);
      toast.success(next ? "Character position saved" : "Position reset");
    });
  }

  const dirty =
    pose.x !== savedPose.x ||
    pose.y !== savedPose.y ||
    pose.scale !== savedPose.scale;

  return (
    <div>
      <div className="relative" ref={surfaceRef}>
        <CharacterStage {...stageProps} pose={pose} />

        {editing && (
          <>
            {/* Drag surface. Covers the stage so the grab works anywhere,
                which beats hunting for the figure's transparent edges. */}
            <div
              role="application"
              aria-label="Drag to move the character"
              onPointerDown={beginDrag}
              onPointerMove={onDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={(e) => {
                const step = e.shiftKey ? 5 : 1;
                if (e.key === "ArrowLeft") nudge(-step, 0);
                else if (e.key === "ArrowRight") nudge(step, 0);
                else if (e.key === "ArrowUp") nudge(0, step);
                else if (e.key === "ArrowDown") nudge(0, -step);
                else return;
                e.preventDefault();
              }}
              tabIndex={0}
              className="absolute inset-0 cursor-move rounded-[var(--radius,0.5rem)] outline-none ring-2 ring-inset ring-primary/70 focus-visible:ring-4"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/75 px-3 py-1 text-xs text-white/85 backdrop-blur-sm"
            >
              Drag to move · arrow keys to nudge
            </div>
          </>
        )}
      </div>

      {canEdit && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Move className="size-4" aria-hidden />
              Adjust character
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="pose-scale"
                  className="text-xs uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Size
                </label>
                <input
                  id="pose-scale"
                  type="range"
                  min={L.scale.min}
                  max={L.scale.max}
                  step={1}
                  value={pose.scale}
                  onChange={(e) =>
                    setPose((p) => ({ ...p, scale: Number(e.target.value) }))
                  }
                  className="w-40 accent-[var(--primary)]"
                />
                <span className="font-stat w-10 text-xs text-muted-foreground">
                  {Math.round(pose.scale)}%
                </span>
              </div>

              <Button size="sm" onClick={() => persist(pose)} disabled={pending || !dirty}>
                {pending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-4" aria-hidden />
                )}
                Save position
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setPose(savedPose);
                  setEditing(false);
                }}
              >
                <X className="size-4" aria-hidden />
                Cancel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => persist(null)}
                title="Back to the default placement"
              >
                <RotateCcw className="size-4" aria-hidden />
                Reset
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
