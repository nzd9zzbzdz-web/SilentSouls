import { NextResponse } from "next/server";

// TEMPORARY diagnostic — remove after debugging the Vercel 500.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const out: Record<string, unknown> = {};
  try {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64 ?? "";
    out.hasB64 = b64.length > 0;
    out.b64len = b64.length;
    out.projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null;
    out.useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS ?? null;
    out.emuHost = process.env.FIRESTORE_EMULATOR_HOST ?? null;
    // Does the b64 decode + parse?
    try {
      const parsed = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      out.saParseOk = true;
      out.saProject = parsed.project_id;
      out.saClientEmail = parsed.client_email;
      out.saKeyHasNewlines = String(parsed.private_key).includes("\n");
    } catch (e) {
      out.saParseOk = false;
      out.saParseError = String((e as Error)?.message);
    }
    const { adminDb } = await import("@/lib/firebase/admin");
    const snap = await adminDb
      .collection("organizations")
      .where("slug", "==", "silent-souls")
      .limit(1)
      .get();
    out.queryOk = true;
    out.empty = snap.empty;
    out.docs = snap.size;
  } catch (e) {
    out.error = String((e as Error)?.stack ?? (e as Error)?.message ?? e).slice(0, 2500);
  }
  return NextResponse.json(out);
}
