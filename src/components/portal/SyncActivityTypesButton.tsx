"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { syncDefaultActivityTypes } from "@/actions/activity-types";

/**
 * Admin one-click: add any shipped activity types this org is missing. Orgs
 * only get the seed list on a destructive reseed, so types added after the org
 * was created — the criminal-record ones, say — need a way in.
 */
export function SyncActivityTypesButton({ orgId }: { orgId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSync() {
    startTransition(async () => {
      const result = await syncDefaultActivityTypes(orgId);
      if (!result.ok) {
        toast.error(result.error ?? "Could not sync activity types");
        return;
      }
      const { created, membersMigrated } = result.data!;
      if (created.length === 0 && membersMigrated === 0) {
        toast.success("Already up to date — nothing to add");
      } else {
        const parts = [];
        if (created.length > 0) parts.push(`Added ${created.length}: ${created.join(", ")}`);
        if (membersMigrated > 0) parts.push(`${membersMigrated} rap sheet(s) moved to stats`);
        toast.success(parts.join(" · "));
      }
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={handleSync}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <RefreshCw className="size-4" aria-hidden />
      )}
      {pending ? "Syncing…" : "Add missing default types"}
    </Button>
  );
}
