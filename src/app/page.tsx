import { redirect } from "next/navigation";

/**
 * Platform root — until custom domains (M9), send visitors to one org.
 *
 * Which org is deployment configuration, not a code constant: a second club on
 * its own deployment sets DEFAULT_ORG_SLUG rather than editing this file, and a
 * deployment hosting several clubs picks whichever should own the bare domain.
 */
export default function RootPage() {
  redirect(`/${process.env.DEFAULT_ORG_SLUG ?? "silent-souls"}`);
}
