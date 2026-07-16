/**
 * Non-destructive rebrand: merge the Ravens of Death org name + portal/public
 * branding docs into an existing org WITHOUT wiping members, activities, cut,
 * or any other data (unlike `npm run seed`, which recursiveDeletes first).
 *
 * Use this to apply a name/theme change to a live emulator (or production) that
 * already has real data in it.
 *
 * Emulator:  npx tsx scripts/apply-branding.ts   (FIRESTORE_EMULATOR_HOST in .env.local)
 * Live:      set FIREBASE_SERVICE_ACCOUNT_B64 + NEXT_PUBLIC_FIREBASE_PROJECT_ID, then run.
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Branding } from "../src/lib/types";

const PROJECT_ID =
  process.env.PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-brotherhood-portal";
const ORG_ID = process.env.ORG_ID ?? "silent-souls";

if (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
  console.error("No emulator host and no live credentials configured.");
  process.exit(1);
}

const db = getFirestore(getApps()[0] ?? initializeApp({ projectId: PROJECT_ID }));

const portalBranding: Branding = {
  colors: {
    background: "#050407",
    foreground: "#EEE7E8",
    card: "#151017",
    cardForeground: "#EEE7E8",
    primary: "#D9362B",
    primaryForeground: "#EEE7E8",
    secondary: "#2D111F",
    secondaryForeground: "#EEE7E8",
    muted: "#2D111F",
    mutedForeground: "#B8A0A5",
    accent: "#54213F",
    accentForeground: "#EEE7E8",
    destructive: "#941B22",
    border: "rgba(148,27,34,0.28)",
    input: "rgba(148,27,34,0.40)",
    ring: "#D9362B",
  },
  fonts: {
    display: "var(--font-blackletter)",
    body: "var(--font-inter)",
    mono: "var(--font-jetbrains)",
  },
  orgDisplayName: "Ravens of Death MC",
  tagline: "San Andreas",
  characterStagePath: "/brand/character-stage.webp",
};

const publicBranding: Branding = {
  colors: {
    background: "#050407",
    foreground: "#EEE7E8",
    card: "#151017",
    cardForeground: "#EEE7E8",
    primary: "#D9362B",
    primaryForeground: "#EEE7E8",
    secondary: "#2D111F",
    secondaryForeground: "#EEE7E8",
    muted: "#2D111F",
    mutedForeground: "#B8A0A5",
    accent: "#54213F",
    accentForeground: "#EEE7E8",
    destructive: "#941B22",
    border: "rgba(148,27,34,0.22)",
    input: "rgba(148,27,34,0.32)",
    ring: "#D9362B",
  },
  fonts: {
    display: "var(--font-blackletter)",
    body: "var(--font-inter)",
  },
  logoPath: "/brand/silent-souls-banner.webp",
  heroImagePath: "/brand/silent-souls-hero.webp",
  orgDisplayName: "Ravens of Death MC",
  tagline: "Brotherhood · Loyalty · Respect · Death",
  mission:
    "We are the Ravens. We ride where others fear to, bound by loyalty and blood. Death rides beside us — but so does honor, and no brother of ours ever rides alone.",
};

(async () => {
  const target = process.env.FIRESTORE_EMULATOR_HOST ? "EMULATOR" : "LIVE";
  const org = db.collection("organizations").doc(ORG_ID);
  await org.set(
    { name: "Ravens of Death MC San Andreas", publicName: "Ravens of Death Community Foundation" },
    { merge: true },
  );
  await org.collection("branding").doc("portal").set(portalBranding, { merge: true });
  await org.collection("branding").doc("public").set(publicBranding, { merge: true });
  console.log(`Applied Ravens of Death branding → ${target} · ${PROJECT_ID} · org ${ORG_ID}`);
  console.log("(name + publicName + portal/public branding merged; no other data touched)");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
