@AGENTS.md

# Brotherhood Portal Platform

Multi-tenant GTA RP organization management platform. First tenant: **Silent Souls MC**
(public face: "Silent Souls Community Foundation" — a deliberately legitimate-looking
charity site; the real product is the private portal behind /volunteer-resources login).

## Running locally (everything on emulators — no Firebase account needed)

```powershell
npm run emulators   # Firebase emulator suite (auth 9099, firestore 8080, storage 9199, UI 4000)
npm run seed        # resets + seeds Silent Souls org, 6 members, 15 patches, demo data
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
- Custom claims: `{ superAdmin?, orgs: { [orgId]: { r: role, m: memberId } } }`.
  Changed ONLY via `syncUserClaims()` which also revokes refresh tokens.
- Session cookie verified with `verifySessionCookie(cookie, true)` in
  `[orgSlug]/portal/layout.tsx`. `src/proxy.ts` (Next 16 middleware rename) checks
  cookie presence only — firebase-admin cannot run there.
- Patch awards use composite doc ids `memberId_patchId` ⇒ idempotent. The engine
  (`src/lib/patch-engine.ts`) is a single transaction: ALL reads before writes.
- Officer-only data lives in **subcollections** (`members/*/notes`) — rules can't
  hide fields on a parent doc.
- **No hardcoded brand colors/names in components.** Branding comes from
  `organizations/{orgId}/branding/{public|portal}` docs → `<BrandStyle>` injects
  CSS vars scoped to `[data-surface]`. Silent Souls values are seed data only.
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
