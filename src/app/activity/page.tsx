import { ActivityClient } from "./ActivityClient";

/**
 * The Discord Activity's entry point: one URL, launched inside Discord's
 * iframe, which resolves the viewer's club from their linked account rather
 * than from a slug in the path. That is why it sits OUTSIDE `[orgSlug]` and
 * outside the portal layout: there is no session cookie here (an Activity's
 * cookies are partitioned into their own jar) and no slug to read.
 *
 * The client id is passed down rather than published as a NEXT_PUBLIC var, so
 * the value stays in one place with the rest of the Discord configuration.
 */
export const metadata = {
  title: "Brotherhood Portal",
};

export default function ActivityPage() {
  return <ActivityClient clientId={process.env.DISCORD_APPLICATION_ID ?? ""} />;
}
