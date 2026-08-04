import type { AwardedPatch, Patch, ServiceRecordEntry } from "@/lib/types";

/**
 * Pure resolver: (join date + patch awards + stored career log) → the rows the
 * Service Record panel renders, newest first.
 *
 * The club records a member's history in three places and never joined them up:
 * the `serviceRecord` subcollection (rank/role changes, written by the member
 * actions), `awardedPatches`, and the join date on the member doc. This merges
 * them as a derived view rather than backfilling a fourth collection — so it
 * works for members who joined years ago and can never drift from the awards.
 *
 * No I/O, no framework: unit-testable, same as buildRenderModel.
 */

export type ServiceRecordKind = "joined" | "patch" | "promotion" | "removal";

export interface ServiceRecordItem {
  id: string;
  kind: ServiceRecordKind;
  title: string;
  detail?: string;
  dateLabel: string;
  dateISO: string;
}

export interface ServiceRecordInput {
  memberNumber: number;
  joinDate?: unknown; // Timestamp | Date
  awards: AwardedPatch[];
  patchById: Map<string, Patch>;
  career: ServiceRecordEntry[];
}

const DATE_FMT: Intl.DateTimeFormatOptions = {
  month: "long",
  day: "numeric",
  year: "numeric",
};

/** Same-timestamp ordering, top to bottom. Joining is always the floor. */
const TIE_ORDER: Record<ServiceRecordKind, number> = {
  removal: 0,
  promotion: 1,
  patch: 2,
  joined: 3,
};

/** Firestore Timestamp or Date → Date. Anything else (a pending server
 *  timestamp reads back null) drops the row rather than dating it to 1970. */
function toDate(value: unknown): Date | null {
  const ts = value as { toDate?: () => Date } | Date | undefined;
  if (ts instanceof Date) return ts;
  if (typeof ts?.toDate === "function") return ts.toDate();
  return null;
}

function row(
  id: string,
  kind: ServiceRecordKind,
  title: string,
  detail: string | undefined,
  at: unknown,
): (ServiceRecordItem & { atMs: number }) | null {
  const date = toDate(at);
  if (!date) return null;
  return {
    id,
    kind,
    title,
    detail: detail || undefined,
    dateLabel: date.toLocaleDateString("en-US", DATE_FMT),
    dateISO: date.toISOString(),
    atMs: date.getTime(),
  };
}

export function composeServiceRecord(input: ServiceRecordInput): ServiceRecordItem[] {
  const { memberNumber, joinDate, awards, patchById, career } = input;

  const rows = [
    row("joined", "joined", "Joined the club", `Member #${memberNumber}.`, joinDate),
    ...awards.map((award) => {
      const patch = patchById.get(award.patchId);
      return row(
        `award-${award.id}`,
        "patch",
        `Earned the "${patch?.name ?? award.patchId}" patch`,
        award.reason || patch?.description,
        award.awardedAt,
      );
    }),
    ...career.map((item) => row(item.id, item.kind, item.title, item.detail, item.at)),
  ].filter((r): r is ServiceRecordItem & { atMs: number } => r !== null);

  // Newest first, and on a tie the join sinks to the bottom: same-day rows are
  // common (a patch awarded the day someone is patched in, or demo data dated
  // to the join), and "Joined the club" sitting on top of its own consequences
  // reads as if they joined last.
  rows.sort((a, b) => b.atMs - a.atMs || TIE_ORDER[a.kind] - TIE_ORDER[b.kind]);

  return rows.map(({ atMs: _atMs, ...item }) => item);
}
