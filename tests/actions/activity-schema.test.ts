/**
 * Submit-schema bounds. Quantity carries raw amounts now — dollars of dirty
 * money, months served — not a count of submissions, so the old cap of 50
 * rejected any realistic cash log with an unhelpful "Invalid input".
 */
import { describe, expect, it } from "vitest";
import { submitActivitySchema } from "@/lib/schemas/activity";
import { MAX_ACTIVITY_QUANTITY } from "@/lib/constants";

const base = {
  orgId: "silent-souls",
  typeId: "drugs-cooked",
  date: new Date("2026-08-03"),
  description: "Cooked Brick of Coke",
  witnesses: [],
};

describe("submitActivitySchema quantity", () => {
  it("accepts the log that used to fail", () => {
    // The exact submission from the bug report: Drugs Cooked, quantity 100.
    expect(submitActivitySchema.safeParse({ ...base, quantity: 100 }).success).toBe(true);
  });

  it("accepts a realistic cash amount", () => {
    const res = submitActivitySchema.safeParse({
      ...base,
      typeId: "dirty-money-earned",
      quantity: 250_000,
    });
    expect(res.success).toBe(true);
  });

  it("still rejects zero, negatives and fractions", () => {
    for (const quantity of [0, -5, 1.5]) {
      expect(submitActivitySchema.safeParse({ ...base, quantity }).success).toBe(false);
    }
  });

  it("rejects above the cap with a message that names the limit", () => {
    const res = submitActivitySchema.safeParse({
      ...base,
      quantity: MAX_ACTIVITY_QUANTITY + 1,
    });
    expect(res.success).toBe(false);
    // The member has to be told what the limit is, not just "Invalid input".
    expect(res.error!.issues[0].message).toContain("10,000,000");
  });
});
