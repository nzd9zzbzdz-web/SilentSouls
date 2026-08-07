import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getBranding, getOrgBySlug } from "@/lib/tenant";
import { getMember, listRanks } from "@/lib/queries";
import { BrandStyle } from "@/components/theme/BrandStyle";
import { BodySurface } from "@/components/theme/BodySurface";
import { PortalShell } from "@/components/portal/PortalShell";
import { Toaster } from "@/components/ui/sonner";

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  // Real verification happens HERE (proxy only checked cookie presence).
  // Neither lookup needs the other, so they run in parallel.
  const [org, user] = await Promise.all([getOrgBySlug(orgSlug), getSessionUser()]);
  if (!org || org.status !== "active") notFound();
  if (!user) redirect(`/${orgSlug}/volunteer-resources?signin=1`);

  const entry = user.claims.orgs?.[org.id];
  const isSuper = user.claims.superAdmin === true;
  if (!entry && !isSuper) {
    // Generic bounce — never reveal the portal exists to outsiders.
    redirect(`/${orgSlug}/volunteer-resources`);
  }

  const role = isSuper ? "admin" : entry!.r;
  const memberId = entry?.m ?? null;

  // Branding, member, and ranks don't depend on each other — fetch together.
  // getMember/listRanks are request-cached, so pages that need them ride free.
  const [branding, member, ranks] = await Promise.all([
    getBranding(org.id, "portal"),
    memberId ? getMember(org.id, memberId) : null,
    memberId ? listRanks(org.id) : [],
  ]);
  if (!branding) notFound();

  const rankName = member
    ? ranks.find((r) => r.id === member.rankId)?.name
    : undefined;

  return (
    <div
      data-surface="portal"
      className="dark bg-background text-foreground"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <BrandStyle branding={branding} surface="portal" />
      <BodySurface surface="portal" dark />
      <PortalShell
        orgSlug={orgSlug}
        orgName={branding.orgDisplayName}
        tagline={branding.tagline}
        role={role}
        viewer={
          member
            ? {
                roadName: member.roadName,
                displayName: member.displayName,
                rankName: rankName ?? "",
              }
            : { roadName: "Platform", displayName: user.email ?? "Super Admin", rankName: "Super Admin" }
        }
      >
        {children}
      </PortalShell>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
