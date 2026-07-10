import "server-only";
import {
  initializeApp,
  getApps,
  cert,
  type App,
  type AppOptions,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-brotherhood-portal";

function buildOptions(): AppOptions {
  // Against emulators the Admin SDK needs no credentials — it auto-detects
  // FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST / FIREBASE_STORAGE_EMULATOR_HOST.
  const options: AppOptions = {
    projectId: PROJECT_ID,
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
      `${PROJECT_ID}.appspot.com`,
  };
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (b64 && !process.env.FIRESTORE_EMULATOR_HOST) {
    options.credential = cert(
      JSON.parse(Buffer.from(b64, "base64").toString("utf8")),
    );
  }
  return options;
}

function getAdminApp(): App {
  return getApps()[0] ?? initializeApp(buildOptions());
}

export const adminApp = getAdminApp();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
export { FieldValue, Timestamp };

/** Root doc ref for an org. All org-scoped paths derive from here so a forged
 *  document id can never escape its tenant. */
export function orgRef(orgId: string) {
  return adminDb.collection("organizations").doc(orgId);
}
