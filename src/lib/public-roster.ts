import type { Member, Rank } from "@/lib/types";

/**
 * Who the club shows the outside world.
 *
 * The portal roster and the public one are deliberately not the same data: a
 * member's profile carries their Criminal Record, and the public site is the
 * foundation's face. This is the single gate — the home page section and the
 * render route both ask it, so the site and the images it loads can never
 * disagree about who is public.
 *
 * Everyone under the colors qualifies: officers and patched members. Prospects
 * and hangarounds stay private until they're patched in, and anyone retired or
 * exiled drops off.
 */
export function isPubliclyVisible(
  member: Pick<Member, "status">,
  rank: Pick<Rank, "isOfficer"> | undefined,
): boolean {
  if (member.status === "retired" || member.status === "exiled") return false;
  return Boolean(rank?.isOfficer) || member.status === "patched";
}

export interface PublicRosterMember {
  id: string;
  roadName: string;
  rankName: string;
  rankOrder: number;
  isOfficer: boolean;
  memberNumber: number;
  /** Art URL — the public render route, or a static fallback. */
  imageUrl: string;
  joinedLabel: string;
}

/** Chain of command first, then by patch number — same order as the portal. */
export function byStanding(a: PublicRosterMember, b: PublicRosterMember): number {
  return a.rankOrder - b.rankOrder || a.memberNumber - b.memberNumber;
}
