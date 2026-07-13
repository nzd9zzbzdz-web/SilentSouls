"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  removeCharacterRender,
  uploadCharacterRender,
} from "@/actions/character";

/**
 * Officer control under the character stage: upload (or remove) a member's
 * character render. Checkerboard/light backgrounds are keyed out server-side.
 */
export function CharacterArtUploader({
  orgId,
  memberId,
  hasCustomArt,
}: {
  orgId: string;
  memberId: string;
  hasCustomArt: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleFile(file: File | undefined) {
    if (!file) return;
    const formData = new FormData();
    formData.set("orgId", orgId);
    formData.set("memberId", memberId);
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadCharacterRender(formData);
      if (result.ok) {
        toast.success("Character model updated");
        router.refresh();
      } else {
        toast.error(result.error ?? "Upload failed");
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeCharacterRender({ orgId, memberId });
      if (result.ok) {
        toast.success("Character model removed");
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not remove");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => fileRef.current?.click()}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <ImageUp className="size-4" aria-hidden />
        )}
        {pending ? "Processing…" : "Upload character model"}
      </Button>
      {hasCustomArt && (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={handleRemove}
        >
          <Trash2 className="size-4" aria-hidden />
          Remove
        </Button>
      )}
    </div>
  );
}
