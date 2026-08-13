import { z } from "zod";
import { MAX_TREASURY_AMOUNT } from "@/lib/constants";

export const treasuryTxKindSchema = z.enum(["dues", "deposit", "withdrawal"]);

/**
 * A money ticket. Amounts are whole positive dollars; the kind carries the
 * direction, so nobody types a minus sign.
 *
 * The note is required for deposits and withdrawals — money moving needs to
 * say what for — but optional for dues, which describe themselves.
 */
export const submitTreasuryTxSchema = z
  .object({
    orgId: z.string().min(1),
    kind: treasuryTxKindSchema,
    amount: z
      .number()
      .int("Whole dollars only")
      .min(1, "The amount must be at least $1")
      .max(
        MAX_TREASURY_AMOUNT,
        `That is over the $${MAX_TREASURY_AMOUNT.toLocaleString("en-US")} ceiling`,
      ),
    note: z.string().max(300, "Keep the note under 300 characters").default(""),
    /**
     * Whose movement this is. Omitted ⇒ the submitter themselves. Only a
     * treasury reviewer may name someone else, and only for DUES (cash handed
     * over in person) — the action enforces both, not this schema.
     */
    subjectMemberId: z.string().min(1).optional(),
  })
  .superRefine((input, ctx) => {
    if (input.kind !== "dues" && input.note.trim().length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["note"],
        message:
          input.kind === "withdrawal"
            ? "Say what the money is for"
            : "Say where the money came from",
      });
    }
  });
export type SubmitTreasuryTxInput = z.infer<typeof submitTreasuryTxSchema>;

export const reviewTreasuryTxSchema = z.object({
  orgId: z.string().min(1),
  txId: z.string().min(1),
  decision: z.enum(["approved", "denied"]),
  reviewNote: z.string().max(1000).optional(),
});
export type ReviewTreasuryTxInput = z.infer<typeof reviewTreasuryTxSchema>;
