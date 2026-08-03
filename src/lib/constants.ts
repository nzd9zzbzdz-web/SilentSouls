import type { StatKey } from "./types";

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

/**
 * The character screen's Criminal Record, in display order. Every row reads a
 * stat that members log and officers approve, so the panel moves on its own —
 * `format` turns the raw count into the row's display string.
 */
export const CRIMINAL_RECORD_ROWS: {
  label: string;
  statKey: StatKey;
  danger?: boolean;
  format?: (n: number) => string;
}[] = [
  { label: "Crimes Committed", statKey: "crimesCommitted" },
  { label: "Heists Completed", statKey: "heistsCompleted" },
  { label: "Police Gunned Down", statKey: "policeGunnedDown", danger: true },
  { label: "Jail Time Served", statKey: "jailTimeMonths", format: (n) => `${n} mo` },
  { label: "Times Arrested", statKey: "timesArrested" },
  { label: "Dirty Money Earned", statKey: "dirtyMoneyEarned", format: formatDirtyMoney },
];

/** $0 · $12.5K · $2.4M — keeps six figures from blowing out the panel. */
export function formatDirtyMoney(n: number): string {
  if (n >= 1_000_000) return `$${trimZero(n / 1_000_000)}M`;
  if (n >= 1_000) return `$${trimZero(n / 1_000)}K`;
  return `$${n.toLocaleString("en-US")}`;
}

function trimZero(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}

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
  crimesCommitted: "Crimes Committed",
  heistsCompleted: "Heists Completed",
  policeGunnedDown: "Police Gunned Down",
  jailTimeMonths: "Jail Time Served",
  timesArrested: "Times Arrested",
  dirtyMoneyEarned: "Dirty Money Earned",
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

/**
 * Criminal record activities — these drive CRIMINAL_RECORD_ROWS on the
 * character screen. Quantity-bearing ones take the raw amount (months served,
 * dollars earned) rather than a count of submissions.
 *
 * Ids are explicit rather than slugged from the name: the seeder's slug helper
 * strips non-letters, which would mangle the unit hints in these names.
 */
export const CRIMINAL_ACTIVITY_TYPE_SEEDS: {
  id: string;
  name: string;
  statKey: StatKey;
  requiresProof: boolean;
  allowQuantity: boolean;
  icon: string;
}[] = [
  { id: "crime-committed", name: "Crime Committed", statKey: "crimesCommitted", requiresProof: false, allowQuantity: true, icon: "skull" },
  { id: "heist-completed", name: "Heist Completed", statKey: "heistsCompleted", requiresProof: true, allowQuantity: false, icon: "banknote" },
  { id: "police-gunned-down", name: "Police Gunned Down", statKey: "policeGunnedDown", requiresProof: true, allowQuantity: true, icon: "crosshair" },
  { id: "jail-time-served", name: "Jail Time Served (months)", statKey: "jailTimeMonths", requiresProof: false, allowQuantity: true, icon: "lock" },
  { id: "arrested", name: "Arrested", statKey: "timesArrested", requiresProof: false, allowQuantity: false, icon: "handcuffs" },
  { id: "dirty-money-earned", name: "Dirty Money Earned ($)", statKey: "dirtyMoneyEarned", requiresProof: true, allowQuantity: true, icon: "dollar-sign" },
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
