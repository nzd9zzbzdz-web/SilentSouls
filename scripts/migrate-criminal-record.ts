/**
 * Make the character screen's Criminal Record live, without wiping anything.
 *
 * Two merge-only steps, both idempotent — safe to run against production and
 * safe to re-run:
 *   1. Upsert the six criminal-record activity types so members can log them.
 *   2. Fold any hand-authored `member.rapSheet` values into `member.stats`,
 *      which is what the panel now reads. Skips a member if the stat is
 *      already set, so re-running never double-counts or clobbers real logs.
 *
 * Emulator:  npx tsx scripts/migrate-criminal-record.ts
 * Live:      set FIREBASE_SERVICE_ACCOUNT_B64 + NEXT_PUBLIC_FIREBASE_PROJECT_ID, then run.
 * Add --dry to print what would change without writing.
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  ACTIVITY_TYPE_SEEDS,
  CRIMINAL_ACTIVITY_TYPE_SEEDS,
  CRIMINAL_RECORD_ROWS,
} from "../src/lib/constants";
import type { Member, RapSheetEntry, StatKey } from "../src/lib/types";

const PROJECT_ID =
  process.env.PROJECT_ID ??
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
  "demo-brotherhood-portal";
const ORG_ID = process.env.ORG_ID ?? "silent-souls";
const DRY = process.argv.includes("--dry");

if (
  !process.env.FIRESTORE_EMULATOR_HOST &&
  !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
  !process.env.FIREBASE_SERVICE_ACCOUNT_B64
) {
  console.error("No emulator host and no live credentials configured.");
  process.exit(1);
}

if (!getApps().length) {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  initializeApp(
    b64
      ? {
          credential: cert(JSON.parse(Buffer.from(b64, "base64").toString())),
          projectId: PROJECT_ID,
        }
      : { projectId: PROJECT_ID },
  );
}
const db = getFirestore();
const org = db.collection("organizations").doc(ORG_ID);

/** "96 mo" → 96 · "$2.4M" → 2400000 · "187" → 187 · anything else → null. */
function parseRapValue(raw: string): number | null {
  const text = raw.trim();
  const money = /^\$\s*([\d,.]+)\s*([KM])?$/i.exec(text);
  if (money) {
    const n = Number(money[1].replace(/,/g, ""));
    if (!Number.isFinite(n)) return null;
    const suffix = money[2]?.toUpperCase();
    return Math.round(n * (suffix === "M" ? 1_000_000 : suffix === "K" ? 1_000 : 1));
  }
  const plain = /^([\d,.]+)/.exec(text);
  if (!plain) return null;
  const n = Number(plain[1].replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

async function upsertActivityTypes(): Promise<void> {
  // Append after the existing club types so ordering stays stable.
  const base = ACTIVITY_TYPE_SEEDS.length;
  for (const [i, t] of CRIMINAL_ACTIVITY_TYPE_SEEDS.entries()) {
    const ref = org.collection("activityTypes").doc(t.id);
    const exists = (await ref.get()).exists;
    console.log(`  ${exists ? "update" : "create"} activityType ${t.id} (${t.name})`);
    if (DRY) continue;
    await ref.set(
      {
        name: t.name,
        statKey: t.statKey,
        requiresProof: t.requiresProof,
        allowQuantity: t.allowQuantity,
        defaultQuantity: 1,
        icon: t.icon,
        active: true,
        order: base + i + 1,
      },
      { merge: true },
    );
  }
}

async function migrateRapSheets(): Promise<void> {
  const rowByLabel = new Map(
    CRIMINAL_RECORD_ROWS.map((r) => [r.label.toLowerCase(), r.statKey]),
  );
  const snap = await org.collection("members").get();

  for (const doc of snap.docs) {
    const member = doc.data() as Member;
    const rapSheet = member.rapSheet;
    if (!rapSheet?.length) continue;

    const updates: Partial<Record<StatKey, number>> = {};
    for (const entry of rapSheet as RapSheetEntry[]) {
      const statKey = rowByLabel.get(entry.label?.trim().toLowerCase() ?? "");
      if (!statKey) continue;
      // Never overwrite a stat that already has a value — approved logs win.
      if ((member.stats?.[statKey] ?? 0) > 0) continue;
      const value = parseRapValue(String(entry.value ?? ""));
      if (value === null || value === 0) continue;
      updates[statKey] = value;
    }

    if (Object.keys(updates).length === 0) continue;
    console.log(`  ${doc.id} (${member.roadName}): ${JSON.stringify(updates)}`);
    if (DRY) continue;
    await doc.ref.set(
      {
        stats: { ...(member.stats ?? {}), ...updates },
      },
      { merge: true },
    );
  }
}

async function main() {
  console.log(
    `${DRY ? "[dry run] " : ""}Criminal record migration → ${PROJECT_ID} · org ${ORG_ID}`,
  );
  console.log("Activity types:");
  await upsertActivityTypes();
  console.log("Rap sheets → stats:");
  await migrateRapSheets();
  console.log(DRY ? "Dry run complete — nothing written." : "Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
