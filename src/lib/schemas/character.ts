import { z } from "zod";
import { CHARACTER_POSE_LIMITS } from "@/lib/constants";
import type { CharacterPose } from "@/lib/types";

const L = CHARACTER_POSE_LIMITS;

// Finite numbers only — the client sends values derived from pointer maths, and
// a NaN sneaking into Firestore would render the figure nowhere at all.
export const characterPoseSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  scale: z.number().finite(),
});

export const saveCharacterPoseSchema = z.object({
  orgId: z.string().min(1),
  memberId: z.string().min(1),
  pose: characterPoseSchema.nullable(),
});

/** Keep a pose inside the editable frame; overshoot lands at the edge. */
export function clampPose(pose: CharacterPose): CharacterPose {
  const clamp = (n: number, { min, max }: { min: number; max: number }) =>
    Math.min(max, Math.max(min, Math.round(n * 10) / 10));
  return {
    x: clamp(pose.x, L.x),
    y: clamp(pose.y, L.y),
    scale: clamp(pose.scale, L.scale),
  };
}
