/**
 * Seed the emulator (or a live project) with the Ravens of Death MC organization.
 *   npm run seed
 * Requires `firebase emulators:start` running (or live Admin credentials).
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { existsSync } from "node:fs";

import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore";
import {
  ACTIVITY_TYPE_SEEDS,
  DEFAULT_RANKS,
} from "../src/lib/constants";
import { writeCutConfig } from "./lib/writeCutConfig";
import type {
  Branding,
  CutLayout,
  CutPlacement,
  Patch,
  RapSheetEntry,
  StatKey,
} from "../src/lib/types";

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-brotherhood-portal";

if (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
  console.error("Refusing to seed: no emulator host and no service account configured.");
  process.exit(1);
}

const app = getApps()[0] ?? initializeApp({ projectId: PROJECT_ID });
const auth = getAuth(app);
const db: Firestore = getFirestore(app);

const ORG_ID = "silent-souls";

// ── Branding (from the ui-ux-pro-max design systems) ───────────────────

// Ravens of Death palette:
//   Void Black #050407 · Raven Charcoal #151017 · Death Plum #2D111F
//   Raven Purple #54213F · Blood Crimson #941B22 · Ember Red #D9362B
//   Weathered Bone #B8A0A5 · Ash White #EEE7E8
const portalBranding: Branding = {
  colors: {
    background: "#050407",
    foreground: "#EEE7E8",
    card: "#151017",
    cardForeground: "#EEE7E8",
    primary: "#D9362B",
    primaryForeground: "#EEE7E8",
    secondary: "#2D111F",
    secondaryForeground: "#EEE7E8",
    muted: "#2D111F",
    mutedForeground: "#B8A0A5",
    accent: "#54213F",
    accentForeground: "#EEE7E8",
    destructive: "#941B22",
    border: "rgba(148,27,34,0.28)",
    input: "rgba(148,27,34,0.40)",
    ring: "#D9362B",
  },
  fonts: {
    display: "var(--font-blackletter)",
    body: "var(--font-inter)",
    mono: "var(--font-jetbrains)",
  },
  orgDisplayName: "Ravens of Death MC",
  tagline: "San Andreas",
  characterStagePath: "/brand/character-stage.webp",
};

const publicBranding: Branding = {
  colors: {
    background: "#050407",
    foreground: "#EEE7E8",
    card: "#151017",
    cardForeground: "#EEE7E8",
    primary: "#D9362B",
    primaryForeground: "#EEE7E8",
    secondary: "#2D111F",
    secondaryForeground: "#EEE7E8",
    muted: "#2D111F",
    mutedForeground: "#B8A0A5",
    accent: "#54213F",
    accentForeground: "#EEE7E8",
    destructive: "#941B22",
    border: "rgba(148,27,34,0.22)",
    input: "rgba(148,27,34,0.32)",
    ring: "#D9362B",
  },
  fonts: {
    display: "var(--font-blackletter)",
    body: "var(--font-inter)",
  },
  logoPath: "/brand/silent-souls-banner.webp",
  heroImagePath: "/brand/silent-souls-hero.webp",
  orgDisplayName: "Ravens of Death MC",
  tagline: "Brotherhood · Loyalty · Respect · Death",
  mission:
    "We are the Ravens. We ride where others fear to, bound by loyalty and blood. Death rides beside us — but so does honor, and no brother of ours ever rides alone.",
};

// ── Patches ────────────────────────────────────────────────────────────

type PatchSeed = Omit<Patch, "id"> & { id: string };
const p = (
  id: string,
  name: string,
  category: Patch["category"],
  description: string,
  tier: number,
  requirement: { statKey: StatKey; threshold: number } | null,
  surface: "front" | "back",
  u: number,
  v: number,
): PatchSeed => ({
  id,
  name,
  category,
  description,
  tier,
  requirement,
  manual: requirement === null,
  active: true,
  defaultPlacement: { surface, u, v, scale: 0.8, rotationDeg: 0 },
});

const PATCHES: PatchSeed[] = [
  p("road-warrior", "Road Warrior", "activity", "Complete 10 club runs.", 1, { statKey: "clubRuns", threshold: 10 }, "front", 0.3, 0.42),
  p("iron-rider", "Iron Rider", "activity", "Complete 50 club runs.", 2, { statKey: "clubRuns", threshold: 50 }, "front", 0.3, 0.52),
  p("faithful", "Faithful", "activity", "Attend 10 church meetings.", 1, { statKey: "churchAttendance", threshold: 10 }, "front", 0.7, 0.42),
  p("dedicated-soul", "Dedicated Soul", "activity", "Attend 25 church meetings.", 2, { statKey: "churchAttendance", threshold: 25 }, "front", 0.7, 0.52),
  p("ghost-rider", "Ghost Rider", "activity", "Participate in 10 operations.", 2, { statKey: "operations", threshold: 10 }, "back", 0.3, 0.62),
  p("guardian", "Guardian", "activity", "Complete 10 security details.", 1, { statKey: "securityDetail", threshold: 10 }, "back", 0.7, 0.62),
  p("night-watchman", "Night Watchman", "activity", "Complete 15 territory patrols.", 1, { statKey: "territoryPatrol", threshold: 15 }, "back", 0.3, 0.72),
  p("territory-defender", "Territory Defender", "activity", "Defend the territory 10 times.", 2, { statKey: "territoryDefense", threshold: 10 }, "back", 0.7, 0.72),
  p("community-pillar", "Community Pillar", "service", "Complete 15 community outreach actions.", 1, { statKey: "communityOutreach", threshold: 15 }, "front", 0.3, 0.62),
  p("giving-soul", "Giving Soul", "service", "Work 10 charity events.", 1, { statKey: "charityEvents", threshold: 10 }, "front", 0.7, 0.62),
  p("mentor", "Mentor", "leadership", "Sponsor 3 prospects into the club.", 2, { statKey: "recruitment", threshold: 3 }, "front", 0.5, 0.3),
  p("shot-caller", "Shot Caller", "leadership", "Complete 5 special assignments.", 2, { statKey: "specialAssignments", threshold: 5 }, "back", 0.5, 0.3),
  p("presidents-citation", "President's Citation", "recognition", "Awarded personally by the President for exceptional service.", 3, null, "front", 0.5, 0.68),
  p("brotherhoods-honor", "Brotherhood's Honor", "recognition", "Awarded by club vote for embodying the spirit of the Ravens.", 3, null, "front", 0.5, 0.78),
  p("war-veteran", "War Veteran", "legendary", "Stood their ground when the club needed them most. Manual award.", 4, null, "back", 0.5, 0.45),
];

// ── Members ────────────────────────────────────────────────────────────

interface MemberSeed {
  id: string;
  displayName: string;
  roadName: string;
  email: string;
  rankName: string;
  role: "admin" | "officer" | "member";
  status: "patched" | "prospect";
  memberNumber: number;
  joinDate: string; // ISO
  sponsorId?: string;
  stats: Partial<Record<StatKey, number>>;
  rapSheet: RapSheetEntry[]; // character-screen criminal record
  rapStatus: string; // character-screen status line
}

// Character-screen rap sheet rows, in display order.
const rap = (
  crimes: number,
  heists: number,
  police: number,
  jail: string,
  arrests: number,
  money: string,
): RapSheetEntry[] => [
  { label: "Crimes Committed", value: String(crimes) },
  { label: "Heists Completed", value: String(heists) },
  { label: "Police Gunned Down", value: String(police), danger: true },
  { label: "Jail Time Served", value: jail },
  { label: "Times Arrested", value: String(arrests) },
  { label: "Dirty Money Earned", value: money },
];

const MEMBERS: MemberSeed[] = [
  {
    id: "m-reaper", displayName: "Marcus Cole", roadName: "Reaper",
    email: "reaper@silentsouls.rp", rankName: "President", role: "admin",
    status: "patched", memberNumber: 1, joinDate: "2023-02-11",
    rapSheet: rap(187, 12, 34, "96 mo", 23, "$2.4M"), rapStatus: "At Large",
    stats: { clubRuns: 61, churchAttendance: 48, operations: 22, territoryDefense: 14, recruitment: 4, specialAssignments: 9, communityOutreach: 18, charityEvents: 12, securityDetail: 11, territoryPatrol: 20 },
  },
  {
    id: "m-six", displayName: "Danny Alvarez", roadName: "Six",
    email: "six@silentsouls.rp", rankName: "Sergeant-at-Arms", role: "officer",
    status: "patched", memberNumber: 3, joinDate: "2023-04-02",
    rapSheet: rap(154, 9, 41, "54 mo", 17, "$1.1M"), rapStatus: "At Large",
    stats: { clubRuns: 44, churchAttendance: 39, operations: 17, territoryDefense: 11, recruitment: 2, specialAssignments: 6, securityDetail: 16, territoryPatrol: 12, communityOutreach: 7 },
  },
  {
    id: "m-thorn", displayName: "Rosa Delgado", roadName: "Thorn",
    email: "thorn@silentsouls.rp", rankName: "Road Captain", role: "officer",
    status: "patched", memberNumber: 5, joinDate: "2023-07-19",
    rapSheet: rap(121, 7, 12, "30 mo", 11, "$860K"), rapStatus: "At Large",
    stats: { clubRuns: 52, churchAttendance: 31, operations: 12, territoryDefense: 8, recruitment: 1, specialAssignments: 4, territoryPatrol: 17, communityOutreach: 9, charityEvents: 6 },
  },
  {
    id: "m-ledger", displayName: "Jimmy Okafor", roadName: "Ledger",
    email: "ledger@silentsouls.rp", rankName: "Patched Member", role: "member",
    status: "patched", memberNumber: 9, joinDate: "2024-03-08",
    rapSheet: rap(64, 15, 3, "18 mo", 6, "$3.8M"), rapStatus: "At Large",
    stats: { clubRuns: 23, churchAttendance: 19, operations: 6, territoryDefense: 3, communityOutreach: 11, charityEvents: 8, securityDetail: 5 },
  },
  {
    id: "m-static", displayName: "Tasha Reyes", roadName: "Static",
    email: "static@silentsouls.rp", rankName: "Patched Member", role: "member",
    status: "patched", memberNumber: 11, joinDate: "2024-09-30",
    rapSheet: rap(43, 4, 7, "8 mo", 5, "$310K"), rapStatus: "At Large",
    stats: { clubRuns: 14, churchAttendance: 12, operations: 3, territoryPatrol: 6, communityOutreach: 4 },
  },
  {
    id: "m-patch", displayName: "Eli Munoz", roadName: "Patch",
    email: "patch@silentsouls.rp", rankName: "Prospect", role: "member",
    status: "prospect", memberNumber: 14, joinDate: "2026-02-14", sponsorId: "m-six",
    rapSheet: rap(12, 1, 0, "0 mo", 2, "$18K"), rapStatus: "On Probation",
    // one club run away from Road Warrior — perfect for the golden-path demo
    stats: { clubRuns: 9, churchAttendance: 3, prospectTasks: 2, territoryPatrol: 4 },
  },
];

// Character art by convention: public/brand/members/<memberId>.webp if it
// exists, else the shared shadow silhouette. Drop a file in, re-seed, done.
function characterArt(memberId: string): string {
  return existsSync(`public/brand/members/${memberId}.webp`)
    ? `/brand/members/${memberId}.webp`
    : "/brand/members/silhouette.webp";
}

const DEMO_PASSWORD = "brotherhood";

// ── Helpers ────────────────────────────────────────────────────────────

function evaluateSeedAwards(member: MemberSeed): PatchSeed[] {
  return PATCHES.filter(
    (patch) =>
      patch.requirement &&
      (member.stats[patch.requirement.statKey] ?? 0) >= patch.requirement.threshold,
  );
}

function buildCutLayout(rankTab: { text: string } | null, awards: PatchSeed[]): CutLayout {
  const surfaces: CutLayout["surfaces"] = { front: [], back: [] };
  if (rankTab) {
    surfaces.front.push({
      kind: "rankTab", refId: "rank", surface: "front",
      u: 0.5, v: 0.16, scale: 1, rotationDeg: 0, zIndex: 1, mirrored: false,
    });
  }
  for (const patch of awards) {
    const base = patch.defaultPlacement;
    const list = surfaces[base.surface];
    let v = base.v;
    const occupied = (uu: number, vv: number) =>
      list.some((pl: CutPlacement) => Math.abs(pl.u - uu) < 0.05 && Math.abs(pl.v - vv) < 0.05);
    while (occupied(base.u, v) && v < 0.95) v += 0.06;
    list.push({
      kind: "patch", refId: patch.id, surface: base.surface,
      u: base.u, v, scale: base.scale, rotationDeg: base.rotationDeg,
      zIndex: list.length + 1, mirrored: false,
    });
  }
  return { surfaces, updatedAt: new Date() };
}

async function ensureAuthUser(email: string, displayName: string): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(email);
    return existing.uid;
  } catch {
    const created = await auth.createUser({ email, password: DEMO_PASSWORD, displayName });
    return created.uid;
  }
}

// ── Main ───────────────────────────────────────────────────────────────

async function seed() {
  console.log(`Seeding project ${PROJECT_ID} (org: ${ORG_ID})...`);
  const org = db.collection("organizations").doc(ORG_ID);

  // Idempotent reset: wipe the org tree so re-seeding restores a clean demo state.
  await db.recursiveDelete(org);

  await org.set({
    name: "Ravens of Death MC San Andreas",
    publicName: "Ravens of Death Community Foundation",
    slug: ORG_ID,
    status: "active",
    features: { gallery: true, votes: true, cut3d: false },
    memberCount: MEMBERS.length,
    // Monotonic source for new member numbers — seeded to the highest existing
    // number so createMember can never reuse 1..14.
    lastMemberNumber: Math.max(...MEMBERS.map((m) => m.memberNumber)),
    foundedAt: Timestamp.fromDate(new Date("2023-02-11")),
    createdAt: Timestamp.now(),
  });

  await org.collection("branding").doc("portal").set(portalBranding);
  await org.collection("branding").doc("public").set(publicBranding);

  // Ranks
  const rankIdByName = new Map<string, string>();
  for (const rank of DEFAULT_RANKS) {
    const id = rank.name.toLowerCase().replace(/[^a-z]+/g, "-");
    rankIdByName.set(rank.name, id);
    await org.collection("ranks").doc(id).set({
      name: rank.name,
      order: rank.order,
      isOfficer: rank.isOfficer,
      tab: { text: rank.name.toUpperCase(), surface: "front", u: 0.5, v: 0.16, scale: 1 },
    });
  }

  // Activity types
  for (const [i, t] of ACTIVITY_TYPE_SEEDS.entries()) {
    const id = t.name.toLowerCase().replace(/[^a-z]+/g, "-");
    await org.collection("activityTypes").doc(id).set({
      name: t.name,
      statKey: t.statKey,
      requiresProof: t.requiresProof,
      allowQuantity: t.allowQuantity,
      defaultQuantity: 1,
      icon: t.icon,
      active: true,
      order: i + 1,
    });
  }

  // Patches
  for (const { id, ...patch } of PATCHES) {
    await org.collection("patches").doc(id).set(patch);
  }

  // Members + auth users + claims + awards + cut layouts
  const superUid = await ensureAuthUser("platform@brotherhood.app", "Platform Owner");
  await auth.setCustomUserClaims(superUid, { superAdmin: true });
  await db.collection("users").doc(superUid).set({
    email: "platform@brotherhood.app",
    displayName: "Platform Owner",
    superAdmin: true,
    memberships: {},
    createdAt: Timestamp.now(),
  });

  for (const m of MEMBERS) {
    const uid = await ensureAuthUser(m.email, m.displayName);
    await auth.setCustomUserClaims(uid, {
      orgs: { [ORG_ID]: { r: m.role, m: m.id } },
    });
    await db.collection("users").doc(uid).set({
      email: m.email,
      displayName: m.displayName,
      memberships: { [ORG_ID]: { memberId: m.id, role: m.role } },
      createdAt: Timestamp.now(),
    });

    const awards = evaluateSeedAwards(m);
    await org.collection("members").doc(m.id).set({
      uid,
      displayName: m.displayName,
      roadName: m.roadName,
      photoPath: characterArt(m.id),
      rapSheet: m.rapSheet,
      rapStatus: m.rapStatus,
      rankId: rankIdByName.get(m.rankName),
      status: m.status,
      joinDate: Timestamp.fromDate(new Date(m.joinDate)),
      ...(m.sponsorId ? { sponsorMemberId: m.sponsorId } : {}),
      memberNumber: m.memberNumber,
      stats: m.stats,
      patchCount: awards.length,
      createdAt: Timestamp.now(),
    });

    for (const patch of awards) {
      await org.collection("awardedPatches").doc(`${m.id}_${patch.id}`).set({
        memberId: m.id,
        patchId: patch.id,
        awardedAt: Timestamp.fromDate(new Date(m.joinDate)),
        awardedBy: "system",
      });
    }
    await org.collection("cutLayouts").doc(m.id).set(
      buildCutLayout({ text: m.rankName.toUpperCase() }, awards) as object,
    );
  }

  // Prospect profile for Eli
  await org.collection("prospectProfiles").doc("m-patch").set({
    startDate: Timestamp.fromDate(new Date("2026-02-14")),
    sponsorMemberId: "m-six",
    requirements: [
      { key: "church", label: "Church Attendance", statKey: "churchAttendance", target: 5, manualProgress: null },
      { key: "runs", label: "Club Runs", statKey: "clubRuns", target: 10, manualProgress: null },
      { key: "officerTasks", label: "Officer Tasks", statKey: null, target: 3, manualProgress: 2 },
    ],
    status: "active",
  });

  // A pending activity for the golden path (Eli's 10th club ride)
  await org.collection("activities").doc("a-golden-path").set({
    memberId: "m-patch",
    typeId: "club-ride",
    statKey: "clubRuns",
    date: Timestamp.fromDate(new Date("2026-07-05")),
    description: "Full club run out to Paleto Bay and back, rode sweep the whole way.",
    quantity: 1,
    witnesses: ["m-six", "m-thorn"],
    status: "pending",
    createdAt: Timestamp.now(),
  });

  // Events: one portal church meeting, one public charity event
  await org.collection("events").doc("e-church-next").set({
    title: "Church — Mandatory",
    type: "church",
    startAt: Timestamp.fromDate(new Date("2026-07-12T20:00:00")),
    location: "The Clubhouse, Sandy Shores",
    description: "Monthly mandatory church. Prospects handle setup.",
    visibility: "portal",
    activityTypeId: "mandatory-church-attendance",
    createdBy: "system",
    createdAt: Timestamp.now(),
  });
  await org.collection("events").doc("e-food-drive").set({
    title: "Charity Event — Food Drive Cover",
    type: "community",
    startAt: Timestamp.fromDate(new Date("2026-07-19T11:00:00")),
    location: "Legion Square, Los Santos",
    description: "Quarterly food drive. Full colors, best behavior.",
    visibility: "public",
    publicTitle: "Summer Community Food Drive",
    publicDescription:
      "Join the Ravens of Death Community Foundation at Legion Square for our quarterly food drive. All donations go directly to families in need across Los Santos.",
    activityTypeId: "charity-event",
    createdBy: "system",
    createdAt: Timestamp.now(),
  });

  // Timeline
  await org.collection("timeline").doc("founded").set({
    date: Timestamp.fromDate(new Date("2023-02-11")),
    title: "Organization Founded",
    description: "The charter was signed in a Sandy Shores garage. Eight founding members.",
    kind: "milestone",
    milestoneKey: "founded",
    icon: "flag",
    createdBy: "system",
  });
  await org.collection("timeline").doc("t-clubhouse").set({
    date: Timestamp.fromDate(new Date("2023-08-04")),
    title: "First Clubhouse Purchased",
    description: "The Ravens put down roots — the Sandy Shores clubhouse becomes home.",
    kind: "manual",
    icon: "home",
    createdBy: "system",
  });

  // Digital Cut config (M8): vest surfaces, slots, rank visuals, patch rarity.
  const cut = await writeCutConfig(db, ORG_ID, { orgName: "Ravens of Death MC", location: "San Andreas" });
  console.log(
    `  cut: ${cut.vestSurfaces} vest surfaces, ${cut.rankVisuals} rank visuals, ${cut.patchesBackfilled} patches tagged`,
  );

  console.log("Seed complete.");
  console.log("──────────────────────────────────────────────");
  console.log("Demo logins (password: brotherhood):");
  for (const m of MEMBERS) console.log(`  ${m.email.padEnd(28)} ${m.rankName} (${m.role})`);
  console.log(`  platform@brotherhood.app     Super Admin`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
