import type { ClubPreset } from "./types";
import type { BrandingColors } from "@/lib/types";

/**
 * Ravens of Death MC — the founding club, and the reference implementation of
 * a preset.
 *
 * The slug is still `silent-souls` (renamed 2026-07-15; the slug was never
 * migrated because it is the org's document id and every claim, cache tag and
 * URL is keyed on it).
 *
 * These values, and these file paths, are EXACTLY what the platform shipped as
 * its global defaults before presets existed. That is deliberate: moving the
 * Ravens from "the default" to "a preset" must be invisible on the live site,
 * so nothing here is tidied, renamed or relocated. `public/brand/*` stays flat
 * for this club because the org's stored branding document already points at
 * those paths; new clubs get their own `public/brand/<slug>/` folder.
 *
 * Palette:
 *   Void Black #050407 · Raven Charcoal #151017 · Death Plum #2D111F
 *   Raven Purple #54213F · Blood Crimson #941B22 · Ember Red #D9362B
 *   Weathered Bone #B8A0A5 · Ash White #EEE7E8
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

const portalColors: BrandingColors = {
  ...SHARED_COLORS,
  // Structural lines are WEATHERED BONE, not crimson. Every bordered thing in
  // the portal reads through this one value, so a red border token put red on
  // every surface in the club before a component asked for it. Ember is spent
  // on state (active nav, hover, officers, alerts), not on structure.
  border: "rgba(184,160,165,0.14)",
  input: "rgba(184,160,165,0.24)",
  // Below Void Black, so the rail reads as recessed rather than as another
  // card floating on the page.
  sidebar: "#030206",
  sidebarBorder: "rgba(184,160,165,0.16)",
};

const publicColors: BrandingColors = {
  ...SHARED_COLORS,
  // The shopfront keeps its original crimson structure — the ember-on-state
  // rule is portal-side. Do not "fix" this to match the portal: it is the
  // reason the two faces read as different rooms.
  border: "rgba(148,27,34,0.22)",
  input: "rgba(148,27,34,0.32)",
};

export const SILENT_SOULS_PRESET: ClubPreset = {
  slug: "silent-souls",

  identity: {
    displayName: "Ravens of Death MC",
    publicName: "Ravens of Death Community Foundation",
    legalName: "Ravens of Death MC San Andreas",
    shortName: "RODMC",
    location: "San Andreas",
    addressLine: "The Clubhouse, Sandy Shores",
    portalTagline: "San Andreas",
    publicTagline: "Brotherhood · Loyalty · Respect · Death",
    mission:
      "We are the Ravens. We ride where others fear to, bound by loyalty and blood. Death rides beside us, but so does honor, and no brother of ours ever rides alone.",
    anthemVideoId: "vmqd7N7zOhM",
  },

  colors: { portal: portalColors, public: publicColors },

  fonts: {
    display: "var(--font-blackletter)",
    body: "var(--font-inter)",
    mono: "var(--font-jetbrains)",
  },

  assets: {
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
  },

  plateArt: "/brand/chain-of-command.webp",

  heroVideo: "/brand/ravens-hero.mp4",

  copy: {
    story: [
      "The 0% Ravens of Death MC were born from men who had grown tired of living by everyone else's rules. The founders came together with one goal: build a brotherhood where loyalty meant everything and nobody could tell them how to live.",
      "The name Ravens of Death came from the club's belief that every member had already left their old life behind. The raven represented intelligence, freedom, and survival, while “Death” represented the death of the person they used to be. The 0% stood for their refusal to live as a traditional 1% club. They weren't interested in following another club's path. They wanted to create their own.",
      "The original brothers earned their reputation through the streets, riding together, protecting their territory, and standing shoulder-to-shoulder when trouble came knocking. Their patch quickly became a symbol of loyalty and fearlessness.",
      "To the Ravens, the patch isn't clothing. It's a promise. Every member is expected to respect the club, protect their brothers, and never betray the people who stood beside them. Anyone can wear a leather vest, but earning the Ravens patch is something entirely different.",
      "The club has never pretended to be respectable. They live outside the normal boundaries of society and aren't afraid to make enemies. Rival clubs, law enforcement, and anyone who threatens their family can quickly find themselves on the wrong side of the Ravens.",
      "Despite their reputation, the club's strongest weapon has always been its brotherhood. Money comes and goes, bikes can be replaced, and territory can be lost. Loyalty is permanent.",
      "Today, the 0% Ravens of Death MC continue to ride under one banner. They aren't looking for acceptance, approval, or permission.",
    ],
    storyTitles: [
      "The Founding",
      "The Name",
      "The Streets",
      "The Patch",
      "Outside the Lines",
      "What Holds",
      "Today",
    ],
    creed: [
      "They ride because they're brothers.",
      "They fight because they're family.",
      "And once you're a Raven, you never ride alone.",
    ],
    values: [
      ["The Patch", "Not clothing. A promise, and it has to be earned."],
      ["Loyalty", "Money comes and goes. Bikes can be replaced. Loyalty is permanent."],
      ["Freedom", "Zero percent. We don't ride another club's path."],
      ["Brotherhood", "No brother of ours ever rides alone."],
    ],
    pillars: [
      {
        title: "About Us",
        body: "{club} was founded on the core values of loyalty, trust, and respect. We are brothers, nothing more, nothing less.",
        href: "about",
        cta: "Read More",
      },
      {
        title: "Brotherhood",
        body: "We ride together, we stand together, we bleed together. Our bond is unbreakable. Our brotherhood is forever.",
        href: "brotherhood",
        cta: "Meet the Club",
      },
      {
        title: "Our Code",
        body: "We live by a code. It guides our actions and defines who we are. Disrespect the code, and you'll face the consequences.",
        href: "about",
        cta: "Read More",
      },
      {
        title: "Join the Club",
        body: "Think you have what it takes to be one of us? Loyalty is earned, not given. Start your journey here.",
        href: "join",
        cta: "Apply Now",
      },
    ],
    closingHeading: "Loyalty is earned, not given.",
    closingBody:
      "The road is long and it isn’t for everyone. If you think you belong with us, come prove it.",
  },

  contact: {
    venue: "Community Center",
    addressLines: ["Legion Square Community Center", "Los Santos, San Andreas"],
    hours: ["Saturdays 9:00 AM to 2:00 PM", "Donation drop-offs welcome"],
  },
};
