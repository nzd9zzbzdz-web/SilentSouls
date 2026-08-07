@AGENTS.md

# Brotherhood Portal Platform

Multi-tenant GTA RP organization management platform. First tenant: **Ravens of Death MC**
(public face: "Ravens of Death Community Foundation"; the real product is the private
portal behind /volunteer-resources login). Renamed from "Silent Souls MC" 2026-07-15 —
the org slug is still `silent-souls` and demo emails are still @silentsouls.rp.

## Running locally (everything on emulators — no Firebase account needed)

```powershell
npm run emulators   # Firebase emulator suite (auth 9099, firestore 8080, storage 9199, UI 4000)
npm run seed        # DESTRUCTIVE: wipes + reseeds the org, 6 members, 15 patches, demo data
npm run dev         # Next.js on :3000  (or use dev.cmd which fixes PATH)
```

Demo logins (password `brotherhood`): reaper@silentsouls.rp (admin/President),
six@silentsouls.rp (officer), thorn@silentsouls.rp (officer), ledger@ / static@ (members),
patch@silentsouls.rp (prospect, 1 club run from Road Warrior), platform@brotherhood.app (super admin).

`npm test` = vitest (rules isolation + patch engine; requires emulators running).
`npm run typecheck` before committing.

## Architecture invariants — do not break

- **All mutations via Server Actions** (`src/actions/*`) using firebase-admin.
  Client SDK is read-only (sole exception: event RSVPs, shape-enforced in rules).
- Every action calls `requireOrgRole(orgId, minRole)` and scopes doc refs as
  `organizations/${orgId}/...` — never trust client-posted ids to cross tenants.
