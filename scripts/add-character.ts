/**
 * Add (or replace) a member's character render for the character screen.
 *
 *   npm run add-character -- <image> <memberId> [orgId]
 *   e.g. npm run add-character -- "C:\renders\six.png" m-six
 *
 * Accepts any PNG/JPG/WebP. If the image has a baked-in checkerboard or a
 * light studio background, it is keyed out automatically (flood fill from the
 * edges, so light areas inside the figure survive). Output lands at
 * public/brand/members/<memberId>.webp — the convention the seed picks up —
 * and the live member doc's photoPath is updated when Firestore is reachable.
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import sharp from "sharp";

const [, , inputPath, memberId, orgIdArg] = process.argv;
const ORG_ID = orgIdArg ?? "silent-souls";

if (!inputPath || !memberId) {
  console.error('Usage: npm run add-character -- <image> <memberId> [orgId]');
  process.exit(1);
}

const OUT = `public/brand/members/${memberId}.webp`;

async function keyOutBackground(
  data: Buffer,
  width: number,
  height: number,
): Promise<{ cleared: number }> {
  // Background = light, near-gray pixel (checkerboard tiles / white studio).
  const isLight = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mn > 170 && mx - mn < 18;
  };

  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx] || !isLight(x, y)) return;
    visited[idx] = 1;
    stack.push(idx);
  };
  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y); }

  let cleared = 0;
  while (stack.length) {
    const idx = stack.pop()!;
    const x = idx % width, y = (idx - x) / width;
    data[idx * 4 + 3] = 0;
    cleared++;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }

  // Feather the cut edge so the figure doesn't look razor-clipped.
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (data[idx * 4 + 3] === 0) continue;
      if (visited[idx - 1] || visited[idx + 1] || visited[idx - width] || visited[idx + width]) {
        data[idx * 4 + 3] = 150;
      }
    }
  }
  return { cleared };
}

async function main() {
  const src = sharp(inputPath).ensureAlpha();
  const { data, info } = await src
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // Already transparent at the borders? Then it's pre-keyed — leave it alone.
  let borderOpaque = 0;
  for (let x = 0; x < width; x += 4) {
    if (data[x * 4 + 3] > 250) borderOpaque++;
    if (data[((height - 1) * width + x) * 4 + 3] > 250) borderOpaque++;
  }
  const needsKeying = borderOpaque > width / 8;

  if (needsKeying) {
    const { cleared } = await keyOutBackground(data, width, height);
    console.log(`keyed out ${cleared} background pixels (${Math.round((cleared / (width * height)) * 100)}%)`);
  } else {
    console.log("image already has transparency — skipping background keying");
  }

  await sharp(data, { raw: { width, height, channels: 4 } })
    .resize({ height: Math.min(height, 1254), fit: "inside" })
    .webp({ quality: 88 })
    .toFile(OUT);
  console.log(`wrote ${OUT}`);

  // Best effort: point the live member doc at the new art (emulator or live).
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    try {
      const { initializeApp, getApps } = await import("firebase-admin/app");
      const { getFirestore } = await import("firebase-admin/firestore");
      const projectId =
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-brotherhood-portal";
      const app = getApps()[0] ?? initializeApp({ projectId });
      const db = getFirestore(app);
      const ref = db.doc(`organizations/${ORG_ID}/members/${memberId}`);
      const snap = await ref.get();
      if (snap.exists) {
        await ref.update({ photoPath: `/brand/members/${memberId}.webp` });
        console.log(`updated ${ORG_ID}/${memberId} photoPath in Firestore`);
      } else {
        console.log(`member ${memberId} not found in Firestore — run npm run seed (the convention picks the file up)`);
      }
    } catch (e) {
      console.log(`Firestore update skipped (${(e as Error).message}) — re-seed to apply`);
    }
  } else {
    console.log("no Firestore configured — file written; npm run seed will pick it up");
  }
}

main();
