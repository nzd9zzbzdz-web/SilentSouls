import { describe, expect, it } from "vitest";
import { PLATFORM_PRESET, clubPreset } from "@/lib/clubs";
import { SILENT_SOULS_PRESET } from "@/lib/clubs/silent-souls";
import { defaultAssetsFor, defaultBrandingFor } from "@/lib/branding-defaults";
import { resolveBranding } from "@/lib/branding-resolve";
import { BRANDING_ASSET_KEYS } from "@/lib/types";

/**
 * The property this whole preset layer exists for: a club with no preset and
 * no saved branding must inherit NOTHING from another club.
 *
 * Isolation used to hold in Firestore and leak through the fallbacks — every
 * unset field resolved to the Ravens, because the Ravens WERE the default. A
 * second club that had not uploaded a logo rendered the Ravens' patch. These
 * tests are what stops that regressing: they assert on the absence of one
 * club's values from another's resolved branding, so re-introducing a shared
 * default fails here rather than on someone's live site.
 */

const RAVENS = SILENT_SOULS_PRESET;
const NEW_CLUB = "blue-wolves";

/** Every string a resolved branding value can render, flattened. */
function renderedStrings(slug: string): string[] {
  const out: string[] = [];
  for (const surface of ["public", "portal"] as const) {
    const r = resolveBranding(null, surface, { slug });
    out.push(
      r.name,
      r.shortName,
      r.location,
      r.addressLine,
      r.tagline,
      r.mission,
      r.chainTitle,
      r.chainBlurb,
      r.anthemVideoId,
      ...Object.values(r.colors),
      ...Object.values(r.assets),
    );
  }
  const preset = clubPreset(slug);
  out.push(
    ...preset.copy.story,
    ...preset.copy.storyTitles,
    ...preset.copy.creed,
    ...preset.copy.values.flat(),
    ...preset.copy.pillars.flatMap((p) => [p.title, p.body]),
    preset.copy.closingHeading,
    preset.copy.closingBody,
    preset.contact.venue,
    ...preset.contact.addressLines,
    ...preset.contact.hours,
    preset.plateArt ?? "",
    preset.heroVideo ?? "",
  );
  return out.filter(Boolean);
}

describe("club presets", () => {
  it("an unknown slug gets the blank platform preset, not the Ravens", () => {
    expect(clubPreset(NEW_CLUB)).toBe(PLATFORM_PRESET);
    expect(clubPreset(undefined)).toBe(PLATFORM_PRESET);
    expect(clubPreset("")).toBe(PLATFORM_PRESET);
  });

  it("the founding club still resolves to its own preset", () => {
    expect(clubPreset("silent-souls")).toBe(RAVENS);
  });
});

