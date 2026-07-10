import { notFound } from "next/navigation";
import { Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { requireOrgRole } from "@/lib/auth/session";
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

  const [portal, publicBranding] = await Promise.all([
    getBranding(org.id, "portal"),
    getBranding(org.id, "public"),
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <DisplayHeading className="flex items-center gap-3 text-3xl text-primary">
          <Palette className="size-7" aria-hidden />
          Branding
        </DisplayHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          Both faces of the organization — the clubhouse and the cover story. A
          full branding editor arrives with the multi-tenant milestone; today these
          are managed in Firestore.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portal — {portal?.orgDisplayName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {portal?.tagline && (
            <p className="text-sm text-muted-foreground">Tagline: {portal.tagline}</p>
          )}
          {renderSwatches(portal?.colors as Record<string, string> | undefined)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public — {publicBranding?.orgDisplayName}</CardTitle>
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
