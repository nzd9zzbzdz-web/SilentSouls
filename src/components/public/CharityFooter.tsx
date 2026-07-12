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
  return (
    <footer className="border-t border-[#D4AF37]/15 bg-[#080706] text-[#9c917a]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <p className="flex items-center gap-2.5 text-[#EDE6D3]">
            <Image
              src="/brand/club-patch.webp"
              alt=""
              width={520}
              height={600}
              unoptimized
              aria-hidden
              className="h-10 w-auto object-contain"
            />
            <span className="text-lg" style={{ fontFamily: "var(--font-display)" }}>{name}</span>
          </p>
          {tagline && (
            <p className="mt-3 text-sm uppercase tracking-[0.14em] text-[#8f846d]">{tagline}</p>
          )}
        </div>
        <nav aria-label="Footer" className="text-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#D4AF37]">The Club</p>
          <ul className="space-y-2">
            <li><Link href={`${base}/about`} className="hover:text-[#EDE6D3]">About the Souls</Link></li>
            <li><Link href={`${base}/events`} className="hover:text-[#EDE6D3]">Rides &amp; Events</Link></li>
            <li><Link href={`${base}/join`} className="hover:text-[#EDE6D3]">Prospect With Us</Link></li>
            <li><Link href={`${base}/volunteer-resources`} className="hover:text-[#EDE6D3]">Member Login</Link></li>
          </ul>
        </nav>
        <div className="text-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#D4AF37]">Territory</p>
          <p>The Clubhouse, Sandy Shores</p>
          <p>San Andreas</p>
          <p className="mt-2">
            <Link href={`${base}/contact`} className="hover:text-[#EDE6D3]">Send word</Link>
          </p>
        </div>
      </div>
      <div className="border-t border-[#D4AF37]/10 py-4 text-center text-xs text-[#6e6550]">
        © {new Date().getFullYear()} {name}. Ride free.
      </div>
    </footer>
  );
}
