import type { Branding, BrandingAssetKey, BrandingColors } from "@/lib/types";

/**
 * The shipped branding — every colour, font, name and image the platform falls
 * back to when a club has not set its own.
 *
 * This is the SINGLE SOURCE OF TRUTH for what "unbranded" looks like, and it
 * is deliberately in `src/` rather than `scripts/`. It used to live only in
 * `scripts/lib/branding.ts`, which meant the running site had no fallback at
 * all: several components carried their own copy of a hex value or an image
 * path with a comment explaining that the branding read could return null.
 * Those copies are what a rebrand kept missing. Now the scripts import FROM
 * here (see `scripts/lib/branding.ts`), and `resolveBranding` folds this under
 * whatever Firestore holds, so a club with an empty branding doc renders
 * exactly the same site as a club with a full one.
 *
 * No "server-only" marker: the admin editor and its live preview are client
 * components and need these values to show what "Reset to default" will do.
 *
 * Ravens of Death palette:
 *   Void Black #050407 · Raven Charcoal #151017 · Death Plum #2D111F
 *   Raven Purple #54213F · Blood Crimson #941B22 · Ember Red #D9362B
 *   Weathered Bone #B8A0A5 · Ash White #EEE7E8
 */

export const DEFAULT_ORG_DISPLAY_NAME = "Ravens of Death MC";
export const DEFAULT_ORG_LEGAL_NAME = "Ravens of Death MC San Andreas";
export const DEFAULT_ORG_PUBLIC_NAME = "Ravens of Death Community Foundation";
export const DEFAULT_ORG_SHORT_NAME = "RODMC";
export const DEFAULT_ORG_LOCATION = "San Andreas";
export const DEFAULT_ORG_ADDRESS_LINE = "The Clubhouse, Sandy Shores";

/** The floating anthem both surfaces play. */
export const DEFAULT_ANTHEM_VIDEO_ID = "vmqd7N7zOhM";

/**
 * Where each catalog slot points before anyone uploads anything. Static files
 * under `public/brand`, so they ship with the deploy and cost no read.
 */
export const DEFAULT_ASSETS: Record<BrandingAssetKey, string> = {
  rosterBackdrop: "/brand/roster-backdrop.webp",
  portalRosterBackdrop: "/brand/roster-backdrop.webp",
  characterStage: "/brand/character-stage.webp",
  clubPatch: "/brand/club-patch.webp",
  logo: "/brand/silent-souls-banner.webp",
  heroImage: "/brand/silent-souls-hero.webp",
  watermark: "/brand/skull-bg.webp",
  defaultAvatar: "/brand/members/silhouette.webp",
  emblemOne: "/brand/emblem-winged.webp",
  emblemTwo: "/brand/emblem-skull.webp",
  emblemThree: "/brand/emblem-onepercent.webp",
  emblemFour: "/brand/emblem-mc.webp",
};

export const DEFAULT_FONTS: Branding["fonts"] = {
  display: "var(--font-blackletter)",
  body: "var(--font-inter)",
  mono: "var(--font-jetbrains)",
};

/**
 * Shared ground for both surfaces. The two faces of the club differ only in
 * their structural lines (see below), so everything else is stated once.
 */
const SHARED_COLORS = {
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
  // Focus ring stays ember: focus IS a state.
  ring: "#D9362B",
  glow: "#D9362B",
  elevated: "#1D1620",
} as const;

export const DEFAULT_PORTAL_COLORS: BrandingColors = {
  ...SHARED_COLORS,
  // Structural lines are WEATHERED BONE, not crimson. Every bordered thing in
  // the portal reads through this one value — cards, inputs, dividers, table
  // rules — so a red border token put red on every surface in the club before
  // a single component asked for it. Ember is spent on state (active nav,
  // hover, officers, alerts), not on structure.
  border: "rgba(184,160,165,0.14)",
  input: "rgba(184,160,165,0.24)",
  // Below Void Black, so the rail reads as recessed rather than as another
  // card floating on the page.
  sidebar: "#030206",
  sidebarBorder: "rgba(184,160,165,0.16)",
};

export const DEFAULT_PUBLIC_COLORS: BrandingColors = {
  ...SHARED_COLORS,
  // The shopfront keeps its original crimson structure — the ember-on-state
  // rule is portal-side. Do not "fix" this to match the portal: it is the
  // reason the two faces read as different rooms.
  border: "rgba(148,27,34,0.22)",
  input: "rgba(148,27,34,0.32)",
};

export const DEFAULT_TAGLINE_PUBLIC = "Brotherhood · Loyalty · Respect · Death";
export const DEFAULT_MISSION =
  "We are the Ravens. We ride where others fear to, bound by loyalty and blood. Death rides beside us, but so does honor, and no brother of ours ever rides alone.";

/**
 * A complete branding document per surface. `resolveBranding` layers the
 * club's Firestore doc on top of the matching entry, so any field the club has
 * not set renders exactly as it does today.
 *
 * `story` / `storyTitles` / `creed` are intentionally absent: those already
 * fall back to CLUB_STORY and friends in `constants.ts`, and duplicating a
 * nine-paragraph history here would give it two homes to drift between.
 */
export const DEFAULT_BRANDING: Record<"public" | "portal", Branding> = {
  portal: {
    colors: DEFAULT_PORTAL_COLORS,
    fonts: DEFAULT_FONTS,
    orgDisplayName: DEFAULT_ORG_DISPLAY_NAME,
    shortName: DEFAULT_ORG_SHORT_NAME,
    location: DEFAULT_ORG_LOCATION,
    addressLine: DEFAULT_ORG_ADDRESS_LINE,
    tagline: DEFAULT_ORG_LOCATION,
    anthemVideoId: DEFAULT_ANTHEM_VIDEO_ID,
  },
  public: {
    colors: DEFAULT_PUBLIC_COLORS,
    fonts: { display: DEFAULT_FONTS.display, body: DEFAULT_FONTS.body },
    orgDisplayName: DEFAULT_ORG_DISPLAY_NAME,
    shortName: DEFAULT_ORG_SHORT_NAME,
    location: DEFAULT_ORG_LOCATION,
    addressLine: DEFAULT_ORG_ADDRESS_LINE,
    tagline: DEFAULT_TAGLINE_PUBLIC,
    mission: DEFAULT_MISSION,
    anthemVideoId: DEFAULT_ANTHEM_VIDEO_ID,
  },
};
