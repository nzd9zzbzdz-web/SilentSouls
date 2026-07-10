import { notFound } from "next/navigation";
import { Flag, History as HistoryIcon, Home, Trophy, Users } from "lucide-react";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { Card, CardContent } from "@/components/ui/card";
import { requireOrgRole } from "@/lib/auth/session";
import { getOrgBySlug } from "@/lib/tenant";
import { orgRef } from "@/lib/firebase/admin";
import type { TimelineEntry } from "@/lib/types";
import type { Timestamp } from "firebase-admin/firestore";

const ICONS: Record<string, typeof Flag> = {
  flag: Flag,
  home: Home,
  users: Users,
  trophy: Trophy,
};

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  await requireOrgRole(org.id, "member");

  const snap = await orgRef(org.id)
    .collection("timeline")
    .orderBy("date", "desc")
    .limit(50)
    .get();
  const entries = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<TimelineEntry, "id">),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <DisplayHeading className="text-3xl text-primary">Timeline</DisplayHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          The history of the brotherhood, written as it happens.
        </p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <HistoryIcon className="mx-auto size-10 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-sm text-muted-foreground">
              History starts with the first milestone.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ol className="relative space-y-6 border-l border-primary/30 pl-6">
          {entries.map((entry) => {
            const Icon = ICONS[entry.icon ?? ""] ?? Flag;
            const date = (entry.date as Timestamp)?.toDate?.();
            return (
              <li key={entry.id} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[35px] flex size-5 items-center justify-center rounded-full border border-primary/50 bg-card"
                >
                  <Icon className="size-3 text-primary" />
                </span>
                <time className="text-xs uppercase tracking-wider text-muted-foreground">
                  {date?.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
                <h2
                  className="mt-1 text-xl text-primary"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {entry.title}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {entry.description}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
