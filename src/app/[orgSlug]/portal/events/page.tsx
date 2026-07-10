import { notFound } from "next/navigation";
import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { requireOrgRole } from "@/lib/auth/session";
import { getOrgBySlug } from "@/lib/tenant";
import { orgRef } from "@/lib/firebase/admin";
import type { ClubEvent } from "@/lib/types";
import type { Timestamp } from "firebase-admin/firestore";

const TYPE_LABELS: Record<ClubEvent["type"], string> = {
  church: "Church",
  ride: "Club Ride",
  operation: "Operation",
  community: "Community",
};

export default async function EventsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  await requireOrgRole(org.id, "member");

  const snap = await orgRef(org.id)
    .collection("events")
    .orderBy("startAt", "desc")
    .limit(30)
    .get();
  const events = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ClubEvent, "id">),
  }));
  const now = Date.now();
  const upcoming = events
    .filter((e) => (e.startAt as Timestamp).toMillis() >= now)
    .sort(
      (a, b) => (a.startAt as Timestamp).toMillis() - (b.startAt as Timestamp).toMillis(),
    );
  const past = events.filter((e) => (e.startAt as Timestamp).toMillis() < now);

  const renderEvent = (event: ClubEvent & { id: string }) => {
    const start = (event.startAt as Timestamp).toDate();
    return (
      <Card key={event.id}>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">{event.title}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden />
              {event.location}
            </p>
          </div>
          <div className="text-right">
            <Badge variant={event.type === "church" ? "default" : "secondary"}>
              {TYPE_LABELS[event.type]}
            </Badge>
            <time dateTime={start.toISOString()} className="mt-1 block text-sm text-muted-foreground">
              {start.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </time>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <DisplayHeading className="text-3xl text-primary">Events</DisplayHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          Rides, church, operations, and community appearances. RSVP and attendance
          arrive with the events milestone.
        </p>
      </div>

      <section aria-labelledby="upcoming-heading" className="space-y-3">
        <h2 id="upcoming-heading" className="text-lg font-semibold text-foreground">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Calendar className="mx-auto size-9 text-muted-foreground" aria-hidden />
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing on the calendar. Enjoy the quiet — it won&apos;t last.
              </p>
            </CardContent>
          </Card>
        ) : (
          upcoming.map(renderEvent)
        )}
      </section>

      {past.length > 0 && (
        <section aria-labelledby="past-heading" className="space-y-3">
          <h2 id="past-heading" className="text-lg font-semibold text-muted-foreground">
            Past
          </h2>
          {past.map(renderEvent)}
        </section>
      )}
    </div>
  );
}
