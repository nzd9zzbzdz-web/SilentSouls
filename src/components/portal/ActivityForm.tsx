"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ref, uploadBytes } from "firebase/storage";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getClientStorage } from "@/lib/firebase/client";
import { submitActivity } from "@/actions/activities";

interface TypeOption {
  id: string;
  name: string;
  requiresProof: boolean;
  allowQuantity: boolean;
}

export function ActivityForm({
  orgId,
  orgSlug,
  memberId,
  types,
  witnesses,
}: {
  orgId: string;
  orgSlug: string;
  memberId: string;
  types: TypeOption[];
  witnesses: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [typeId, setTypeId] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedWitnesses, setSelectedWitnesses] = useState<string[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const selectedType = types.find((t) => t.id === typeId);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!typeId) next.typeId = "Pick an activity type";
    if (!date) next.date = "Pick a date";
    if (description.trim().length < 10)
      next.description = "Describe what happened (at least 10 characters)";
    if (selectedType?.requiresProof && !proofFile)
      next.proof = `${selectedType.name} requires proof (photo or clip)`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function toggleWitness(id: string) {
    setSelectedWitnesses((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id].slice(0, 10),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      try {
        let proofPath: string | undefined;
        if (proofFile) {
          // Owner-scoped path enforced by Storage rules.
          proofPath = `orgs/${orgId}/proof/${memberId}/pending-${Date.now()}/${proofFile.name}`;
          await uploadBytes(ref(getClientStorage(), proofPath), proofFile, {
            contentType: proofFile.type,
          });
        }
        const result = await submitActivity({
          orgId,
          typeId,
          date: new Date(date),
          description: description.trim(),
          quantity,
          witnesses: selectedWitnesses,
          proofPath,
        });
        if (result.ok) {
          toast.success("Activity submitted for review");
          setTypeId("");
          setDescription("");
          setQuantity(1);
          setSelectedWitnesses([]);
          setProofFile(null);
          router.refresh();
        } else {
          toast.error(result.error ?? "Submission failed");
        }
      } catch {
        toast.error("Upload failed. Try again");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="activity-type">
          Activity type <span aria-hidden="true" className="text-destructive">*</span>
        </Label>
        <Select value={typeId} onValueChange={setTypeId}>
          <SelectTrigger
            id="activity-type"
            className="mt-1 w-full"
            aria-required="true"
            aria-invalid={Boolean(errors.typeId)}
            aria-describedby={errors.typeId ? "activity-type-error" : undefined}
          >
            <SelectValue placeholder="What did you do?" />
          </SelectTrigger>
          <SelectContent>
            {types.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.typeId && (
          <p id="activity-type-error" role="alert" className="mt-1 text-sm text-destructive">
            {errors.typeId}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="activity-date">
          Date <span aria-hidden="true" className="text-destructive">*</span>
        </Label>
        <Input
          id="activity-date"
          type="date"
          value={date}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1"
          required
          aria-required="true"
          aria-invalid={Boolean(errors.date)}
          aria-describedby={errors.date ? "activity-date-error" : undefined}
        />
        {errors.date && (
          <p id="activity-date-error" role="alert" className="mt-1 text-sm text-destructive">
            {errors.date}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="activity-description">
          What happened? <span aria-hidden="true" className="text-destructive">*</span>
        </Label>
        <Textarea
          id="activity-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            if (description && description.trim().length < 10)
              setErrors((prev) => ({
                ...prev,
                description: "Describe what happened (at least 10 characters)",
              }));
            else
              setErrors((prev) => {
                const { description: _drop, ...rest } = prev;
                return rest;
              });
          }}
          rows={3}
          maxLength={2000}
          placeholder="Route, who was there, what went down…"
          className="mt-1"
          required
          aria-required="true"
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "activity-description-error" : undefined}
        />
        {errors.description && (
          <p id="activity-description-error" role="alert" className="mt-1 text-sm text-destructive">
            {errors.description}
          </p>
        )}
      </div>

      {selectedType?.allowQuantity && (
        <div>
          <Label htmlFor="activity-quantity">Quantity</Label>
          <Input
            id="activity-quantity"
            type="number"
            min={1}
            max={50}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            className="mt-1 w-24"
          />
        </div>
      )}

      <fieldset>
        <legend className="text-sm font-medium">Witnesses</legend>
        <p className="text-xs text-muted-foreground">
          Who can vouch for this? (optional, up to 10)
        </p>
        <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
          {witnesses.map((witness) => (
            <label
              key={witness.id}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-1 text-sm hover:bg-secondary/40"
            >
              <Checkbox
                className="size-5"
                checked={selectedWitnesses.includes(witness.id)}
                onCheckedChange={() => toggleWitness(witness.id)}
              />
              {witness.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <Label htmlFor="activity-proof">
          Proof{" "}
          {selectedType?.requiresProof ? (
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">(optional)</span>
          )}
        </Label>
        {/* Focus lands on the sr-only input; surface it on the visible label. */}
        <label
          htmlFor="activity-proof"
          className="mt-1 flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring"
        >
          <Upload className="size-4" aria-hidden />
          {proofFile ? proofFile.name : "Photo or MP4 clip, up to 10 MB"}
        </label>
        <input
          id="activity-proof"
          type="file"
          accept="image/*,video/mp4"
          className="sr-only"
          aria-invalid={Boolean(errors.proof)}
          aria-describedby={errors.proof ? "activity-proof-error" : undefined}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            if (file && file.size > 10 * 1024 * 1024) {
              setErrors((prev) => ({ ...prev, proof: "File is over 10 MB" }));
              return;
            }
            setProofFile(file);
            setErrors((prev) => {
              const { proof: _drop, ...rest } = prev;
              return rest;
            });
          }}
        />
        {errors.proof && (
          <p id="activity-proof-error" role="alert" className="mt-1 text-sm text-destructive">
            {errors.proof}
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? "Submitting…" : "Submit for review"}
      </Button>
    </form>
  );
}
