/**
 * Canonical org identity + branding for the seed/bootstrap scripts.
 *
 * The VALUES now live in `src/lib/branding-defaults.ts`, because the running
 * site needs them too: `resolveBranding` folds them under whatever Firestore
 * holds, so a club with a half-filled branding document still renders. This
 * file is the scripts' door onto that module and adds only the long-form club
 * copy the seeder writes.
 *
 * Every script that writes branding (seed, bootstrap, apply-branding,
 * update-public-branding, migrate-cut) imports from here. Do NOT re-declare
 * these values in a script: they drifted before and silently rewrote the old
 * club's name/palette back over a rebrand. That rule now extends one step
 * further — do not re-declare them HERE either. Edit branding-defaults.ts.
 *
 * Ravens of Death palette:
 *   Void Black #050407 · Raven Charcoal #151017 · Death Plum #2D111F
 *   Raven Purple #54213F · Blood Crimson #941B22 · Ember Red #D9362B
 *   Weathered Bone #B8A0A5 · Ash White #EEE7E8
 */
import type { Branding } from "../../src/lib/types";
import {
  DEFAULT_ASSETS,
  DEFAULT_BRANDING,
  DEFAULT_ORG_ADDRESS_LINE,
  DEFAULT_ORG_DISPLAY_NAME,
  DEFAULT_ORG_LEGAL_NAME,
  DEFAULT_ORG_LOCATION,
  DEFAULT_ORG_PUBLIC_NAME,
  DEFAULT_ORG_SHORT_NAME,
} from "../../src/lib/branding-defaults";
import { CLUB_CREED, CLUB_STORY } from "../../src/lib/constants";

export const ORG_DISPLAY_NAME = DEFAULT_ORG_DISPLAY_NAME;
export const ORG_LEGAL_NAME = DEFAULT_ORG_LEGAL_NAME;
export const ORG_PUBLIC_NAME = DEFAULT_ORG_PUBLIC_NAME;
export const ORG_SHORT_NAME = DEFAULT_ORG_SHORT_NAME;
export const ORG_LOCATION = DEFAULT_ORG_LOCATION;
export const ORG_ADDRESS_LINE = DEFAULT_ORG_ADDRESS_LINE;

export const portalBranding: Branding = {
  ...DEFAULT_BRANDING.portal,
  // Seeded explicitly so a fresh club's stage is set in the document as well
  // as in the fallback. Any of the shipped asset paths could be written this
  // way; this one is, because the character screen predates the catalog.
  characterStagePath: DEFAULT_ASSETS.characterStage,
};

export const publicBranding: Branding = {
  ...DEFAULT_BRANDING.public,
  logoPath: DEFAULT_ASSETS.logo,
  heroImagePath: DEFAULT_ASSETS.heroImage,
  // The About page's long-form history. Kept here so a seed or an
  // apply-branding run writes it, but the page also ships CLUB_STORY /
  // CLUB_CREED as defaults — a live org renders the story with no data change.
  story: CLUB_STORY,
  creed: CLUB_CREED,
};
