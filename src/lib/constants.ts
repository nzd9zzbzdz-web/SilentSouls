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
  { label: "Felonies", statKey: "felonies", danger: true },
  { label: "Heists Completed", statKey: "heistsCompleted" },
  { label: "Drug Sales", statKey: "drugSales" },
  { label: "Drugs Cooked", statKey: "drugsCooked" },
  { label: "Guns Manufactured", statKey: "gunsManufactured" },
  { label: "Dirty Money Earned", statKey: "dirtyMoneyEarned", format: formatDirtyMoney },
  { label: "Dirty Money Cleaned", statKey: "dirtyMoneyCleaned", format: formatDirtyMoney },
  { label: "Police Gunned Down", statKey: "policeGunnedDown", danger: true },
  { label: "Times Arrested", statKey: "timesArrested" },
  { label: "Jail Time Served", statKey: "jailTimeMonths", format: (n) => `${n} mo` },
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
  felonies: "Felonies",
  heistsCompleted: "Heists Completed",
  drugSales: "Drug Sales",
  drugsCooked: "Drugs Cooked",
  gunsManufactured: "Guns Manufactured",
  dirtyMoneyEarned: "Dirty Money Earned",
  dirtyMoneyCleaned: "Dirty Money Cleaned",
  policeGunnedDown: "Police Gunned Down",
  timesArrested: "Times Arrested",
  jailTimeMonths: "Jail Time Served",
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

// Club activity types. The original spec shipped 13 of these; the rest were
// retired in favour of the criminal record set below (see
// RETIRED_ACTIVITY_TYPE_IDS) — their stat keys stay in STAT_KEYS so historical
// values and already-earned patches still resolve.
export const ACTIVITY_TYPE_SEEDS: {
  name: string;
  statKey: StatKey;
  requiresProof: boolean;
  allowQuantity: boolean;
  icon: string;
}[] = [
  { name: "Club Ride", statKey: "clubRuns", requiresProof: true, allowQuantity: false, icon: "bike" },
  { name: "Mandatory Church Attendance", statKey: "churchAttendance", requiresProof: false, allowQuantity: false, icon: "landmark" },
];

/**
 * Club types that shipped once and are no longer offered. The sync action
 * deactivates these rather than deleting them: past submissions reference the
 * type id, so the review queue and a member's history still need to resolve a
 * name. Deactivating just hides them from the submit dropdown.
 */
/**
 * Patches whose requirement stat is no longer loggable. Retiring rather than
 * deleting keeps them on the cut of anyone who already earned one — the award
 * doc and the patch name still resolve; they just stop being awarded again.
 */
export const RETIRED_PATCH_IDS = [
  "ghost-rider",
  "guardian",
  "night-watchman",
  "territory-defender",
  "community-pillar",
  "giving-soul",
  "mentor",
  "shot-caller",
];

/** Criminal-record patches — the replacements for the retired club set. */
export const CRIMINAL_PATCH_SEEDS: {
  id: string;
  name: string;
  category: "activity" | "service" | "leadership" | "recognition" | "legendary";
  description: string;
  tier: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  requirement: { statKey: StatKey; threshold: number };
  surface: "front" | "back";
  u: number;
  v: number;
}[] = [
  { id: "corner-boy", name: "Corner Boy", category: "activity", description: "Move 100 drug sales.", tier: 1, rarity: "common", requirement: { statKey: "drugSales", threshold: 100 }, surface: "back", u: 0.3, v: 0.62 },
  { id: "the-cook", name: "The Cook", category: "activity", description: "Cook 50 batches.", tier: 2, rarity: "rare", requirement: { statKey: "drugsCooked", threshold: 50 }, surface: "back", u: 0.7, v: 0.62 },
  { id: "gunsmith", name: "Gunsmith", category: "activity", description: "Manufacture 50 guns.", tier: 2, rarity: "rare", requirement: { statKey: "gunsManufactured", threshold: 50 }, surface: "back", u: 0.3, v: 0.72 },
  { id: "made-man", name: "Made Man", category: "activity", description: "Pull 10 heists.", tier: 2, rarity: "epic", requirement: { statKey: "heistsCompleted", threshold: 10 }, surface: "back", u: 0.7, v: 0.72 },
  { id: "earner", name: "Earner", category: "service", description: "Earn $1M in dirty money.", tier: 2, rarity: "rare", requirement: { statKey: "dirtyMoneyEarned", threshold: 1_000_000 }, surface: "front", u: 0.3, v: 0.62 },
  { id: "the-launderer", name: "The Launderer", category: "service", description: "Wash $1M through the books.", tier: 3, rarity: "epic", requirement: { statKey: "dirtyMoneyCleaned", threshold: 1_000_000 }, surface: "front", u: 0.7, v: 0.62 },
  { id: "hardened", name: "Hardened", category: "leadership", description: "Serve 24 months inside and come back.", tier: 3, rarity: "epic", requirement: { statKey: "jailTimeMonths", threshold: 24 }, surface: "back", u: 0.5, v: 0.3 },
  { id: "most-wanted", name: "Most Wanted", category: "legendary", description: "Commit 100 felonies.", tier: 4, rarity: "legendary", requirement: { statKey: "felonies", threshold: 100 }, surface: "front", u: 0.5, v: 0.3 },
];

export const RETIRED_ACTIVITY_TYPE_IDS = [
  "club-event",
  "community-outreach",
  "operation-participation",
  "security-detail",
  "territory-patrol",
  "territory-defense",
  "prospect-task",
  "recruitment",
  "charity-event",
  "mentoring",
  "special-assignment",
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
  { id: "felony", name: "Felony", statKey: "felonies", requiresProof: false, allowQuantity: true, icon: "gavel" },
  { id: "heist-completed", name: "Heist Completed", statKey: "heistsCompleted", requiresProof: true, allowQuantity: false, icon: "banknote" },
  { id: "drug-sale", name: "Drug Sale", statKey: "drugSales", requiresProof: false, allowQuantity: true, icon: "pill" },
  { id: "drugs-cooked", name: "Drugs Cooked", statKey: "drugsCooked", requiresProof: false, allowQuantity: true, icon: "flask-conical" },
  { id: "gun-manufactured", name: "Guns Manufactured", statKey: "gunsManufactured", requiresProof: false, allowQuantity: true, icon: "wrench" },
  { id: "dirty-money-earned", name: "Dirty Money Earned ($)", statKey: "dirtyMoneyEarned", requiresProof: true, allowQuantity: true, icon: "dollar-sign" },
  { id: "dirty-money-cleaned", name: "Dirty Money Cleaned ($)", statKey: "dirtyMoneyCleaned", requiresProof: true, allowQuantity: true, icon: "washing-machine" },
  { id: "police-gunned-down", name: "Police Gunned Down", statKey: "policeGunnedDown", requiresProof: true, allowQuantity: true, icon: "crosshair" },
  { id: "arrested", name: "Arrested", statKey: "timesArrested", requiresProof: false, allowQuantity: false, icon: "handcuffs" },
  { id: "jail-time-served", name: "Jail Time Served (months)", statKey: "jailTimeMonths", requiresProof: false, allowQuantity: true, icon: "lock" },
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
