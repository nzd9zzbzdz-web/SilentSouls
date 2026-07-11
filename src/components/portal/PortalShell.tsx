"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Award,
  Calendar,
  ClipboardCheck,
  History,
  Image as ImageIcon,
  Landmark,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Palette,
  PenTool,
  Shield,
  Shirt,
  SlidersHorizontal,
  UserCheck,
  UserPlus,
  Users,
  Vote,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { SystemRole } from "@/lib/types";

const MAIN_NAV = [
  { href: "", label: "Dashboard", icon: LayoutDashboard },
  { href: "/brotherhood", label: "Brotherhood", icon: Users },
  { href: "/prospects", label: "Prospects", icon: UserPlus },
  { href: "/activities", label: "Activities", icon: Activity },
  { href: "/patch-wall", label: "Patch Wall", icon: Award },
  { href: "/my-cut", label: "My Cut", icon: Shirt },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/church", label: "Church", icon: Landmark },
  { href: "/votes", label: "Votes", icon: Vote },
  { href: "/timeline", label: "Timeline", icon: History },
  { href: "/gallery", label: "Gallery", icon: ImageIcon },
];

const OFFICER_NAV = [
  { href: "/activities/review", label: "Review Queue", icon: ClipboardCheck },
  { href: "/recruitment", label: "Recruitment", icon: UserCheck },
];

const ADMIN_NAV = [
  { href: "/admin", label: "Members", icon: Users },
  { href: "/admin/ranks", label: "Ranks", icon: Shield },
  { href: "/admin/activity-types", label: "Activity Types", icon: SlidersHorizontal },
  { href: "/admin/patches", label: "Patches", icon: ListChecks },
  { href: "/admin/vest", label: "Vest Designer", icon: PenTool },
  { href: "/admin/branding", label: "Branding", icon: Palette },
];

export function PortalShell({
  orgSlug,
  orgName,
  tagline,
  role,
  viewer,
  children,
}: {
  orgSlug: string;
  orgName: string;
  tagline?: string;
  role: SystemRole;
  viewer: { roadName: string; displayName: string; rankName: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/${orgSlug}/portal`;

  async function handleLogout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push(`/${orgSlug}`);
    router.refresh();
  }

  const isActive = (href: string) =>
    href === "" ? pathname === base : pathname.startsWith(`${base}${href}`);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-4 py-4">
          <Link href={base} className="block">
            <span
              className="block text-2xl leading-tight text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {orgName}
            </span>
            {tagline && (
              <span className="mt-0.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {tagline}
              </span>
            )}
          </Link>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Clubhouse</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {MAIN_NAV.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild isActive={isActive(item.href)}>
                      <Link href={`${base}${item.href}`}>
                        <item.icon aria-hidden />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {(role === "officer" || role === "admin") && (
            <SidebarGroup>
              <SidebarGroupLabel>Officer</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {OFFICER_NAV.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton asChild isActive={isActive(item.href)}>
                        <Link href={`${base}${item.href}`}>
                          <item.icon aria-hidden />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {role === "admin" && (
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {ADMIN_NAV.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          item.href === "/admin"
                            ? pathname === `${base}/admin`
                            : isActive(item.href)
                        }
                      >
                        <Link href={`${base}${item.href}`}>
                          <item.icon aria-hidden />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter>
          <SidebarSeparator />
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                &ldquo;{viewer.roadName}&rdquo;
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {viewer.rankName}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger aria-label="Toggle sidebar" />
          <span className="text-sm text-muted-foreground">{orgName}</span>
        </header>
        <div className="p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
