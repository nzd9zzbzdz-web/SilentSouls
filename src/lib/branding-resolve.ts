import { BRANDING_ART } from "@/lib/branding-art";
import { defaultAssetsFor, defaultBrandingFor } from "@/lib/branding-defaults";
import { clubPreset } from "@/lib/clubs";
import { BRANDING_ASSET_KEYS } from "@/lib/types";
import type {
  Branding,
  BrandingAssetKey,
  BrandingColors,
  BrandingAssets,
} from "@/lib/types";

/**
 * Branding with every hole filled.
 *
 * Firestore holds only what a club has actually chosen, so a raw `Branding` is
 * full of optionals and every consumer ends up writing its own `?? something`.
 * That is exactly how a hex value or an image path ends up hardcoded in a
 * component. `resolveBranding` does the folding ONCE, at the layout, and hands
 * down a value where `colors.glow` and `assets.clubPatch` are simply strings.
 *
 * Pure and client-safe: the admin editor resolves an unsaved draft through the
 * same function to paint its live preview, which is what makes the preview
 * trustworthy rather than an approximation.
 */
export interface ResolvedBranding {
  surface: "public" | "portal";
  /** Every token present — no optional colours downstream. */
  colors: Required<BrandingColors>;
  fonts: { display: string; body: string; mono: string };
  /** Club name as shown, e.g. "Ravens of Death MC". */
  name: string;
  /** Initials for tight spots, e.g. "RODMC". Never empty. */
  shortName: string;
  /** Chapter or territory, e.g. "San Andreas". May be empty. */
  location: string;
  /** The line above it in the footer. May be empty. */
  addressLine: string;
  tagline: string;
  mission: string;
  anthemVideoId: string;
  /** Every catalog slot resolved to a usable URL. */
  assets: Record<BrandingAssetKey, string>;
  /** Which slots are running on an upload rather than the shipped default. */
  customAssets: Set<BrandingAssetKey>;
}

/**
 * "Ravens of Death MC" → "RODMC". Only used when a club has not set its own
 * short name; the point is that the slot is never blank on screen.
 */
export function initialsOf(name: string): string {
  const letters = name
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return letters || name.slice(0, 4).toUpperCase();
}

/**
 * Where a slot's image comes from, in order: what the club uploaded, then the
 * pre-catalog path field it used to be stored in, then the shipped file.
 *
 * The legacy step matters for live clubs: `characterStagePath` is written by
 * the seeder and by uploads made before this catalog existed, and dropping it
 * would blank a stage that is currently on screen.
 */
function assetUrl(
  branding: Branding | null,
  key: BrandingAssetKey,
  shipped: Record<BrandingAssetKey, string>,
): string {
  const uploaded = branding?.assets?.[key];
  if (uploaded) return uploaded;
  const legacy = BRANDING_ART[key].legacyField;
  if (legacy) {
    const value = branding?.[legacy];
    if (typeof value === "string" && value) return value;
  }
  return shipped[key];
}

/**
 * Fold a club's stored branding over the shipped defaults for one surface.
 *
 * `null` is a valid input and yields the default club exactly — that is the
 * property that lets a fresh deploy render before anyone has opened Admin.
 */
