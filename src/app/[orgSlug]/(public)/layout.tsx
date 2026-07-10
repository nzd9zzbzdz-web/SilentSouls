import { notFound } from "next/navigation";
import { getBranding, getOrgBySlug } from "@/lib/tenant";
import { BrandStyle } from "@/components/theme/BrandStyle";
import { CharityHeader } from "@/components/public/CharityHeader";
import { CharityFooter } from "@/components/public/CharityFooter";

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

  const branding = await getBranding(org.id, "public");
  if (!branding) notFound();

  return (
    <div
      data-surface="public"
      className="flex min-h-dvh flex-col bg-background text-foreground"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <BrandStyle branding={branding} surface="public" />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <CharityHeader orgSlug={orgSlug} name={branding.orgDisplayName} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <CharityFooter
        orgSlug={orgSlug}
        name={branding.orgDisplayName}
        tagline={branding.tagline}
      />
    </div>
  );
}
