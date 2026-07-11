import type { Timestamp } from "firebase/firestore";

// ── Roles & stats ──────────────────────────────────────────────────────

export type SystemRole = "admin" | "officer" | "member";

export const STAT_KEYS = [
  "churchAttendance",
  "clubRuns",
  "clubEvents",
  "communityOutreach",
  "operations",
  "securityDetail",
  "territoryPatrol",
  "territoryDefense",
  "prospectTasks",
  "recruitment",
  "charityEvents",
  "mentoring",
  "specialAssignments",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

export type MemberStats = Partial<Record<StatKey, number>>;

// ── Documents ──────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string; // "Silent Souls MC"
  publicName: string; // "Silent Souls Community Foundation"
  slug: string;
  status: "active" | "suspended";
  features: Record<string, boolean>;
  memberCount: number;
  foundedAt: Timestamp | Date;
  createdAt: Timestamp | Date;
}

export interface BrandingColors {
  // Any valid CSS color string ("#0A0A0B", "rgba(255,255,255,0.08)") —
  // injected as shadcn CSS variable overrides by <BrandStyle>.
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
}

export interface Branding {
  colors: BrandingColors;
  fonts: {
    display: string; // CSS var name from allowlist, e.g. "var(--font-blackletter)"
    body: string;
    mono?: string;
  };
  logoPath?: string;
  orgDisplayName: string;
  tagline?: string;
  mission?: string;
}

export interface Rank {
  id: string;
  name: string;
  order: number; // 1 = President
  isOfficer: boolean;
  tab?: CutPlacementBase & { text: string };
}

export interface ActivityType {
  id: string;
  name: string;
  statKey: StatKey;
  requiresProof: boolean;
  allowQuantity: boolean;
  defaultQuantity: number;
  icon: string; // lucide icon name
  active: boolean;
  order: number;
}

export type MemberStatus =
  | "hangaround"
  | "prospect"
  | "patched"
  | "retired"
  | "exiled";

export interface Member {
  id: string;
  uid: string | null;
  displayName: string;
  roadName: string;
  photoPath?: string;
  rankId: string;
  status: MemberStatus;
  joinDate: Timestamp | Date;
  sponsorMemberId?: string;
  memberNumber: number;
  stats: MemberStats;
  patchCount: number;
  lastActivityAt?: Timestamp | Date;
  createdAt: Timestamp | Date;
}

export type ActivityStatus = "pending" | "approved" | "denied";

export interface Activity {
  id: string;
  memberId: string;
  typeId: string;
  statKey: StatKey; // denormalized from type at submit time
  date: Timestamp | Date;
  description: string;
  quantity: number;
  proofPath?: string;
  witnesses: string[]; // memberIds
  status: ActivityStatus;
  reviewedBy?: string;
  reviewedAt?: Timestamp | Date;
  reviewNote?: string;
  createdAt: Timestamp | Date;
}

export type PatchCategory =
  | "activity"
  | "service"
  | "leadership"
  | "recognition"
  | "legendary";

export interface PatchRequirement {
  statKey: StatKey;
  threshold: number;
}

/** Presentation weight — drives glow/border/sort on the cut. Distinct from category. */
export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface Patch {
  id: string;
  name: string;
  category: PatchCategory;
  description: string;
  imagePath?: string;
  tier: number;
  rarity?: Rarity; // Digital Cut: visual weight. Backfilled from tier for legacy patches.
  defaultSlot?: string; // Digital Cut: named slot on the vest (resolves to u/v via VestConfig).
  requirement: PatchRequirement | null; // null ⇒ manual-only
  manual: boolean;
  active: boolean;
  defaultPlacement: CutPlacementBase; // legacy direct u/v; kept as fallback when no slot resolves
}

export interface AwardedPatch {
  id: string; // `${memberId}_${patchId}` — composite ⇒ idempotent
  memberId: string;
  patchId: string;
  awardedAt: Timestamp | Date;
  awardedBy: "system" | string; // uid for manual awards
  reason?: string;
  activityId?: string;
}

// ── Digital cut (3D-ready now, rendered 2D until M8) ──────────────────

export type CutSurface = "front" | "back";

export interface CutPlacementBase {
  surface: CutSurface;
  u: number; // 0..1 across the vest
  v: number; // 0..1 top→bottom
  scale: number;
  rotationDeg: number;
}

export interface CutPlacement extends CutPlacementBase {
  kind: "patch" | "rankTab" | "officerTab";
  refId: string; // patchId or rankId
  zIndex: number;
  mirrored: boolean;
}

export interface CutLayout {
  surfaces: {
    front: CutPlacement[];
    back: CutPlacement[];
  };
  updatedAt: Timestamp | Date;
}

// ── Digital Cut config (M8) — org-authored vest, slots, and rank visuals ───

/**
 * A named anchor on a vest surface. Slot names double as future 3D attachment
 * points (leftChest, upperBack, …), so position is stored as normalized u/v —
 * never pixels — to survive resolution changes and the 2D→3D migration.
 */
export interface PatchSlot {
  slot: string; // e.g. "LEFT_CHEST" — semantic, stable, org-defined
  u: number; // 0..1 across the surface
  v: number; // 0..1 top→bottom
  maxScale: number; // caps patch render size in this slot
  accepts: PatchCategory[]; // which categories may land here (designer/validation guard)
  capacity: number; // patches before overflow-nudging kicks in
}

/** One vest surface for an org: the base art plus its slot map. Doc id = surface. */
export interface VestConfig {
  surface: CutSurface; // "front" | "back"
  imagePath: string | null; // Storage path; null ⇒ renderer draws a schematic placeholder
  aspectRatio: number; // w/h — the render stage locks to this so u/v stays true
  slots: PatchSlot[]; // embedded: small, always read with the surface
  model3d?: { gltfPath: string; anchors: Record<string, string> } | null; // Phase 3 only
}

