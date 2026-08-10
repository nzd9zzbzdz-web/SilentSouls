import { DEFAULT_ASSETS } from "@/lib/branding-defaults";
import type { Branding, BrandingAssetKey } from "@/lib/types";

/**
 * The catalog of every image an admin can swap from Admin → Branding.
 *
 * One table, imported by the upload action, the serving route and the admin
 * UI, so the shape an image is stored at and the slot it lands in can never
 * disagree. Making an image swappable means adding a key to
 * `BRANDING_ASSET_KEYS` and a row here, and nothing else: the editor renders a
 * card per row, the action validates against the row, and components resolve
 * through `resolveBranding`.
 */
export interface BrandingArtSpec {
  label: string;
  blurb: string;
  /**
   * Which branding doc carries the pointer. "both" writes to the public AND
   * portal docs — the club patch and the member silhouette appear on either
   * side of the login and would look absurd differing between them.
   */
  surface: "public" | "portal" | "both";
  /** How the card is grouped in the editor. */
  group: "Identity" | "Scene art" | "Emblems";
  /**
   * The pre-catalog `Branding` field this slot also fills. Present only for
   * the five paths that existed before `assets` did; still written on upload
   * so any reader not yet moved onto `resolveBranding` keeps working.
   */
  legacyField?: keyof Pick<
    Branding,
    | "rosterBackdropPath"
    | "portalRosterBackdropPath"
    | "characterStagePath"
    | "logoPath"
    | "heroImagePath"
  >;
  /**
   * Pages whose render this art changes. The upload/reset actions revalidate
   * every entry — kept here rather than in the action so a new row can't ship
   * with art that only appears after a redeploy.
   */
  revalidates: readonly { readonly path: string; readonly type: "page" | "layout" }[];
  /** Stored dimensions — the frame the art is fitted to. */
  width: number;
  height: number;
  /**
   * `cover` crops to fill the frame: right for backdrops, where letterboxing a
   * scene into bars looks broken. `contain` fits the whole image inside the
   * frame ON A TRANSPARENT GROUND: mandatory for patches, wordmarks and
   * emblems, which are cut-out artwork that must never lose an edge and must
   * never gain a black rectangle.
   */
  fit: "cover" | "contain";
  /** Which part survives a `cover` crop when the source is a different shape. */
  position: "top" | "centre";
  /** Shipped art used when nothing has been uploaded. */
  fallback: string;
  /** Guidance shown on the asset card. */
  ratioHint: string;
}

/** Every page that draws the club patch or the member silhouette. */
const EVERYWHERE = [
  { path: "/[orgSlug]", type: "layout" },
  { path: "/[orgSlug]/portal", type: "layout" },
] as const;

