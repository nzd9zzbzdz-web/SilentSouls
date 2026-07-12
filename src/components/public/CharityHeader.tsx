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
    <header className="sticky top-0 z-40 border-b border-[#D4AF37]/15 bg-[#0a0908]/95 backdrop-blur">
      <div className="mx-auto flex h-24 max-w-6xl items-center justify-between gap-4 px-4 md:h-28">
        <Link href={base} aria-label={name} className="flex items-center">
          <Image
            src="/brand/club-patch.webp"
            alt={name}
            width={520}
            height={600}
            priority
            unoptimized
            className="h-20 w-auto object-contain md:h-24"
          />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            if (!item.href) {
              return (
                <span
                  key={item.label}
                  aria-disabled
                  title="Coming soon"
                  className="flex min-h-11 cursor-default items-center px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#9c917a]"
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
                className={cn(
                  "flex min-h-11 items-center px-3 text-xs font-semibold uppercase tracking-[0.14em] transition-colors duration-200",
                  active
                    ? "text-[#D4AF37] underline decoration-[#D4AF37] decoration-2 underline-offset-[6px]"
                    : "text-[#9c917a] hover:text-[#EDE6D3]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href={`${base}/volunteer-resources`}
            className="ml-3 flex min-h-11 items-center rounded-sm border border-[#D4AF37]/70 px-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#D4AF37] transition-colors duration-200 hover:bg-[#D4AF37] hover:text-[#1a1408]"
          >
            Member Login
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-11 items-center justify-center rounded-sm text-[#EDE6D3] hover:bg-white/5 lg:hidden"
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      {open && (
        <nav aria-label="Mobile" className="border-t border-[#D4AF37]/15 px-4 pb-4 lg:hidden">
          {NAV.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={`${base}${item.href}`}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-sm px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#EDE6D3] hover:bg-white/5"
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
            className="mt-2 flex min-h-11 items-center justify-center rounded-sm border border-[#D4AF37]/70 px-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#D4AF37]"
          >
            Member Login
          </Link>
        </nav>
      )}
    </header>
  );
}