describe("a preset-less club inherits nothing from the Ravens", () => {
  const theirs = renderedStrings(NEW_CLUB);

  it("renders none of the Ravens' identity strings", () => {
    for (const value of [
      RAVENS.identity.displayName,
      RAVENS.identity.publicName,
      RAVENS.identity.shortName,
      RAVENS.identity.location,
      RAVENS.identity.addressLine,
      RAVENS.identity.publicTagline,
      RAVENS.identity.mission,
      // Not chainTitle: "Brotherhood" is the shape of the page (like the
      // pillar headings), and the blank preset legitimately reuses it. The
      // blurb is the Ravens' own line and must not cross.
      RAVENS.identity.chainBlurb,
      RAVENS.identity.anthemVideoId,
    ]) {
      expect(theirs).not.toContain(value);
    }
  });

  it("renders none of the Ravens' colours", () => {
    const ravensColors = new Set([
      ...Object.values(RAVENS.colors.portal),
      ...Object.values(RAVENS.colors.public),
    ]);
    for (const value of theirs) {
      expect(ravensColors.has(value)).toBe(false);
    }
  });

  it("points at none of the Ravens' artwork", () => {
    const ravensArt = new Set<string>([
      ...Object.values(RAVENS.assets),
      RAVENS.plateArt ?? "",
      RAVENS.heroVideo ?? "",
    ]);
    // The shadow figure is the one deliberate exception: it depicts a person
    // and carries no club marks, so it is platform art rather than the
    // Ravens'. If that ever stops being true, this line should fail.
    ravensArt.delete(PLATFORM_PRESET.assets.defaultAvatar);
    for (const value of theirs) {
      expect(ravensArt.has(value)).toBe(false);
    }
  });

  it("tells none of the Ravens' story", () => {
    // PROSE only. Section labels like "Brotherhood" and "Our Code" are the
    // shape of the page rather than one club's writing, and the blank preset
    // legitimately reuses them as headings for its own empty slots. What must
    // never cross is the sentences: a club's history, creed and value copy.
    const ravensProse = [
      ...RAVENS.copy.story,
      ...RAVENS.copy.creed,
      ...RAVENS.copy.values.map(([, body]) => body),
      ...RAVENS.copy.pillars.map((p) => p.body),
      RAVENS.copy.closingBody,
      ...RAVENS.contact.addressLines,
      RAVENS.contact.venue,
    ].filter((line) => line.length > 20);

    for (const line of ravensProse) {
      expect(theirs).not.toContain(line);
    }
  });

  it("has no hierarchy plate, so it cannot wear another club's engraving", () => {
    expect(clubPreset(NEW_CLUB).plateArt).toBeNull();
    // In the asset map that answer is spelled "", and it must survive
    // resolution: a truthy fallback here would be the Ravens' plate leaking.
    expect(defaultAssetsFor(NEW_CLUB).plateArt).toBe("");
    expect(resolveBranding(null, "portal", { slug: NEW_CLUB }).assets.plateArt).toBe("");
  });

  it("resolves every asset slot to something renderable", () => {
    const assets = defaultAssetsFor(NEW_CLUB);
    for (const key of BRANDING_ASSET_KEYS) {
      // The plate is the one slot where "nothing" is the real answer.
      if (key === "plateArt") continue;
      expect(assets[key], key).toMatch(/^\/[\w\-./]+\.(webp|png|jpg|svg)$/);
    }
  });
});

describe("the founding club is unchanged by the preset layer", () => {
  it("resolves the exact palette it shipped with", () => {
    for (const surface of ["public", "portal"] as const) {
      const resolved = resolveBranding(null, surface, { slug: "silent-souls" });
      expect(resolved.colors).toMatchObject(RAVENS.colors[surface]);
      expect(resolved.name).toBe(RAVENS.identity.displayName);
      expect(resolved.assets).toEqual({ ...RAVENS.assets, plateArt: RAVENS.plateArt });
    }
  });

  it("keeps the public and portal surfaces distinct where they always were", () => {
    const pub = defaultBrandingFor("silent-souls", "public");
    const portal = defaultBrandingFor("silent-souls", "portal");
    // Crimson structure on the shopfront, weathered bone in the clubhouse.
    expect(pub.colors.border).not.toBe(portal.colors.border);
    expect(pub.tagline).toBe(RAVENS.identity.publicTagline);
    expect(portal.tagline).toBe(RAVENS.identity.portalTagline);
  });

  it("a stored branding document still overrides the preset", () => {
    const resolved = resolveBranding(
      {
        colors: { ...RAVENS.colors.portal, primary: "#1E5FD9" },
        fonts: RAVENS.fonts,
        orgDisplayName: "Azure Wolves MC",
        chainTitle: "The Table",
        chainBlurb: "",
        assets: {
          clubPatch: "/api/orgs/x/branding/clubPatch?v=1",
          plateArt: "/api/orgs/x/branding/plateArt?v=1",
        },
      },
      "portal",
      { slug: "silent-souls" },
    );
    expect(resolved.colors.primary).toBe("#1E5FD9");
    expect(resolved.name).toBe("Azure Wolves MC");
    expect(resolved.chainTitle).toBe("The Table");
    // An empty blurb is a choice and survives; an empty TITLE would not.
    expect(resolved.chainBlurb).toBe("");
    expect(resolved.assets.clubPatch).toBe("/api/orgs/x/branding/clubPatch?v=1");
    expect(resolved.assets.plateArt).toBe("/api/orgs/x/branding/plateArt?v=1");
    expect(resolved.customAssets.has("clubPatch")).toBe(true);
    // Untouched slots still come from the preset.
    expect(resolved.assets.characterStage).toBe(RAVENS.assets.characterStage);
  });
});
