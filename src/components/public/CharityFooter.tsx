import Link from "next/link";
import { HeartHandshake } from "lucide-react";

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
  return (
    <footer className="border-t border-border bg-secondary">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <p
            className="flex items-center gap-2 font-semibold text-secondary-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <HeartHandshake className="size-5 text-primary" aria-hidden />
            {name}
          </p>
          {tagline && (
            <p className="mt-2 text-sm text-muted-foreground">{tagline}</p>
          )}
        </div>
        <nav aria-label="Footer" className="text-sm">
          <p className="mb-3 font-semibold text-secondary-foreground">Get Involved</p>
          <ul className="space-y-2">
            <li>
              <Link href={`${base}/donate`} className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                Make a Donation
              </Link>
            </li>
            <li>
              <Link href={`${base}/events`} className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                Upcoming Events
              </Link>
            </li>
            <li>
              <Link href={`${base}/volunteer-resources`} className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                Volunteer Resources
              </Link>
            </li>
          </ul>
        </nav>
        <div className="text-sm text-muted-foreground">
          <p className="mb-3 font-semibold text-secondary-foreground">Contact</p>
          <p>Legion Square Community Center</p>
          <p>Los Santos, San Andreas</p>
          <p className="mt-2">
            <Link href={`${base}/contact`} className="underline-offset-4 hover:text-primary hover:underline">
              Send us a message
            </Link>
          </p>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {name}. All rights reserved.
      </div>
    </footer>
  );
}
