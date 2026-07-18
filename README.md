# Benchmark Check

ICAO reading comprehension screener for aviation candidates (trial phase). Part of the Lenguax product suite.

**Live:** `lenguax.com/benchmark/`

## What it does

Candidates are randomly assigned Form A or Form B (40 items each) and answer a flat, shuffled sequence of multiple-choice items across three constructs — Vocabulary, Structure, Comprehension (passage + question) — plus reading and listening modalities. Candidates can flag any item with a comment. Results show an indicative ICAO level (below 4, 4, 5, or 6) with a per-band and per-construct breakdown. No login required for candidates.

## Tech stack

- React 19 + Vite (no TypeScript)
- Firebase (Firestore + Storage) — **`lenguax-benchmark-32392`** project (a separate Firebase project from RaterSystemNew's `ratersystem`)
- React Router v7
- Brand colors `#00528C` / `#B3C8D9` via CSS variables
- Deployed to SiteGround via GitHub Actions FTP on push to `main`

## Firebase collections

| Collection | Who writes | Who reads |
|---|---|---|
| `benchmark_items` | Admin (via RaterSystemNew) | Public (candidate app) |
| `benchmark_results` | Public (candidate app, create only) | Admin (everyone) or a centre account (only its own `centreId`) |
| `benchmark_flags` | Public (candidate app, create only) | Admin only |
| `centre_accounts` | Admin only | The account owner, or admin |

Audio for listening items lives in Storage under `benchmark-audio/` (public read, admin-only write) — see `firestore.rules`/`storage.rules` in this repo.

## Item schema (`benchmark_items`)

```json
{
  "id": "new_001",
  "source": "new",
  "band": 4,
  "construct": "vocabulary | structure | comprehension",
  "modality": "reading | listening",
  "form": "A | B",
  "stem": "Select the most appropriate word to complete the sentence…",
  "stimulus": null,
  "audioRef": null,
  "options": ["…", "…", "…", "…"],
  "correct": 0,
  "feedback": "Explanation shown after answering",
  "active": true,
  "flagged": false,
  "notes": "",
  "correctedAt": null
}
```

- `correct` is a 0-based index into `options`
- `stimulus` holds a short passage/NOTAM/exchange — used by comprehension items (and optionally others)
- `audioRef` is a full Storage download URL for listening items
- `active: false` immediately removes an item from the candidate pool (used while investigating a flagged item)
- `correctedAt` is set by "Mark corrected" in RaterSystemNew's Item Analysis tab once a flagged item is fixed, so responses collected after the fix can be tracked separately from the all-time stats

## Local dev

```bash
npm install
npm run dev
```

Needs a `.env.local` file:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

(`VITE_ADMIN_PASSWORD` is no longer read anywhere in this app — the GitHub Actions secret can be removed whenever convenient.)

## Deployment

GitHub Actions on push to `main` → FTP to `lenguax.com/public_html/benchmark/`.

All env vars above must be set as GitHub Actions secrets. Also needs `FTP_HOST`, `FTP_USERNAME`, `FTP_PASSWORD`.

Firestore/Storage security rules for the `lenguax-benchmark-32392` project live in this repo (`firestore.rules`, `storage.rules`, `firebase.json`) — deploy with `firebase deploy --only firestore:rules,storage:rules`.

## Admin

Item management, results, and item analysis are handled inside RaterSystemNew at `/benchmark` (admin only) — this is the only admin surface; edit items there, not by hand-editing `benchmark_items_v01.json` and reseeding (that workflow is retired now that the real schema is editable directly). RaterSystemNew authenticates into this project via a Cloud Function (`mintBenchmarkAdminToken`) rather than reading the collections unauthenticated.

The standalone password-gated `/admin` page that used to live in this repo has been removed (2026-07-18) — it duplicated the RaterSystemNew tabs and had no auth bridge, so it broke once `benchmark_results`/`benchmark_flags` reads started requiring `request.auth != null`.

## Centres

Training centres can send the test to their own trainees and see only their own results — not everyone's — at `lenguax.com/benchmark/centre`. Set up:

1. **Give the centre a tagged link**: `lenguax.com/benchmark/?centre=<centre-id>` (pick a short slug, e.g. `oxford-aviation`). Every result submitted through that link is stamped with `centreId: "<centre-id>"`.
2. **Create their login** — no admin UI for this, it's a two-step manual process (same pattern as adding a senior rater in RaterSystemNew):
   - Firebase Console → `lenguax-benchmark-32392` project → Authentication → **Add user** (an email + password for the centre) → copy the UID it generates.
   - Firestore → `centre_accounts` collection → create a doc with that **UID as the document ID**, containing:
     ```json
     { "centreId": "oxford-aviation", "centreName": "Oxford Aviation Academy" }
     ```
     `centreId` must exactly match the slug you used in their link. `centreName` is just the display label shown in their portal.
3. **Give the centre their login + link.** They go to `lenguax.com/benchmark/centre`, sign in, and see a read-only table of their trainees' results (name, self-reported level, score, ICAO level, date) — nothing else, no other centre's data, no item bank, no flags.

One shared login per centre (not per staff member) keeps this to a two-minute setup. Enforcement is in Firestore's security rules, not just the page's own query — a centre login cannot fetch another centre's results even by inspecting/modifying network requests.

## Notes

- SiteGround caches aggressively — hard refresh (Ctrl+Shift+R) after deploys

## Last updated

2026-07-18 (added centre portal)
