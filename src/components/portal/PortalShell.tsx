"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Award,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Map as MapIcon,
  Palette,
  PenTool,
  Shield,
  SlidersHorizontal,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
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

// Tabs hidden until their features are rolled out to the club (My Cut, Events,
// Church, Votes, Timeline, Gallery — routes still exist; restore entries from
// git history as each one launches).
const MAIN_NAV = [
  { href: "", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Club Map", icon: MapIcon },
  { href: "/brotherhood", label: "Brotherhood", icon: Users },
  { href: "/activities", label: "Log Activity", icon: Activity },
  { href: "/patch-wall", label: "Patch Wall", icon: Award },
  // Next to the wall on purpose: same emblems, ranked against the club.
  { href: "/standings", label: "Standings", icon: Trophy },
  { href: "/prospects", label: "Prospects", icon: UserPlus },
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

// Ember treatment for the active nav item, layered over the sidebar's quiet
// accent defaults from the call site so the shadcn primitives stay untouched.
// The left edge is an inset shadow, not a border, so the row doesn't shift a
// pixel when it activates; the second layer bleeds that edge into a soft glow.
const NAV_ACTIVE =
  "data-[active=true]:bg-primary/10 data-[active=true]:shadow-[inset_2px_0_0_var(--primary),inset_10px_0_14px_-12px_var(--primary)] [&[data-active=true]>svg]:text-primary";

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
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      className={NAV_ACTIVE}
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

          {(role === "officer" || role === "admin") && (
            <SidebarGroup>
              <SidebarGroupLabel>Officer</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {OFFICER_NAV.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        className={NAV_ACTIVE}
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
                        className={NAV_ACTIVE}
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
            {/* Quiet frosted chip — glass-hover's lift/ember edge is the hover
                feedback, so the old accent-bg hover goes. No underglow: leaving
                is not the action we want to advertise. */}
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="glass glass-hover flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:text-sidebar-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-background">
        {/* glass-panel owns the bg/blur/border; zero every edge but the bottom
            so it reads as the same hairline-under-header it always was. */}
        <header className="glass-panel sticky top-0 z-30 flex h-14 items-center gap-3 border-x-0 border-t-0 px-4">
          <SidebarTrigger aria-label="Toggle sidebar" />
          <span className="text-sm text-muted-foreground">{orgName}</span>
        </header>
        <div className="p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
