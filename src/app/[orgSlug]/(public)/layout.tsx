import { notFound } from "next/navigation";
import { getBranding, getOrgBySlug } from "@/lib/tenant";
import { resolveBranding } from "@/lib/branding-resolve";
import { BrandStyle } from "@/components/theme/BrandStyle";
import { BrandingProvider } from "@/components/theme/BrandingProvider";
import { BodySurface } from "@/components/theme/BodySurface";
import { CharityHeader } from "@/components/public/CharityHeader";
import { CharityFooter } from "@/components/public/CharityFooter";
import { MusicPlayer } from "@/components/media/MusicPlayer";

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org || org.status !== "active") notFound();

  // Resolved once, here. Everything below reads a value where every colour and
  // every image URL is already present, which is what keeps `?? "/brand/..."`
  // out of components. A club with no branding document renders the shipped
  // defaults rather than 404ing, so a fresh tenant is never a broken site.
  const branding = resolveBranding(await getBranding(org.id, "public"), "public");

  return (
    <BrandingProvider branding={branding}>
      <div
        data-surface="public"
        className="flex min-h-dvh flex-col bg-background text-foreground"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <BrandStyle branding={branding} surface="public" />
        <BodySurface surface="public" />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <CharityHeader orgSlug={orgSlug} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <CharityFooter orgSlug={orgSlug} branding={branding} />
        <MusicPlayer videoId={branding.anthemVideoId} label="Club Anthem" />
      </div>
    </BrandingProvider>
  );
}
