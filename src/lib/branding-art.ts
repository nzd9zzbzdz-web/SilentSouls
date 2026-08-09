import { DEFAULT_CHARACTER_STAGE, DEFAULT_ROSTER_BACKDROP } from "@/lib/constants";
import type { Branding } from "@/lib/types";

/**
 * The scene art an admin can swap from Admin → Branding.
 *
 * One table, imported by the action, the serving route and the admin UI, so
 * the shape an image is stored at and the branding field it lands in can never
 * disagree. Adding a swappable image means adding a row here and nothing else.
 */
export interface BrandingArtSpec {
  label: string;
  blurb: string;
  /** Which branding doc the path field lives on. */
  surface: "public" | "portal";
  /** The Branding field this art fills in. */
  field: keyof Pick<
    Branding,
    "rosterBackdropPath" | "portalRosterBackdropPath" | "characterStagePath"
  >;
  /**
   * Pages whose render this art changes. The upload/reset actions revalidate
   * every entry — kept here rather than in the action so a new row can't ship
   * with art that only appears after a redeploy.
   */
  revalidates: readonly { readonly path: string; readonly type: "page" | "layout" }[];
  /** Stored dimensions — the frame the art is cropped to fill. */
  width: number;
  height: number;
  /** Which part survives the crop when the source is a different shape. */
  position: "top" | "centre";
  /** Shipped art used when nothing has been uploaded. */
  fallback: string;
  /** Guidance shown in the uploader. */
  ratioHint: string;
}

export const BRANDING_ART = {
  rosterBackdrop: {
    label: "Roster backdrop",
    blurb:
      "Behind every rider on the public Brotherhood grid, and in the popup when a card is opened.",
    surface: "public",
    field: "rosterBackdropPath",
    // Matches the 3:4 card. Stored at 2x the ~300px the card draws at.
    width: 600,
    height: 800,
    // Centre, not a smart crop: "attention" chases the busiest region, which
    // on clubhouse art is the wall patch — exactly the thing that should sit
    // behind the rider rather than beside them. Predictable beats clever here.
    position: "centre",
    fallback: DEFAULT_ROSTER_BACKDROP,
    ratioHint: "Portrait, 3:4 (e.g. 900×1200). Anything else is cropped to fit.",
    revalidates: [{ path: "/[orgSlug]", type: "page" }],
  },
  portalRosterBackdrop: {
    label: "Portal roster backdrop",
    blurb: "Behind every rider on the portal Brotherhood wall, inside the login.",
    surface: "portal",
    field: "portalRosterBackdropPath",
    // Same 3:4 card as the public grid — the two walls draw the same shape.
    width: 600,
    height: 800,
    position: "centre",
    // Ships pointing at the same clubhouse art as the public wall, so the
    // portal cards read as a room from day one. Upload here to diverge.
    fallback: DEFAULT_ROSTER_BACKDROP,
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
    field: "characterStagePath",
    // The stage renders at 3:2 (see CharacterStage).
    width: 1600,
    height: 1067,
    // The stage art is composed top-heavy (lamps, wall patch), and the
    // component anchors to the top for the same reason.
    position: "top",
    fallback: DEFAULT_CHARACTER_STAGE,
    ratioHint: "Landscape, 3:2 (e.g. 1800×1200). Anything else is cropped to fit.",
    revalidates: [
      { path: "/[orgSlug]/portal", type: "layout" },
      { path: "/[orgSlug]/portal/brotherhood/[memberId]", type: "page" },
    ],
  },
} as const satisfies Record<string, BrandingArtSpec>;

export type BrandingArtKey = keyof typeof BRANDING_ART;

export const BRANDING_ART_KEYS = Object.keys(BRANDING_ART) as BrandingArtKey[];
