import type { Branding } from "@/lib/types";

const COLOR_VAR_MAP: Record<keyof Branding["colors"], string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  destructive: "--destructive",
  border: "--border",
  input: "--input",
  ring: "--ring",
};

/**
 * Injects an org's branding tokens as CSS variable overrides, scoped to a
 * [data-surface] subtree. Rendered server-side after globals.css, so these
 * win over the defaults. Zero hardcoded brand hex anywhere in components —
 * Ravens of Death colors are Firestore data.
 */
export function BrandStyle({
  branding,
  surface,
}: {
  branding: Branding;
  surface: "public" | "portal";
}) {
  const lines: string[] = [];
  for (const [key, cssVar] of Object.entries(COLOR_VAR_MAP)) {
    const value = branding.colors[key as keyof Branding["colors"]];
    if (value) lines.push(`${cssVar}: ${value};`);
  }
  // Popover mirrors card; sidebar tokens follow the same surface.
  lines.push(`--popover: ${branding.colors.card};`);
  lines.push(`--popover-foreground: ${branding.colors.cardForeground};`);
  lines.push(`--sidebar: ${branding.colors.card};`);
  lines.push(`--sidebar-foreground: ${branding.colors.cardForeground};`);
  lines.push(`--sidebar-primary: ${branding.colors.primary};`);
  lines.push(`--sidebar-primary-foreground: ${branding.colors.primaryForeground};`);
  lines.push(`--sidebar-accent: ${branding.colors.secondary};`);
  lines.push(`--sidebar-accent-foreground: ${branding.colors.secondaryForeground};`);
  lines.push(`--sidebar-border: ${branding.colors.border};`);
  lines.push(`--sidebar-ring: ${branding.colors.ring};`);
  lines.push(`--font-display: ${branding.fonts.display};`);
  lines.push(`--font-body: ${branding.fonts.body};`);
  if (branding.fonts.mono) lines.push(`--font-stat: ${branding.fonts.mono};`);

  const css = `[data-surface="${surface}"] {\n  ${lines.join("\n  ")}\n}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
