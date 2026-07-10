import { notFound } from "next/navigation";
import { Calendar, MapPin } from "lucide-react";
import { orgRef } from "@/lib/firebase/admin";
import { getOrgBySlug } from "@/lib/tenant";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import type { ClubEvent } from "@/lib/types";
import type { Timestamp } from "firebase-admin/firestore";

export default async function PublicEventsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  // Only explicitly public events surface here — with sanitized copy.
  const snap = await orgRef(org.id)
    .collection("events")
    .where("visibility", "==", "public")
    .orderBy("startAt", "asc")
    .limit(25)
    .get();
  const events = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClubEvent, "id">) }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <DisplayHeading className="text-4xl text-foreground">Upcoming Events</DisplayHeading>
      <p className="mt-3 text-muted-foreground">
        Join us — every event is open to the community.
      </p>

      {events.length === 0 ? (
        <div className="mt-12 rounded-lg border border-border bg-card p-10 text-center">
          <Calendar className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-medium text-card-foreground">No events scheduled right now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check back soon — our next community drive is always around the corner.
          </p>
        </div>
      ) : (
        <ul className="mt-10 space-y-4">
          {events.map((event) => {
            const start = (event.startAt as Timestamp).toDate();
            return (
              <li key={event.id} className="rounded-lg border border-border bg-card p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold text-card-foreground">
                    {event.publicTitle ?? event.title}
                  </h2>
                  <time
                    dateTime={start.toISOString()}
                    className="text-sm font-medium text-primary"
                  >
                    {start.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    at{" "}
                    {start.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {event.publicDescription ?? ""}
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-4" aria-hidden />
                  {event.location}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