/** What a rank puts on the cut, independent of earned patches. */
export type GrantKind =
  | "topRocker"
  | "bottomRocker"
  | "centerPatch"
  | "rankTab"
  | "prospectTab"
  | "saaDiamond";

export interface Grant {
  kind: GrantKind;
  surface: CutSurface;
  u: number;
  v: number;
  scale: number;
  text?: string; // stand-in until org uploads art
  assetPath?: string; // Storage path for the tab/rocker artwork
}

/** Rank → cut visuals. Doc id = rankId. Config, not code: each org defines its own. */
export interface RankVisual {
  showsColors: boolean; // Hangaround = false (bare vest); Patched+ = true
  grants: Grant[];
}

/**
 * The renderer-agnostic output of buildRenderModel(). A plain, serializable
 * object with no coordinate assumptions beyond "u/v + surface". The 2D DOM
 * renderer consumes it today; the 3D R3F renderer will consume the same shape.
 */
export interface ResolvedPlacement {
  key: string; // "patch:road-warrior" | "rank:topRocker" — stable react key
  type: "patch" | GrantKind;
  surface: CutSurface;
  u: number;
  v: number;
  scale: number;
  z: number;
  label: string; // patch name or rocker/tab text
  art: string | null; // Storage image path if any; null ⇒ styled placeholder
  rarity?: Rarity;
  category?: PatchCategory;
  // Inspection metadata (patches only)
  patchId?: string;
  description?: string;
  awardedAt?: string | null; // ISO string
  awardedBy?: string | null;
  reason?: string | null;
}

export interface CutRenderModel {
  front: ResolvedPlacement[];
  back: ResolvedPlacement[];
}

// ── Prospects, votes, events, gallery, timeline ───────────────────────

export interface ProspectRequirement {
  key: string;
  label: string;
  statKey: StatKey | null; // null ⇒ manual progress
  target: number;
  manualProgress: number | null;
}

export interface ProspectProfile {
  id: string; // memberId
  startDate: Timestamp | Date;
  sponsorMemberId?: string;
  targetPatchDate?: Timestamp | Date;
  requirements: ProspectRequirement[];
  status: "active" | "vote_pending" | "patched" | "dropped";
  voteId?: string;
}

export interface Vote {
  id: string;
  type: "prospect_patch" | "promotion" | "club_decision";
  subjectMemberId?: string;
  question: string;
  options: string[];
  eligibility: "officers" | "patched" | "all";
  anonymous: boolean;
  status: "open" | "closed";
  opensAt: Timestamp | Date;
  closesAt: Timestamp | Date;
  results?: Record<string, number>;
  outcome?: string;
  createdBy: string;
}

export type EventType = "church" | "ride" | "operation" | "community";

export interface ClubEvent {
  id: string;
  title: string;
  type: EventType;
  startAt: Timestamp | Date;
  endAt?: Timestamp | Date;
  location: string;
  description: string;
  visibility: "portal" | "public";
  publicTitle?: string; // sanitized cover-story copy
  publicDescription?: string;
  activityTypeId?: string; // attendance feeds this activity type
  createdBy: string;
  createdAt: Timestamp | Date;
}

export interface GalleryPhoto {
  id: string;
  uploadedByMemberId: string;
  storagePath: string;
  caption?: string;
  eventId?: string;
  status: "pending" | "approved" | "rejected";
  visibility: "portal" | "public";
  reviewedBy?: string;
  reviewedAt?: Timestamp | Date;
  createdAt: Timestamp | Date;
}

export interface TimelineEntry {
  id: string;
  date: Timestamp | Date;
  title: string;
  description: string;
  kind: "manual" | "milestone";
  milestoneKey?: string; // idempotency key for auto-milestones
  icon?: string;
  imagePath?: string;
  createdBy: string; // uid or 'system'
}

export interface AuditLog {
  id: string;
  actorUid: string;
  action: string; // 'activity.approve' | 'patch.award' | 'member.promote' | ...
  targetPath: string;
  detail?: string;
  at: Timestamp | Date;
}

export interface Invite {
  id: string;
  email: string;
  memberId: string;
  role: SystemRole;
  token: string;
  expiresAt: Timestamp | Date;
  usedAt?: Timestamp | Date;
}

// Open recruitment: a public applicant awaiting officer review. Keyed by the
// applicant's uid (one live application per account). Grants no access until
// approved — approval creates the Member + membership.
export interface Application {
  id: string; // == applicant uid
  roadName: string;
  handle: string; // Discord/in-game handle
  email: string;
  message?: string;
  status: "pending" | "approved" | "rejected";
  memberId?: string; // set on approval
  role?: SystemRole; // granted role, set on approval
  reviewedBy?: string;
  reviewedAt?: Timestamp | Date;
  reviewNote?: string;
  createdAt: Timestamp | Date;
}

// ── Root collections ───────────────────────────────────────────────────

export interface UserMembership {
  memberId: string;
  role: SystemRole;
}

export interface UserDoc {
  email: string;
  displayName: string;
  photoURL?: string;
  superAdmin?: boolean; // mirror; custom claims are authoritative
  memberships: Record<string, UserMembership>; // keyed by orgId
  createdAt: Timestamp | Date;
}

// Custom-claims shape (kept tiny — 1000 byte limit):
// { superAdmin?: true, orgs: { [orgId]: { r: SystemRole, m: memberId } } }
export interface OrgClaims {
  r: SystemRole;
  m: string;
}
export interface SessionClaims {
  superAdmin?: boolean;
  orgs?: Record<string, OrgClaims>;
}
