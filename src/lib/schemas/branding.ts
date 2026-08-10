import { z } from "zod";

/**
 * What the Branding editor is allowed to write.
 *
 * Deliberately narrow. A branding document also carries `assets` (written only
 * by the upload action) and the long-form club copy `story` / `storyTitles` /
 * `creed`. Neither is in this schema, and the save action merges rather than
 * replaces, so a colour change can never blank a club's history — which is the
 * one way a "visual identity" editor could destroy business content.
 */

/**
 * Any CSS colour the browser will actually paint: hex, rgb/rgba, hsl/hsla, or
 * a `color-mix()` expression. Validated by shape rather than by an allowlist
 * of formats, because the shipped Ravens palette itself mixes hex with rgba
 * and a stricter rule would reject the defaults.
 */
const cssColor = z
  .string()
  .trim()
  .min(1, "Pick a colour")
  .max(120, "That is not a colour value")
  // No quotes, semicolons, braces or comment markers: these land inside a
  // `<style>` element, so the value must not be able to close a declaration
  // and start another one.
  .regex(/^[^"'`;{}<>\\]+$/, "That is not a colour value")
  .refine((v) => !v.includes("/*") && !v.includes("*/"), "That is not a colour value");

export const brandingColorsSchema = z.object({
  background: cssColor,
  foreground: cssColor,
  card: cssColor,
  cardForeground: cssColor,
  primary: cssColor,
  primaryForeground: cssColor,
  secondary: cssColor,
  secondaryForeground: cssColor,
  muted: cssColor,
  mutedForeground: cssColor,
  accent: cssColor,
  accentForeground: cssColor,
  destructive: cssColor,
  border: cssColor,
  input: cssColor,
  ring: cssColor,
  sidebar: cssColor,
  sidebarBorder: cssColor,
  glow: cssColor,
  elevated: cssColor,
});

export type BrandingColorsInput = z.infer<typeof brandingColorsSchema>;

/** A YouTube video id, or empty to fall back to the shipped anthem. */
const videoId = z
  .string()
  .trim()
  .max(24)
  .regex(/^[A-Za-z0-9_-]*$/, "That is not a YouTube video id");

export const brandingDraftSchema = z.object({
  orgDisplayName: z.string().trim().min(1, "The club needs a name").max(80),
  shortName: z.string().trim().max(16, "Keep the short name under 16 characters"),
  location: z.string().trim().max(60),
  addressLine: z.string().trim().max(120),
  tagline: z.string().trim().max(160),
  mission: z.string().trim().max(1200),
  anthemVideoId: videoId,
  colors: brandingColorsSchema,
});

export type BrandingDraftInput = z.infer<typeof brandingDraftSchema>;

export const saveBrandingSchema = z.object({
  orgId: z.string().min(1),
  surface: z.enum(["public", "portal"]),
  draft: brandingDraftSchema,
  /**
   * Whether the club's own name changes with it. The display name lives on the
   * organization document as well as both branding docs, and a club renamed on
   * one surface only reads as a bug — but the caller decides, because the
   * public shopfront legitimately runs under a different name from the portal
   * ("… Community Foundation" vs "… MC").
   */
  renameOrg: z.boolean().default(false),
});

export type SaveBrandingInput = z.input<typeof saveBrandingSchema>;

/**
 * A branding preset: what Export writes and Import reads.
 *
 * Colours and copy only. Images are megabytes and are already addressable
 * through the asset cards, so a preset stays a small file that can live in a
 * repo or a chat message. `version` is here so a future shape change can be
 * detected rather than silently half-applied.
 */
export const brandingPresetSchema = z.object({
  version: z.literal(1),
  name: z.string().trim().max(80).optional(),
  public: brandingDraftSchema.partial().optional(),
  portal: brandingDraftSchema.partial().optional(),
});

export type BrandingPreset = z.infer<typeof brandingPresetSchema>;
