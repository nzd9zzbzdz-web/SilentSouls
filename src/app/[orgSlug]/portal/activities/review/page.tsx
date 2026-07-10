import { notFound } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { DisplayHeading } from "@/components/theme/DisplayHeading";
import { ReviewQueue } from "@/components/portal/ReviewQueue";
import { requireOrgRole } from "@/lib/auth/session";
import { getOrgBySlug } from "@/lib/tenant";
import {
  listActivities,
  listActivityTypes,
  listMembers,
} from "@/lib/queries";
import type { Timestamp } from "firebase-admin/firestore";

export default async function ReviewQueuePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  await requireOrgRole(org.id, "officer");

  const [pending, types, members] = await Promise.all([
    listActivities(org.id, { status: "pending", limit: 50 }),
    listActivityTypes(org.id),
    listMembers(org.id),
  ]);
  const typeById = new Map(types.map((t) => [t.id, t]));
  const memberById = new Map(members.map((m) => [m.id, m]));

  const items = pending.map((activity) => ({
    id: activity.id,
    memberName: memberById.get(activity.memberId)?.roadName ?? "Unknown",
    memberFullName: memberById.get(activity.memberId)?.displayName ?? "",
    typeName: typeById.get(activity.typeId)?.name ?? activity.typeId,
    statKey: activity.statKey,
    date: (activity.date as Timestamp)?.toDate?.().toISOString() ?? "",
    description: activity.description,
    quantity: activity.quantity,
    witnesses: activity.witnesses
      .map((id) => memberById.get(id)?.roadName)
      .filter(Boolean) as string[],
    hasProof: Boolean(activity.proofPath),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <DisplayHeading className="flex items-center gap-3 text-3xl text-primary">
          <ClipboardCheck className="size-7" aria-hidden />
          Review Queue
        </DisplayHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length === 0
            ? "All caught up."
            : `${items.length} submission${items.length === 1 ? "" : "s"} awaiting judgment. Approvals update stats and award patches automatically.`}
        </p>
      </div>

      <ReviewQueue orgId={org.id} items={items} />
    </div>
  );
}