export function resolveBranding(
  branding: Branding | null | undefined,
  surface: "public" | "portal",
  slug: string | null | undefined,
): ResolvedBranding {
  const base = defaultBrandingFor(slug, surface);
  const shipped = defaultAssetsFor(slug);
  const colors = { ...base.colors, ...branding?.colors };
  const name = branding?.orgDisplayName || base.orgDisplayName;

  const assets = {} as Record<BrandingAssetKey, string>;
  const customAssets = new Set<BrandingAssetKey>();
  for (const key of BRANDING_ASSET_KEYS) {
    assets[key] = assetUrl(branding ?? null, key, shipped);
    if (branding?.assets?.[key]) customAssets.add(key);
  }

  return {
    surface,
    colors: {
      ...colors,
      // The four that are optional on the stored shape resolve to the value
      // every surface mixed from before they existed, so an org that has never
      // set them is pixel-identical to how it looked then.
      sidebar: colors.sidebar ?? colors.card,
      sidebarBorder: colors.sidebarBorder ?? colors.border,
      glow: colors.glow ?? colors.primary,
      elevated: colors.elevated ?? colors.card,
    },
    fonts: {
      display: branding?.fonts?.display || base.fonts.display,
      body: branding?.fonts?.body || base.fonts.body,
      mono: branding?.fonts?.mono || base.fonts.mono || base.fonts.body,
    },
    name,
    shortName: branding?.shortName || base.shortName || initialsOf(name),
    location: branding?.location ?? base.location ?? "",
    addressLine: branding?.addressLine ?? base.addressLine ?? "",
    tagline: branding?.tagline ?? base.tagline ?? "",
    mission: branding?.mission ?? base.mission ?? "",
    anthemVideoId: branding?.anthemVideoId ?? base.anthemVideoId ?? "",
    assets,
    customAssets,
  };
}

/**
 * The editable slice of a branding doc — what the admin editor holds as draft
 * state and what Save writes back. Deliberately NOT the whole `Branding`:
 * `story`, `storyTitles` and `creed` are long-form club copy with their own
 * home, and `assets` is written by the upload action, not by the colour form.
 */
export interface BrandingDraft {
  orgDisplayName: string;
  shortName: string;
  location: string;
  addressLine: string;
  tagline: string;
  mission: string;
  anthemVideoId: string;
  colors: Required<BrandingColors>;
}

/**
 * Identity that is the same club whichever face you are looking at.
 *
 * Branding is stored per surface, which is right for the fields that
 * legitimately differ: the shopfront runs under a different NAME from the
 * clubhouse ("… Community Foundation" vs "… MC"), its tagline is the creed
 * while the portal's is the territory, and only the public site has a mission
 * statement. A club's initials, its chapter, its clubhouse address and its
 * anthem are not like that — there is one answer, and asking twice invites the
 * two documents to disagree.
 *
 * Worse than untidy: several of these are only DRAWN on the public site, so
 * editing them on the portal tab (which is the one the editor opens on) wrote
 * a value nothing would ever render. Both the save action and the editor treat
 * this list as shared and write it to both documents.
 */
export const SHARED_IDENTITY_KEYS = [
  "shortName",
  "location",
  "addressLine",
  "anthemVideoId",
] as const satisfies readonly (keyof BrandingDraft)[];

export type SharedIdentityKey = (typeof SHARED_IDENTITY_KEYS)[number];

/** The subset of a draft that both surfaces share. */
export function sharedIdentity(draft: BrandingDraft): Pick<BrandingDraft, SharedIdentityKey> {
  return {
    shortName: draft.shortName,
    location: draft.location,
    addressLine: draft.addressLine,
    anthemVideoId: draft.anthemVideoId,
  };
}

/** The draft an editor opens with for a surface. */
export function toDraft(resolved: ResolvedBranding): BrandingDraft {
  return {
    orgDisplayName: resolved.name,
    shortName: resolved.shortName,
    location: resolved.location,
    addressLine: resolved.addressLine,
    tagline: resolved.tagline,
    mission: resolved.mission,
    anthemVideoId: resolved.anthemVideoId,
    colors: resolved.colors,
  };
}

/** A draft resolved back into a full branding value, for the live preview. */
export function draftToResolved(
  draft: BrandingDraft,
  surface: "public" | "portal",
  assets: BrandingAssets,
  slug: string,
): ResolvedBranding {
  return resolveBranding(
    {
      colors: draft.colors,
      fonts: clubPreset(slug).fonts,
      orgDisplayName: draft.orgDisplayName,
      shortName: draft.shortName,
      location: draft.location,
      addressLine: draft.addressLine,
      tagline: draft.tagline,
      mission: draft.mission,
      anthemVideoId: draft.anthemVideoId,
      assets,
    },
    surface,
    slug,
  );
}