- **Never `router.refresh()` after a successful Server Action.** Every action
  `revalidatePath`s the pages it changes, and Next returns the re-rendered page
  in the action's own response — a refresh doubles the render and the session
  verification. An action must revalidate EVERY page whose data it touched
  (that's what makes this safe). Refresh only after plain `fetch()` to API
  routes (sign-in/out) or to restore server truth after a FAILED mutation
  (ClubMap pin drag).
- Custom claims: `{ superAdmin?, orgs: { [orgId]: { r: role, m: memberId } } }`.
  Changed ONLY via `syncUserClaims()` which also revokes refresh tokens.
- Session cookie verified with `verifySessionCookie(cookie, true)` in
  `[orgSlug]/portal/layout.tsx`. `src/proxy.ts` (Next 16 middleware rename) checks
  cookie presence only — firebase-admin cannot run there. `getSessionUser` is
  React-cache()d: the revocation check is an Auth-backend round trip, so it runs
  once per request no matter how many layouts/pages/actions ask.
- Patch awards use composite doc ids `memberId_patchId` ⇒ idempotent. The engine
  (`src/lib/patch-engine.ts`) is a single transaction: ALL reads before writes.
- **Emblems are patch docs that are never worn** (`patch.emblem === true`).
  The criminal record ships as five-rung ladders, one per `CRIMINAL_RECORD_ROWS`
  stat — 55 emblems, which would bury a vest. They are earned by the same
  engine, counted in `patchCount`, and shown as levels on the profile's
  **Emblems** tab; the cut never places them (`isWorn` in the engine, on both
  the approval and manual-award paths; `scripts/seed.ts` repeats the rule in
  `buildCutLayout`). Absent flag ⇒ worn, so every pre-emblem patch is unchanged.
  - `PATCH_LADDERS` in constants is the source; `CRIMINAL_PATCH_SEEDS` (55) is
    derived from it — never hand-list a tier. Emblems carry no real cut
    coordinates (`EMBLEM_PLACEMENT` is inert; `Patch` just requires the field).
  - `composeLadders` (`src/lib/patch-ladders.ts`) builds ladders from the org's
    OWN patch docs filtered to emblems, so admin edits and org-authored emblems
    slot in. Progress is measured across the current segment, never from zero.
  - Patch Wall = what you wear (club + manual patches) with an emblem summary
    linking to the profile. `composeServiceRecord` collapses each emblem ladder
    to its top rung but leaves worn patches alone — Road Warrior doesn't stop
    counting because Iron Rider followed it.
  - The 8 pre-ladder criminal patches keep their id/threshold/category/rarity;
    awards already granted must not change meaning. `syncDefaultActivityTypes`
    is the migration for live orgs — it flags them `emblem` (merge-only) and
    strips emblems off existing `cutLayouts`. Idempotent; awards untouched.
- **Patch/emblem artwork lives in `organizations/{orgId}/patchArt/{patchId}`**
  as a webp data URL (`uploadPatchArt`, admin-only, sharp → 256² contain with
  alpha kept, ≤64KB) — same no-Storage-bucket trick as character renders.
  A SIBLING collection on purpose: `listPatches` is read by the profile, wall,
  cut and admin, and sixty data URLs riding along would be megabytes per read.
  **Never read the blob into a page.** Pages call `listPatchArtVersions`
  (a `.select("updatedAt")` query — ids and timestamps, no images) and build
  `<img>` URLs with `patchArtUrl()`; the bytes stream from
  `/api/orgs/{orgId}/patches/{patchId}/art`, same pattern as the character
  render route. The `?v=` is the art's updatedAt, so the response is
  `immutable` and a re-upload lands at a new URL. `getCut` puts that URL in
  `patch.imagePath`, which the render model already reads. Art is always
  optional — every surface falls back to the lettered badge.
- Officer-only data lives in **subcollections** (`members/*/notes`) — rules can't
  hide fields on a parent doc.
- **No hardcoded brand colors/names in components.** Branding comes from
  `organizations/{orgId}/branding/{public|portal}` docs → `<BrandStyle>` injects
  CSS vars scoped to `[data-surface]`. Brand values are seed data only.
- **`scripts/lib/branding.ts` is the single source of truth** for org name +
  portal/public branding. seed/bootstrap/apply-branding/update-public-branding/
  migrate-cut all import it — never re-declare these values in a script (they
  drifted once and silently rewrote the old club name/palette over a rebrand).
- To rebrand a running instance WITHOUT wiping data (`npm run seed` recursiveDeletes
  first): `npx tsx scripts/apply-branding.ts` — merge-only. Emulator data is
  in-memory, so reapply after every restart.
- The character screen's **Criminal Record is derived from `member.stats`** via
  `CRIMINAL_RECORD_ROWS` — members log those rows as ordinary activities and an
  officer approves, same pipeline as a club run. `member.rapSheet` is the dead
  hand-authored predecessor; nothing reads it.
- **Seed changes don't reach existing orgs** — the seeder only runs on a
  destructive reseed. Admin → Activity Types flags drift and fixes it via
  `syncDefaultActivityTypes` (no CLI or credentials needed): adds missing
  types, deactivates `RETIRED_ACTIVITY_TYPE_IDS` / `RETIRED_PATCH_IDS`, installs
  `CRIMINAL_PATCH_SEEDS`, and folds legacy rapSheets into stats. Idempotent, and
  it never deletes — a retired type/patch keeps its doc so past submissions and
  already-earned awards still resolve a name. Existing types keep admin edits;
  a stat with an approved log behind it is never overwritten.
  Ranks have the same problem and the same fix: Admin → Ranks flags drift and
  `syncDefaultRanks` adds missing `DEFAULT_RANKS`, corrects `order`/`isOfficer`
  on the rest (merge — the name and tab art survive), and authors a cut visual
  per new rank from the colors the club already wears. Rank ids come from
  `rankDocId(name)` — load-bearing, since `member.rankId` points at them.
- **Rank `isOfficer` is club hierarchy, not permissions.** It drives roster
  tiering and cut visuals only; portal access is the role claim. Enforcer and
  Chaplain are titled members — they wear a tab but sit outside the officer
  table; Head Enforcer is the officer rank.
- The club activity set is **criminal-record-first**: only Club Ride and Church
  survive from the original 13 spec types. Retired stat keys stay in `STAT_KEYS`
  so historical values still render.
- Blackletter display font only via `<DisplayHeading>` / `var(--font-display)` —
  never in body text.
- Cut layouts store normalized u/v (0..1) coords per vest surface — designed for a
  future Three.js/R3F renderer; don't invent a different coordinate scheme.

## Roadmap state

M1 Foundation ✅ · M2 Members ✅ · M3 Activities ✅ · M4 Patch Engine ✅
M5 Prospects (write flows/votes) · M6 Events/RSVP/attendance · M7 Gallery/Timeline
M8 Digital Cut renderer · M9 Multi-tenant expansion (custom domains, org wizard,
impersonation) — all designed in the original plan; schema already supports them.

## Windows dev notes

- Node lives at `C:\Program Files\nodejs`; if a fresh shell can't find it:
  `$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")`
- shadcn CLI prompts hang headless shells — use `$env:CI="true"` and pass `-y`.
- Live Firebase later: fill `.env.local` keys, set `NEXT_PUBLIC_USE_EMULATORS=false`,
  add `FIREBASE_SERVICE_ACCOUNT_B64`. Deploy target: Vercel (Server Actions need Node;
  avoids Cloud Functions/Blaze).
