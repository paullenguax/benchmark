# Benchmark Check — Claude instructions

ICAO English level screener for aviation candidates. React 19 + Vite (no TypeScript), Firebase (`ratersystem` project). Deploys to `lenguax.com/benchmark/` via GitHub Actions FTP on push to `main`.

## Key facts

- Firebase project is `lenguax-benchmark-32392` — a **separate** project from RaterSystemNew's `ratersystem`
- Firebase collections: `benchmark_items` (public read), `benchmark_results`/`benchmark_flags` (public create only — reads require Firebase Auth, admin-only)
- Item schema has three constructs (`vocabulary`/`structure`/`comprehension`) and two modalities (`reading`/`listening`, with `audioRef` as a Storage download URL)
- Admin UI lives in **RaterSystemNew** at `/benchmark`, not here — items are edited directly in Firestore there, `benchmark_items_v01.json` is a historical snapshot only, not re-seeded
- The standalone `/admin` page here is legacy, pending removal
- Brand colors `#00528C` / `#B3C8D9` (CSS variables, matches Accent Course)
- Vite base is `/benchmark/`
- Env vars needed: `VITE_FIREBASE_*` (6 vars) + `VITE_ADMIN_PASSWORD`

## After every build

After a successful `npm run build` in a session where code changes were made, update `README.md` to reflect any new features, routes, Firebase collection changes, or significant structural changes. Update the "Last updated" date at the bottom.
