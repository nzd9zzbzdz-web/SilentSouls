/**
 * The Service Record composer. Pure — no emulator needed.
 *
 * The panel is a derived view over three sources the club already records, so
 * the risks worth pinning are ordering, the mixed Timestamp/Date shapes coming
 * out of Firestore, and never rendering a row with a broken date.
 */
import { describe, expect, it } from "vitest";
import { composeServiceRecord } from "@/lib/service-record";
import type { AwardedPatch, Patch, ServiceRecordEntry } from "@/lib/types";

/** Stand-in for a firebase-admin Timestamp. */
const ts = (iso: string) => ({ toDate: () => new Date(iso) });

const patch = (id: string, name: string, description = ""): Patch =>
  ({ id, name, description }) as Patch;

const award = (
  id: string,
  patchId: string,
  at: string,
  reason?: string,
): AwardedPatch => ({ id, patchId, awardedAt: ts(at), reason }) as unknown as AwardedPatch;

const career = (
  id: string,
  title: string,
  at: string,
  kind: ServiceRecordEntry["kind"] = "promotion",
): ServiceRecordEntry => ({ id, kind, title, at: ts(at) }) as unknown as ServiceRecordEntry;

const base = {
  memberNumber: 4,
  joinDate: ts("2026-01-10T12:00:00Z"),
  awards: [],
  patchById: new Map<string, Patch>(),
  career: [],
};

describe("composeServiceRecord", () => {
  it("always anchors on the day they joined", () => {
    const items = composeServiceRecord(base);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "joined",
      title: "Joined the club",
      detail: "Member #4.",
    });
  });

  it("merges all three sources newest first", () => {
    const items = composeServiceRecord({
      ...base,
      awards: [award("a1", "road-warrior", "2026-03-02T00:00:00Z")],
      patchById: new Map([["road-warrior", patch("road-warrior", "Road Warrior")]]),
      career: [career("c1", "Rank changed to Head Enforcer", "2026-06-20T00:00:00Z")],
    });

    expect(items.map((i) => i.kind)).toEqual(["promotion", "patch", "joined"]);
    expect(items[1].title).toBe('Earned the "Road Warrior" patch');
  });

  it("falls back to the patch description when an award has no reason", () => {
    const patchById = new Map([["x", patch("x", "Iron Horse", "Log 50 club rides.")]]);
    const [item] = composeServiceRecord({
      ...base,
      joinDate: undefined,
      awards: [award("a1", "x", "2026-03-02T00:00:00Z")],
      patchById,
    });
    expect(item.detail).toBe("Log 50 club rides.");

    const [withReason] = composeServiceRecord({
      ...base,
      joinDate: undefined,
      awards: [award("a1", "x", "2026-03-02T00:00:00Z", "Held the line at Sandy Shores.")],
      patchById,
    });
    expect(withReason.detail).toBe("Held the line at Sandy Shores.");
  });

  it("still names a patch that was retired out of the catalogue", () => {
    // Retired patches keep their doc, but a deleted one shouldn't crash a profile.
    const [item] = composeServiceRecord({
      ...base,
      joinDate: undefined,
      awards: [award("a1", "ghost-patch", "2026-03-02T00:00:00Z")],
    });
    expect(item.title).toBe('Earned the "ghost-patch" patch');
  });

  it("drops rows whose date never resolved rather than dating them to 1970", () => {
    // A serverTimestamp() write reads back null until the write lands.
    const items = composeServiceRecord({
      ...base,
      career: [{ id: "c1", kind: "promotion", title: "Pending", at: null } as never],
    });
    expect(items.map((i) => i.id)).toEqual(["joined"]);
  });

  it("accepts a plain Date as well as a Timestamp", () => {
    const items = composeServiceRecord({
      ...base,
      joinDate: new Date("2026-01-10T12:00:00Z"),
    });
    expect(items[0].dateISO).toBe("2026-01-10T12:00:00.000Z");
    expect(items[0].dateLabel).toContain("2026");
  });

  it("sinks the join row below anything sharing its date", () => {
    // Common: a patch awarded the day someone is patched in — and the seeded
    // demo club backdates every award to the join date. "Joined the club" on
    // top of its own consequences would read as if they joined last.
    const sameDay = "2026-01-10T12:00:00Z";
    const items = composeServiceRecord({
      ...base,
      joinDate: ts(sameDay),
      awards: [award("a1", "x", sameDay)],
      patchById: new Map([["x", patch("x", "Prospect")]]),
      career: [career("c1", "Rank changed to Patched Member", sameDay)],
    });
    expect(items.map((i) => i.kind)).toEqual(["promotion", "patch", "joined"]);
  });
});
