import { notFound } from "next/navigation";
import { PAGE_W } from "@/lib/page-width";
import { Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { StageArtButton } from "@/components/portal/StageArtButton";
import { BrandingArtUploader } from "@/components/portal/BrandingArtUploader";
import { requireOrgRole } from "@/lib/auth/session";
import { BRANDING_ART, BRANDING_ART_KEYS } from "@/lib/branding-art";
import { listBrandingArtKeys } from "@/lib/queries";
import { getBranding, getOrgBySlug } from "@/lib/tenant";

export default async function BrandingAdminPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  await requireOrgRole(org.id, "admin");

  const [portal, publicBranding, uploaded] = await Promise.all([
    getBranding(org.id, "portal"),
    getBranding(org.id, "public"),
    listBrandingArtKeys(org.id),
  ]);

  const renderSwatches = (colors: Record<string, string> | undefined) => (
    <div className="flex flex-wrap gap-2">
      {colors &&
        Object.entries(colors).map(([name, value]) => (
          <div key={name} className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
            <span
              aria-hidden
              className="size-4 rounded-full border border-border"
              style={{ backgroundColor: value }}
            />
            <span className="text-xs text-muted-foreground">{name}</span>
          </div>
        ))}
    </div>
  );

  return (
    <div className={`${PAGE_W.content} space-y-8`}>
      <div>
        <DisplayHeading className="flex items-center gap-3 text-3xl text-foreground md:text-4xl">
          <Palette className="size-7" aria-hidden />
          Branding
        </DisplayHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          Both faces of the organization: the clubhouse and the cover story. A
          full branding editor arrives with the multi-tenant milestone; today these
          are managed in Firestore.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portal · {portal?.orgDisplayName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {portal?.tagline && (
            <p className="text-sm text-muted-foreground">Tagline: {portal.tagline}</p>
          )}
          {renderSwatches(portal?.colors as Record<string, string> | undefined)}
        </CardContent>
      </Card>

      {/* Scene art. Both slots come from BRANDING_ART, so a new swappable
          image is a row in that table rather than another card written here. */}
      <Card>
        <CardHeader>
          <CardTitle>Scene Art</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {BRANDING_ART_KEYS.map((key) => {
            const spec = BRANDING_ART[key];
            const branding = spec.surface === "portal" ? portal : publicBranding;
            const current = branding?.[spec.field];
            return (
              <BrandingArtUploader
                key={key}
                orgId={org.id}
                artKey={key}
                label={spec.label}
                blurb={spec.blurb}
                ratioHint={spec.ratioHint}
                currentUrl={current ?? spec.fallback}
                // An upload, not merely a set path — the seeder writes the
                // shipped default into characterStagePath.
                isCustom={uploaded.has(key)}
                aspect={`${spec.width} / ${spec.height}`}
              />
            );
          })}

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs text-muted-foreground">
              Or put the character stage back to the artwork that ships with the
              platform:
            </p>
            <StageArtButton orgId={org.id} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public · {publicBranding?.orgDisplayName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {publicBranding?.tagline && (
            <p className="text-sm text-muted-foreground">
              Tagline: {publicBranding.tagline}
            </p>
          )}
          {renderSwatches(publicBranding?.colors as Record<string, string> | undefined)}
        </CardContent>
      </Card>
    </div>
  );
}
