import type { RapSheetEntry, StatKey } from "./types";

// Slugs that can never be org slugs (static route segments win in App Router,
// but we validate at org creation too).
export const RESERVED_SLUGS = ["admin", "api", "login", "_next", "favicon.ico"];

export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? "__session";

export const SESSION_EXPIRES_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

// The six spec-highlighted stats shown on member profiles (others still tracked).
export const PROFILE_STAT_ORDER: { key: StatKey; label: string }[] = [
  { key: "churchAttendance", label: "Church Attendance" },
  { key: "clubRuns", label: "Club Runs" },
  { key: "operations", label: "Operations" },
  { key: "territoryDefense", label: "Territory Defense" },
  { key: "recruitment", label: "Recruitment" },
  { key: "specialAssignments", label: "Special Assignments" },
];

// Character-screen rap sheet shown when a member has none of their own yet.
// Rows are org-overridable per member via member.rapSheet.
export const DEFAULT_RAP_SHEET: RapSheetEntry[] = [
  { label: "Crimes Committed", value: "0" },
  { label: "Heists Completed", value: "0" },
  { label: "Police Gunned Down", value: "0", danger: true },
  { label: "Jail Time Served", value: "0 mo" },
  { label: "Times Arrested", value: "0" },
  { label: "Dirty Money Earned", value: "$0" },
];

// Character render fallback — brand-neutral shadow figure shipped in public/.
export const CHARACTER_SILHOUETTE = "/brand/members/silhouette.webp";

// Stage backdrop used on every character screen unless the org's portal
// branding sets its own characterStagePath.
export const DEFAULT_CHARACTER_STAGE = "/brand/character-stage.webp";

export const STAT_LABELS: Record<StatKey, string> = {
  churchAttendance: "Church Attendance",
  clubRuns: "Club Runs",
  clubEvents: "Club Events",
  communityOutreach: "Community Outreach",
  operations: "Operations",
  securityDetail: "Security Details",
  territoryPatrol: "Territory Patrols",
  territoryDefense: "Territory Defense",
  prospectTasks: "Prospect Tasks",
  recruitment: "Recruitment",
  charityEvents: "Charity Events",
  mentoring: "Mentoring",
  specialAssignments: "Special Assignments",
};

// Default club ranks (org-configurable; seeded per org).
// tab u/v are normalized cut coordinates (front surface).
export const DEFAULT_RANKS = [
  { name: "President", order: 1, isOfficer: true },
  { name: "Vice President", order: 2, isOfficer: true },
  { name: "Sergeant-at-Arms", order: 3, isOfficer: true },
  { name: "Road Captain", order: 4, isOfficer: true },
  { name: "Secretary", order: 5, isOfficer: true },
  { name: "Treasurer", order: 6, isOfficer: true },
  { name: "Enforcer", order: 7, isOfficer: true },
  { name: "Patched Member", order: 8, isOfficer: false },
  { name: "Prospect", order: 9, isOfficer: false },
  { name: "Hangaround", order: 10, isOfficer: false },
] as const;

// The 13 spec activity types (org-editable; seeded per org).
export const ACTIVITY_TYPE_SEEDS: {
  name: string;
  statKey: StatKey;
  requiresProof: boolean;
  allowQuantity: boolean;
  icon: string;
}[] = [
  { name: "Club Ride", statKey: "clubRuns", requiresProof: true, allowQuantity: false, icon: "bike" },
  { name: "Mandatory Church Attendance", statKey: "churchAttendance", requiresProof: false, allowQuantity: false, icon: "landmark" },
  { name: "Club Event", statKey: "clubEvents", requiresProof: true, allowQuantity: false, icon: "party-popper" },
  { name: "Community Outreach", statKey: "communityOutreach", requiresProof: true, allowQuantity: false, icon: "heart-handshake" },
  { name: "Operation Participation", statKey: "operations", requiresProof: true, allowQuantity: false, icon: "target" },
  { name: "Security Detail", statKey: "securityDetail", requiresProof: false, allowQuantity: false, icon: "shield" },
  { name: "Territory Patrol", statKey: "territoryPatrol", requiresProof: false, allowQuantity: false, icon: "map" },
  { name: "Territory Defense", statKey: "territoryDefense", requiresProof: true, allowQuantity: false, icon: "swords" },
  { name: "Prospect Task", statKey: "prospectTasks", requiresProof: true, allowQuantity: false, icon: "clipboard-check" },
  { name: "Recruitment", statKey: "recruitment", requiresProof: false, allowQuantity: false, icon: "user-plus" },
  { name: "Charity Event", statKey: "charityEvents", requiresProof: true, allowQuantity: false, icon: "hand-heart" },
  { name: "Mentoring", statKey: "mentoring", requiresProof: false, allowQuantity: false, icon: "graduation-cap" },
  { name: "Special Assignment", statKey: "specialAssignments", requiresProof: true, allowQuantity: false, icon: "star" },
];

export const PORTAL_NAV = [
  { href: "", label: "Dashboard", icon: "layout-dashboard" },
  { href: "/brotherhood", label: "Brotherhood", icon: "users" },
  { href: "/prospects", label: "Prospects", icon: "user-plus" },
  { href: "/activities", label: "Activities", icon: "activity" },
  { href: "/patch-wall", label: "Patch Wall", icon: "award" },
  { href: "/my-cut", label: "My Cut", icon: "shirt" },
  { href: "/events", label: "Events", icon: "calendar" },
  { href: "/church", label: "Church", icon: "landmark" },
  { href: "/timeline", label: "Timeline", icon: "history" },
  { href: "/gallery", label: "Gallery", icon: "image" },
] as const;
