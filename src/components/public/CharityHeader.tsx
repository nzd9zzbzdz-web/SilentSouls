"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { HeartHandshake, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
  { href: "/volunteer-resources", label: "Volunteer Resources" },
  { href: "/join", label: "Get Involved" },
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
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href={base}
          className="flex min-h-11 items-center gap-2 font-semibold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <HeartHandshake className="size-6 text-primary" aria-hidden />
          <span className="text-lg">{name}</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const href = `${base}${item.href}`;
            const active =
              item.href === "" ? pathname === base : pathname.startsWith(href);
            return (
              <Link
                key={item.href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors duration-200",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href={`${base}/donate`}
            className="ml-2 flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90"
          >
            Donate
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-11 cursor-pointer items-center justify-center rounded-md text-foreground hover:bg-muted md:hidden"
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      {open && (
        <nav aria-label="Mobile" className="border-t border-border px-4 pb-4 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={`${base}${item.href}`}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={`${base}/donate`}
            onClick={() => setOpen(false)}
            className="mt-2 flex min-h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground"
          >
            Donate
          </Link>
        </nav>
      )}
    </header>
  );
}
