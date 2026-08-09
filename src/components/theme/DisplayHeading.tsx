import { cn } from "@/lib/utils";

/**
 * The ONLY component allowed to use the org display font (blackletter on the
 * portal, serif on the public site). Keeps decorative type out of body text.
 */
export function DisplayHeading({
  as: Tag = "h1",
  className,
  children,
}: {
  as?: "h1" | "h2" | "h3";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={cn("tracking-wide", className)}
      style={{ fontFamily: "var(--font-display)" }}
    >
      {children}
    </Tag>
  );
}