// Typed as the Record rather than `as const satisfies` it: the literal types
// would split the table into a union whose members disagree about whether
// `legacyField` exists, and every reader would have to narrow before asking.
export const BRANDING_ART: Record<BrandingAssetKey, BrandingArtSpec> = {
  // ── Identity ────────────────────────────────────────────────────────
  clubPatch: {
    label: "Club patch",
    blurb:
      "The colours themselves. Pinned to the public header, signed into the footer, and shown at size on the About page.",
    surface: "both",
    group: "Identity",
    // Drawn as tall as 15rem in the header, so stored at roughly 2x that.
    width: 720,
    height: 1080,
    fit: "contain",
    position: "centre",
    fallback: DEFAULT_ASSETS.clubPatch,
    ratioHint:
      "Portrait 2:3 with a transparent background (e.g. 1440×2160 PNG). Transparency is preserved.",
    revalidates: EVERYWHERE,
  },
  logo: {
    label: "Wordmark",
    blurb: "The club's name set as artwork. Used where a banner is wanted over the patch.",
    surface: "public",
    group: "Identity",
    legacyField: "logoPath",
    width: 1200,
    height: 400,
    fit: "contain",
    position: "centre",
    fallback: DEFAULT_ASSETS.logo,
    ratioHint: "Wide 3:1 with a transparent background (e.g. 1800×600 PNG).",
    revalidates: [{ path: "/[orgSlug]", type: "layout" }],
  },
  defaultAvatar: {
    label: "Default member figure",
    blurb:
      "Stands in for any member with no approved character render, on the roster wall and the character screen.",
    surface: "both",
    group: "Identity",
    width: 600,
    height: 900,
    fit: "contain",
    position: "centre",
    fallback: DEFAULT_ASSETS.defaultAvatar,
    ratioHint: "Portrait 2:3, transparent background, figure standing on the bottom edge.",
    revalidates: EVERYWHERE,
  },

  // ── Scene art ───────────────────────────────────────────────────────
  rosterBackdrop: {
    label: "Roster backdrop",
    blurb:
      "Behind every rider on the public Brotherhood grid, and in the popup when a card is opened.",
    surface: "public",
    group: "Scene art",
    legacyField: "rosterBackdropPath",
    // Matches the 3:4 card. Stored at 2x the ~300px the card draws at.
    width: 600,
    height: 800,
    fit: "cover",
    // Centre, not a smart crop: "attention" chases the busiest region, which
    // on clubhouse art is the wall patch — exactly the thing that should sit
    // behind the rider rather than beside them. Predictable beats clever here.
    position: "centre",
    fallback: DEFAULT_ASSETS.rosterBackdrop,
    ratioHint: "Portrait, 3:4 (e.g. 900×1200). Anything else is cropped to fit.",
    revalidates: [{ path: "/[orgSlug]", type: "page" }],
  },
  portalRosterBackdrop: {
    label: "Portal roster backdrop",
    blurb: "Behind every rider on the portal Brotherhood wall, inside the login.",
    surface: "portal",
    group: "Scene art",
    legacyField: "portalRosterBackdropPath",
    // Same 3:4 card as the public grid — the two walls draw the same shape.
    width: 600,
    height: 800,
    fit: "cover",
    position: "centre",
    // Ships pointing at the same clubhouse art as the public wall, so the
    // portal cards read as a room from day one. Upload here to diverge.
    fallback: DEFAULT_ASSETS.portalRosterBackdrop,
    ratioHint: "Portrait, 3:4 (e.g. 900×1200). Anything else is cropped to fit.",
    revalidates: [
      { path: "/[orgSlug]/portal", type: "layout" },
      { path: "/[orgSlug]/portal/brotherhood", type: "page" },
    ],
  },
  characterStage: {
    label: "Character stage",
    blurb: "The backdrop behind every member's character screen in the portal.",
    surface: "portal",
    group: "Scene art",
    legacyField: "characterStagePath",
    // The stage renders at 3:2 (see CharacterStage).
    width: 1600,
    height: 1067,
    fit: "cover",
    // The stage art is composed top-heavy (lamps, wall patch), and the
    // component anchors to the top for the same reason.
    position: "top",
    fallback: DEFAULT_ASSETS.characterStage,
    ratioHint: "Landscape, 3:2 (e.g. 1800×1200). Anything else is cropped to fit.",
    revalidates: [
      { path: "/[orgSlug]/portal", type: "layout" },
      { path: "/[orgSlug]/portal/brotherhood/[memberId]", type: "page" },
    ],
  },
  heroImage: {
    label: "Hero poster",
    blurb:
      "The still frame behind the home page headline, shown while the hero clip loads and whenever the gallery is empty.",
    surface: "public",
    group: "Scene art",
    legacyField: "heroImagePath",
    width: 1920,
    height: 820,
    fit: "cover",
    position: "centre",
    fallback: DEFAULT_ASSETS.heroImage,
    ratioHint: "Wide landscape, roughly 21:9 (e.g. 2400×1026).",
    revalidates: [{ path: "/[orgSlug]", type: "page" }],
  },
  watermark: {
    label: "Home page watermark",
    blurb:
      "The oversized illustration bleeding off the left of the home page's four pillars.",
    surface: "public",
    group: "Scene art",
    width: 1200,
    height: 1200,
    fit: "contain",
    position: "centre",
    fallback: DEFAULT_ASSETS.watermark,
    // The home page composites this with mix-blend-mode:lighten, which needs a
    // near-black canvas to disappear into the section behind it.
    ratioHint:
      "Square, on a NEAR-BLACK background (not transparent). It is blended so the dark canvas vanishes and only the bright artwork shows.",
    revalidates: [{ path: "/[orgSlug]", type: "page" }],
  },

  // ── Emblems ─────────────────────────────────────────────────────────
  // The four badges above the home page pillars, reused as a rule between
  // acts on the About page. Numbered rather than named ("skull", "winged")
  // because the next club's four badges are not this club's four badges.
  ...emblemRow("emblemOne", "First emblem", DEFAULT_ASSETS.emblemOne),
  ...emblemRow("emblemTwo", "Second emblem", DEFAULT_ASSETS.emblemTwo),
  ...emblemRow("emblemThree", "Third emblem", DEFAULT_ASSETS.emblemThree),
  ...emblemRow("emblemFour", "Fourth emblem", DEFAULT_ASSETS.emblemFour),
};

/** The four emblem slots are identical but for their label and default. */
function emblemRow<K extends string>(
  key: K,
  label: string,
  fallback: string,
): Record<K, BrandingArtSpec> {
  const spec: BrandingArtSpec = {
    label,
    blurb:
      "One of the four badges above the home page pillars and between the About page acts.",
    surface: "public",
    group: "Emblems",
    width: 320,
    height: 320,
    fit: "contain",
    position: "centre",
    fallback,
    ratioHint: "Square with a transparent background (e.g. 512×512 PNG).",
    revalidates: [
      { path: "/[orgSlug]", type: "page" },
      { path: "/[orgSlug]/about", type: "page" },
    ],
  };
  return { [key]: spec } as Record<K, BrandingArtSpec>;
}

export type BrandingArtKey = BrandingAssetKey;

export const BRANDING_ART_KEYS = Object.keys(BRANDING_ART) as BrandingArtKey[];

/** The editor's section order. Cards are grouped under these headings. */
export const BRANDING_ART_GROUPS = ["Identity", "Scene art", "Emblems"] as const;

/** Which branding docs an upload to this slot has to touch. */
export function surfacesFor(spec: BrandingArtSpec): ("public" | "portal")[] {
  return spec.surface === "both" ? ["public", "portal"] : [spec.surface];
}
