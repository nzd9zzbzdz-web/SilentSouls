"use client";

import { useTransition } from "react";
import { Loader2, Theater } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { applyDefaultCharacterStage } from "@/actions/character";

/** Admin one-click: apply the shipped character-stage art to portal branding. */
export function StageArtButton({ orgId }: { orgId: string }) {
  const [pending, startTransition] = useTransition();

  function handleApply() {
    startTransition(async () => {
      const result = await applyDefaultCharacterStage({ orgId });
      if (result.ok) {
        toast.success("Character stage art applied");
      } else {
        toast.error(result.error ?? "Could not update branding");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={handleApply}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Theater className="size-4" aria-hidden />
      )}
      {pending ? "Applying…" : "Use default stage art"}
    </Button>
  );
}
