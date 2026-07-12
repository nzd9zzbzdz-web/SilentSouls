/**
 * Flip an org's PUBLIC branding to the dark MC palette + copy.
 *
 * Emulator:  ORG_ID=silent-souls npx tsx scripts/update-public-branding.ts
 * Live:      GOOGLE_APPLICATION_CREDENTIALS=<sa.json> NEXT_PUBLIC_FIREBASE_PROJECT_ID=silent-souls \
 *            ORG_ID=silent-souls npx tsx scripts/update-public-branding.ts
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Branding } from "../src/lib/types";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-brotherhood-portal";
const ORG_ID = process.env.ORG_ID ?? "silent-souls";

if (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
  console.error("No emulator host and no live credentials configured.");
  process.exit(1);
}

const db = getFirestore(getApps()[0] ?? initializeApp({ projectId: PROJECT_ID }));

const publicBranding: Branding = {
  colors: {
    background: "#0A0908",
    foreground: "#EDE6D3",
    card: "#141009",
    cardForeground: "#EDE6D3",
    primary: "#D4AF37",
    primaryForeground: "#1A1408",
    secondary: "#171308",
    secondaryForeground: "#EDE6D3",
    muted: "#171308",
    mutedForeground: "#9C917A",
    accent: "#B91C1C",
    accentForeground: "#FAFAF9",
    destructive: "#DC2626",
    border: "rgba(212,175,55,0.14)",
    input: "rgba(212,175,55,0.22)",
    ring: "#D4AF37",
  },
  fonts: { display: "var(--font-blackletter)", body: "var(--font-inter)" },
  orgDisplayName: "Silent Souls MC",
  tagline: "Brotherhood · Loyalty · Respect · Silence",
  mission:
    "We are the silent ones. We ride in shadows, bound by loyalty and respect. Our souls may be silent, but our presence speaks louder than words.",
};

(async () => {
  const target = process.env.FIRESTORE_EMULATOR_HOST ? "EMULATOR" : "LIVE";
  await db
    .collection("organizations")
    .doc(ORG_ID)
    .collection("branding")
    .doc("public")
    .set(publicBranding);
  console.log(`Updated public branding → ${target} · ${PROJECT_ID} · org ${ORG_ID}`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
