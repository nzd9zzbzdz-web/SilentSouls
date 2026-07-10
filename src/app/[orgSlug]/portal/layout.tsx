import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getBranding, getOrgBySlug } from "@/lib/tenant";
import { orgRef } from "@/lib/firebase/admin";
import { BrandStyle } from "@/components/theme/BrandStyle";
import { PortalShell } from "@/components/portal/PortalShell";
import { Toaster } from "@/components/ui/sonner";
import type { Member, Rank } from "@/lib/types";

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org || org.status !== "active") notFound();

  // Real verification happens HERE (proxy only checked cookie presence).
  const user = await getSessionUser();
  if (!user) redirect(`/${orgSlug}/volunteer-resources?signin=1`);

  const entry = user.claims.orgs?.[org.id];
  const isSuper = user.claims.superAdmin === true;
  if (!entry && !isSuper) {
    // Generic bounce — never reveal the portal exists to outsiders.
    redirect(`/${orgSlug}/volunteer-resources`);
  }

  const role = isSuper ? "admin" : entry!.r;
  const memberId = entry?.m ?? null;

  const branding = await getBranding(org.id, "portal");
  if (!branding) notFound();

  let member: (Member & { rankName?: string }) | null = null;
  if (memberId) {
    const snap = await orgRef(org.id).collection("members").doc(memberId).get();
    if (snap.exists) {
      member = { id: snap.id, ...(snap.data() as Omit<Member, "id">) };
      const rankSnap = await orgRef(org.id)
        .collection("ranks")
        .doc(member.rankId)
        .get();
      member.rankName = (rankSnap.data() as Rank | undefined)?.name;
    }
  }

  return (
    <div
      data-surface="portal"
      className="dark bg-background text-foreground"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <BrandStyle branding={branding} surface="portal" />
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
                rankName: member.rankName ?? "",
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
