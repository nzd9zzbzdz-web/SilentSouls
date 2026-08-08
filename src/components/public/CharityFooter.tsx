import Image from "next/image";
import Link from "next/link";

export function CharityFooter({
  orgSlug,
  name,
  tagline,
}: {
  orgSlug: string;
  name: string;
  tagline?: string;
}) {
  const base = `/${orgSlug}`;
  // Deliberately NOT glass — the footer is the calm end of the cover story.
  // Just an ember-tinted hairline up top, mixed from the tenant's primary so
  // a rebrand recolors it for free.
  return (
    <footer className="border-t [border-top-color:color-mix(in_srgb,var(--primary)_18%,transparent)] bg-background text-muted-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <p className="flex items-center gap-2.5 text-foreground">
            <Image
              src="/brand/club-patch.webp"
              alt=""
              width={720}
              height={1080}
              unoptimized
              aria-hidden
              className="h-32 w-auto object-contain"
            />
            <span className="text-lg" style={{ fontFamily: "var(--font-display)" }}>{name}</span>
          </p>
          {tagline && (
            <p className="mt-3 text-sm uppercase tracking-[0.14em] text-muted-foreground">{tagline}</p>
          )}
        </div>
        <nav aria-label="Footer" className="text-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">The Club</p>
          <ul className="space-y-2">
            <li><Link href={`${base}/about`} className="hover:text-foreground">About the Ravens</Link></li>
            <li><Link href={`${base}/events`} className="hover:text-foreground">Rides &amp; Events</Link></li>
            <li><Link href={`${base}/join`} className="hover:text-foreground">Prospect With Us</Link></li>
            <li><Link href={`${base}/volunteer-resources`} className="hover:text-foreground">Member Login</Link></li>
          </ul>
        </nav>
        <div className="text-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Territory</p>
          <p>The Clubhouse, Sandy Shores</p>
          <p>San Andreas</p>
          <p className="mt-2">
            <Link href={`${base}/contact`} className="hover:text-foreground">Send word</Link>
          </p>
        </div>
      </div>
      <div className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground/70">
        © {new Date().getFullYear()} {name}. Ride free.
      </div>
    </footer>
  );
}
