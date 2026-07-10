import { notFound } from "next/navigation";
import { Landmark, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { requireOrgRole } from "@/lib/auth/session";
import { getOrgBySlug } from "@/lib/tenant";
import { orgRef } from "@/lib/firebase/admin";
import type { ClubEvent } from "@/lib/types";
import type { Timestamp } from "firebase-admin/firestore";

export default async function ChurchPage({
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
    .where("type", "==", "church")
    .orderBy("startAt", "desc")
    .limit(20)
    .get();
  const meetings = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ClubEvent, "id">),
  }));
  const now = Date.now();
  const next = meetings
    .filter((m) => (m.startAt as Timestamp).toMillis() >= now)
    .sort(
      (a, b) => (a.startAt as Timestamp).toMillis() - (b.startAt as Timestamp).toMillis(),
    )[0];
  const history = meetings.filter((m) => (m.startAt as Timestamp).toMillis() < now);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <DisplayHeading className="text-3xl text-primary">Church</DisplayHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          Mandatory means mandatory. Attendance counts toward your record.
        </p>
      </div>

      {next ? (
        <div className="texture-noise rounded-xl border border-primary/30 bg-card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Next meeting
          </p>
          <p
            className="mt-2 text-3xl text-primary"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {(next.startAt as Timestamp).toDate().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="mt-1 text-lg text-foreground">
            {(next.startAt as Timestamp).toDate().toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" aria-hidden />
            {next.location}
          </p>
          {next.description && (
            <p className="mt-3 text-sm text-muted-foreground">{next.description}</p>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <Landmark className="mx-auto size-9 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-sm text-muted-foreground">
              No church scheduled. The President will call it when it&apos;s time.
            </p>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <section aria-labelledby="church-history" className="space-y-3">
          <h2 id="church-history" className="text-lg font-semibold text-muted-foreground">
            Past meetings
          </h2>
          {history.map((meeting) => (
            <Card key={meeting.id}>
              <CardContent className="flex items-center justify-between">
                <p className="text-sm text-foreground">{meeting.title}</p>
                <time className="text-sm text-muted-foreground">
                  {(meeting.startAt as Timestamp).toDate().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Roll call and attendance tracking arrive with the events milestone.
      </p>
    </div>
  );
}
