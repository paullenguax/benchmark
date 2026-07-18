# Benchmark Check — Claude instructions

ICAO English level screener for aviation candidates. React 19 + Vite (no TypeScript), Firebase (`lenguax-benchmark-32392` project). Deploys to `lenguax.com/benchmark/` via GitHub Actions FTP on push to `main`.

## Key facts

- Firebase project is `lenguax-benchmark-32392` — a **separate** project from RaterSystemNew's `ratersystem`
- Firebase collections: `benchmark_items` (public read), `benchmark_results`/`benchmark_flags` (public create only — reads require Firebase Auth), `centre_accounts` (admin only, one doc per centre keyed by its Auth UID)
- Item schema has three constructs (`vocabulary`/`structure`/`comprehension`) and two modalities (`reading`/`listening`, with `audioRef` as a Storage download URL)
- Admin UI lives in **RaterSystemNew** at `/benchmark`, not here — items are edited directly in Firestore there, `benchmark_items_v01.json` is a historical snapshot only, not re-seeded
- There is no admin page in this repo anymore (removed 2026-07-18) — don't re-add one, it'll just drift out of sync with RaterSystemNew's again
- `/centre` is a *different* thing from admin — a read-only, scoped-to-one-centre login (see README's "Centres" section). `request.auth.token.admin == true` (set by RaterSystemNew's `mintBenchmarkAdminToken`) is what distinguishes an admin session from a centre login in `firestore.rules` — don't loosen `benchmark_results`/`benchmark_flags` rules without keeping that distinction
- Candidate links can carry `?centre=<id>` (read once in `Home.jsx`), which tags the result's `centreId` — untagged links are fine, they just mean "not attributed to a centre"
- Brand colors `#00528C` / `#B3C8D9` (CSS variables, matches Accent Course)
- Vite base is `/benchmark/`
- Env vars needed: `VITE_FIREBASE_*` (6 vars) — `VITE_ADMIN_PASSWORD` is no longer read anywhere, safe to drop

## After every build

After a successful `npm run build` in a session where code changes were made, update `README.md` to reflect any new features, routes, Firebase collection changes, or significant structural changes. Update the "Last updated" date at the bottom.
