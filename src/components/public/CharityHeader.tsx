"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href?: string };

// Items without `href` are shown as labels only until their pages exist.
const NAV: NavItem[] = [
  { href: "", label: "Home" },
  { href: "/about", label: "About" },
  { label: "Brotherhood" },
  { label: "Chapters" },
  { href: "/gallery", label: "Media" },
  { href: "/join", label: "Join Us" },
  { href: "/contact", label: "Contact" },
];

export function CharityHeader({
  orgSlug,
  name,
}: {
  orgSlug: string;
  name: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const base = `/${orgSlug}`;

  return (
    <header className="sticky top-0 z-40 border-b border-[#941B22]/15 bg-[#050407]/95 backdrop-blur">
      {/* Oversized club patch pinned to the far-left edge of the header,
          overhanging the bar onto the hero. z-10 keeps it above the nav;
          lg:pl on the bar reserves room so links never slide under it. */}
      <Link
        href={base}
        aria-label={name}
        onClick={() => {
          if (pathname === base) window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className="absolute left-4 top-2 z-10"
      >
        <Image
          src="/brand/club-patch.webp"
          alt={name}
          width={520}
          height={600}
          priority
          unoptimized
          className="h-32 w-auto object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.7)] sm:h-40 md:h-52 lg:h-60"
        />
      </Link>
      <div className="mx-auto flex h-24 max-w-6xl items-center justify-end gap-4 px-4 md:h-28 lg:pl-[240px]">
        <nav aria-label="Main" className="relative z-20 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            if (item.href === undefined) {
              return (
                <span
                  key={item.label}
                  aria-disabled
                  title="Coming soon"
                  className="flex min-h-11 cursor-default items-center px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#B8A0A5]"
                >
                  {item.label}
                </span>
              );
            }
            const href = `${base}${item.href}`;
            const active =
              item.href === "" ? pathname === base : pathname.startsWith(href);
            return (
              <Link
                key={item.label}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (href === pathname)
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn(
                  "flex min-h-11 items-center px-3 text-xs font-semibold uppercase tracking-[0.14em] transition-colors duration-200",
                  active
                    ? "text-[#D9362B] underline decoration-[#941B22] decoration-2 underline-offset-[6px]"
                    : "text-[#B8A0A5] hover:text-[#EEE7E8]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href={`${base}/volunteer-resources`}
            className="ml-3 flex min-h-11 items-center rounded-sm border border-[#941B22]/70 px-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#D9362B] transition-colors duration-200 hover:bg-[#D9362B] hover:text-[#EEE7E8]"
          >
            Member Login
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-11 items-center justify-center rounded-sm text-[#EEE7E8] hover:bg-white/5 lg:hidden"
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      {open && (
        <nav aria-label="Mobile" className="relative z-20 border-t border-[#941B22]/15 bg-[#050407] px-4 pb-4 lg:hidden">
          {NAV.map((item) =>
            item.href !== undefined ? (
              <Link
                key={item.label}
                href={`${base}${item.href}`}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-sm px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#EEE7E8] hover:bg-white/5"
              >
                {item.label}
              </Link>
            ) : (
              <span
                key={item.label}
                aria-disabled
                className="flex min-h-11 items-center px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#6f6656]"
              >
                {item.label}
              </span>
            ),
          )}
          <Link
            href={`${base}/volunteer-resources`}
            onClick={() => setOpen(false)}
            className="mt-2 flex min-h-11 items-center justify-center rounded-sm border border-[#941B22]/70 px-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#D9362B]"
          >
            Member Login
          </Link>
        </nav>
      )}
    </header>
  );
}
