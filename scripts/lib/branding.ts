/**
 * Canonical org identity + branding — the single source of truth.
 *
 * Every script that writes branding (seed, bootstrap, apply-branding,
 * update-public-branding, migrate-cut) imports from here. Do NOT re-declare
 * these values in a script: they drifted before and silently rewrote the old
 * club's name/palette back over a rebrand.
 *
 * Ravens of Death palette:
 *   Void Black #050407 · Raven Charcoal #151017 · Death Plum #2D111F
 *   Raven Purple #54213F · Blood Crimson #941B22 · Ember Red #D9362B
 *   Weathered Bone #B8A0A5 · Ash White #EEE7E8
 */
import type { Branding } from "../../src/lib/types";
import { CLUB_CREED, CLUB_STORY } from "../../src/lib/constants";

export const ORG_DISPLAY_NAME = "Ravens of Death MC";
export const ORG_LEGAL_NAME = "Ravens of Death MC San Andreas";
export const ORG_PUBLIC_NAME = "Ravens of Death Community Foundation";
export const ORG_LOCATION = "San Andreas";

export const portalBranding: Branding = {
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
    // Structural lines are WEATHERED BONE, not crimson. Every bordered thing
    // in the portal reads through this one value — cards, inputs, dividers,
    // table rules — so a red border token put red on every surface in the
    // club before a single component asked for it. Ember is now spent on
    // state (active nav, hover, officers, alerts), not on structure.
    border: "rgba(184,160,165,0.14)",
    input: "rgba(184,160,165,0.24)",
    // Focus ring stays ember: focus IS a state.
    ring: "#D9362B",
    // Below Void Black, so the rail reads as recessed rather than as another
    // card floating on the page.
    sidebar: "#030206",
    sidebarBorder: "rgba(184,160,165,0.16)",
  },
  fonts: {
    display: "var(--font-blackletter)",
    body: "var(--font-inter)",
    mono: "var(--font-jetbrains)",
  },
  orgDisplayName: ORG_DISPLAY_NAME,
  tagline: ORG_LOCATION,
  characterStagePath: "/brand/character-stage.webp",
};

export const publicBranding: Branding = {
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
  orgDisplayName: ORG_DISPLAY_NAME,
  tagline: "Brotherhood · Loyalty · Respect · Death",
  mission:
    "We are the Ravens. We ride where others fear to, bound by loyalty and blood. Death rides beside us, but so does honor, and no brother of ours ever rides alone.",
  // The About page's long-form history. Kept here so a seed or an
  // apply-branding run writes it, but the page also ships CLUB_STORY /
  // CLUB_CREED as defaults — a live org renders the story with no data change.
  story: CLUB_STORY,
  creed: CLUB_CREED,
};
