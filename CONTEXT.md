# Benchmark Check — Project Context v0.4

## What we are building

A self-administered, browser-based **reading comprehension screener** for aviation English candidates. It reports an indicative ICAO language proficiency level (Below 4 / 4 / 5 / 6).

This assesses reading comprehension only at B1–C1 band (ICAO 4–6), using aviation-themed stimulus material for face validity. It does **not** assess speaking, writing, pronunciation or fluency.

**Intended use:** A free tool offered to aviation training centres to help them quickly assess whether a candidate needs extensive training or just a final polish before their ICAO test.

---

## Current build phase: Trial (v0.1)

The trial collects response data on all 80 reading items to validate item difficulty before building adaptive logic.

**The trial version:**
- Randomly assigns each candidate to Form A or Form B (40 items each, balanced by band and construct)
- Presents the 40 items in a randomised order
- Collects candidate name, email, and self-reported ICAO level at the start (all optional)
- Stores every item response (item ID, option selected, correct/incorrect, flag comment) to Firestore
- Allows candidates to flag any item with a short comment ("What seems wrong with this question?")
- Displays a results screen at the end with indicative band and per-construct breakdown

**What the trial version does NOT include:**
- Adaptive logic (post-trial, after item difficulty is validated)
- Candidate accounts or authentication (admin now authenticates — see Firestore security rules)

Comprehension items and listening/audio items are supported end-to-end as of 2026-07-18 but have no authored content yet (0 comprehension items, 0 audio items in the live 80-item bank).

---

## Assessment design

- **MCQ throughout** — fully machine-scorable
- **Two modalities (eventually):** reading and listening, roughly equally weighted. Trial is reading only.
- **Difficulty controlled by language variables** (vocabulary frequency, clause complexity, inference depth)
- **Plain English focus**, not standard phraseology
- **Distractors** constructed on linguistic grounds — wrong collocation, wrong aspect, wrong register

---

## Item bank

**File:** `src/data/benchmark_items_v01.json` — source of truth for seeding Firestore.

**80 reading items total:**
- Band 4: 29 items (B1 — operational minimum)
- Band 5: 34 items (B2 — extended proficiency)
- Band 6: 17 items (C1 — expert proficiency)
- Construct split: 37 vocabulary, 43 structure

**Form split (40 items per form, balanced by band and construct):**

| | Band 4 | Band 5 | Band 6 | Total |
|---|---|---|---|---|
| Form A | 15 (8 vocab, 7 struct) | 17 (7 vocab, 10 struct) | 8 (4 vocab, 4 struct) | 40 |
| Form B | 14 (7 vocab, 7 struct) | 17 (7 vocab, 10 struct) | 9 (4 vocab, 5 struct) | 40 |

**Item schema (JSON / Firestore):**
```json
{
  "id": "new_001",
  "source": "new",
  "band": 4,
  "construct": "vocabulary",
  "modality": "reading",
  "form": "A",
  "stem": "Select the most appropriate word to complete the sentence…",
  "stimulus": null,
  "audioRef": null,
  "options": ["option A", "option B", "option C", "option D"],
  "correct": 0,
  "feedback": "Explanation shown after answering",
  "active": true,
  "flagged": false,
  "notes": "",
  "correctedAt": null
}
```

- `correct` is a **0-based index** into the `options` array
- `form` is `"A"` or `"B"` — fixed at item level, assigned during item bank creation
- `construct` is `vocabulary`, `structure`, or **`comprehension`** (added 2026-07-18) — comprehension items use `stimulus` for a short passage/NOTAM/exchange plus one question about it
- `audioRef` (listening items) holds a full Firebase Storage download URL, uploaded via RaterSystemNew's item editor
- `active: false` items are excluded from the trial pool — flip an item inactive while investigating a flag, flip back on once fixed
- `notes` field: use to record revision history (e.g. "Stem reworded 2026-07-01 after 3 flags")
- `correctedAt`: set by "Mark corrected" in RaterSystemNew's Item Analysis tab; used to compute a "responses since correction" stat separate from all-time stats

**Editing items:** items are edited directly in Firestore via RaterSystemNew's `/benchmark` item editor (admin only) — this is now the source of truth. `benchmark_items_v01.json` is a historical snapshot of the initial 80-item seed and is **no longer re-seeded or treated as authoritative**; don't hand-edit it expecting it to reach Firestore.

---

## Firestore data model

**Project:** `lenguax-benchmark-32392`

### Collection: `benchmark_items`
Mirrors the JSON schema above. Seeded from `benchmark_items_v01.json` via the admin page ("↑ Seed from JSON" button). Re-seed after any item edits.

### Collection: `benchmark_results`
One document per completed test:
```
/{resultId}
  timestamp: serverTimestamp()
  mode: "trial"
  form: "A" | "B"
  candidateName: string
  candidateEmail: string
  selfReportedLevel: "4" | "5" | "6" | "unsure" | "none" | ""
  responses: [
    { itemId, band, construct, selected, correct, flagComment }
  ]
  scores: {
    band4: { correct, total },
    band5: { correct, total },
    band6: { correct, total },
    vocabulary: { correct, total },
    structure: { correct, total },
    totalCorrect, totalItems, indicativeLevel
  }
```

### Collection: `benchmark_flags`
One document per flag submission (also stored inline in `responses`):
```
/{flagId}
  timestamp: serverTimestamp()
  itemId: string
  comment: string
  candidateEmail: string | null
```

---

## Indicative level scoring (trial version)

| Score | Indicative level |
|---|---|
| < 40% overall | Below 4 |
| 40–59% overall | Level 4 |
| 60–79% overall | Level 5 |
| 80%+ overall | Level 6 |

Per-band and per-construct scores are stored separately for post-trial validity analysis.

---

## Trialling plan

The trial is shared with:
1. Candidates who have already done a Lenguax speaking test (known ICAO level — most valuable for validation)
2. Training centre contacts who send it to their students
3. Target spread: Level 4, 5 and 6 candidates

**Minimum useful sample:** 15–20 per form to spot broken items. 40–50 per form to start seeing difficulty patterns.

**Validity analysis (post-trial):**
For each item: proportion correct overall, and split by self-reported ICAO level.
- Items where Level 4 and Level 6 candidates score identically → no discriminative work → review
- Items where Level 6 candidates score lower than Level 4 → probably ambiguous → check flag comments

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Database | Firebase Firestore (`lenguax-benchmark-32392`) |
| Hosting | lenguax.com/benchmark/ (SiteGround / Apache) |
| Deployment | GitHub Actions → FTP to SiteGround |
| Admin view | RaterSystem → Benchmark page (reads from same Firestore project) |

**No backend server.** Firebase handles all data. The React app builds to static files deployed via FTP.

---

## React app structure

```
src/
  components/
    TrialPlayer.jsx        — flat 40-item player, form assignment, flag handling
    QuestionCard.jsx       — renders stem, options, flag button + inline form
    TrialResultsScreen.jsx — end screen with overall + band + construct breakdown
    TestPlayer.jsx         — adaptive 3-phase player (not used in trial)
    ResultsScreen.jsx      — adaptive results (not used in trial)
    AudioPlayer.jsx        — plays audioRef (a Storage download URL) via a plain <audio> element
  pages/
    Home.jsx               — intro, candidate registration form, routes to /trial
    Trial.jsx              — fetches items from Firestore, renders TrialPlayer
    TrialResults.jsx       — renders TrialResultsScreen
    Admin.jsx              — password-gated admin: results, item analysis, item bank
    Test.jsx               — adaptive test page (not used in trial)
    Results.jsx            — adaptive results page (not used in trial)
  firebase/
    config.js              — Firebase initialisation (lenguax-benchmark-32392)
    items.js               — fetchItems(), fetchAllItems(), updateItem(), seedItemsFromJson()
    results.js             — saveTrialResult(), saveFlag(), fetchTrialResults(), fetchFlags()
  data/
    benchmark_items_v01.json   — item bank source of truth (used for seeding)
  App.jsx                  — routes: / /trial /trial-results /admin /test /results
  main.jsx
```

---

## Admin pages

### RaterSystem → Benchmark page (`lenguax.com/ratersystem/benchmark`) — the supported admin surface
Same Firestore project, connected via a named secondary Firebase app (`benchmarkDb`/`benchmarkAuth`/`benchmarkStorage`), authenticated via `mintBenchmarkAdminToken` (see rules section above). Three tabs:
- **Results** — all trial submissions: candidate, form, self-reported level, score, indicative level, flag count, date; link a result to a person record in RaterSystem for validity correlation
- **Item analysis** — per-item stats: attempts, % correct (red <30%, green >85%), flag count + comments, "Mark corrected" action (sets `correctedAt`), and a "since correction" stat computed only from responses after that timestamp. Filterable by form, sortable by ID / difficulty / flags
- **Item bank** — full CRUD editor matching the real item schema exactly (`stem`/`form`/index-based `correct`/`stimulus`/`audioRef` with upload/`notes`), a construct×form coverage summary, active/inactive toggle

### Benchmark admin (`lenguax.com/benchmark/admin`) — removed 2026-07-18
Used to be a password-gated standalone admin in this repo, duplicating the RaterSystemNew tabs above but reading/writing unauthenticated. Deleted (`Admin.jsx` + its route + the admin-only Firestore helpers in `firebase/items.js`/`firebase/results.js`) once RaterSystemNew's admin was confirmed working in production — it would have been broken anyway once `benchmark_results`/`benchmark_flags` reads started requiring `request.auth != null`. `VITE_ADMIN_PASSWORD` is no longer read anywhere in this app; the GitHub Actions secret can be removed whenever convenient.

---

## Deployment pipeline

- Repo: `github.com/paullenguax/benchmark`
- Local: `/home/paul/Programs/Benchmark Check/`
- GitHub Action: `.github/workflows/deploy.yml`
- Deploys to: `lenguax.com/public_html/benchmark/`
- Trigger: push to `main` branch
- Vite base path: `/benchmark/` in `vite.config.js`
- Apache SPA routing: `public/.htaccess` rewrites all paths to `index.html`

**GitHub Actions secrets required:**
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_ADMIN_PASSWORD
FTP_HOST  FTP_USERNAME  FTP_PASSWORD
```

---

## Firestore security rules

Source of truth: `firestore.rules` / `storage.rules` in this repo (`firebase.json` points at project `lenguax-benchmark-32392`). Deploy with `firebase deploy --only firestore:rules,storage:rules`.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /benchmark_items/{id} {
      allow read: if true;
      allow write: if true;   // trial period — no auth yet
    }
    match /benchmark_results/{id} {
      allow create: if true;                        // candidates submit anonymously
      allow read, update, delete: if request.auth != null;   // admin only
    }
    match /benchmark_flags/{id} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

`benchmark_results`/`benchmark_flags` hold candidate PII (name/email), so admin reads require Firebase Auth in this project. RaterSystemNew bridges its own admin's identity in via the `mintBenchmarkAdminToken` Cloud Function (defined in `RaterSystemNew/functions/index.js`), which mints a custom token for this project after checking `people/{uid}.role === 'admin'` in `ratersystem`. `BenchmarkPage.tsx` signs into a secondary `benchmarkAuth` connection with that token before querying.

---

## Final test structure (adaptive — post-trial)

Build after item difficulty is validated from trial data.

| Phase | Items | Pool | Purpose |
|---|---|---|---|
| Phase 1 | 10 | Random from Band 4 | Baseline |
| Phase 2 | 10–15 | Adaptive — based on Phase 1 score | Targets right difficulty band |
| Phase 3 | 5–8 | Confirmation items from indicated band | Confirms placement |

**Phase 2 routing:**

| Phase 1 score | Phase 2 pool |
|---|---|
| 0–4 / 10 | Stay in Band 4, flag likely below operational |
| 5–7 / 10 | Band 4–5 boundary items |
| 8–10 / 10 | Band 5–6 items |

---

## Listening items

Audio upload (RaterSystemNew item editor → Storage) and playback (`AudioPlayer.jsx`) are wired up as of 2026-07-18 — `modality: "listening"` items work the same as reading items with an `audioRef` (full Storage download URL). Planned listening item types, not yet authored:
- Mishearing / phonological confusion (numbers, callsigns)
- Implicit meaning / inference (short exchanges)
- Paraphrase recognition (spoken phrase to written options)
- Non-standard / plain English comprehension (unusual situations)

---

## Current status

- [x] React + Vite scaffold
- [x] Firebase SDK installed, pointing at `lenguax-benchmark-32392`
- [x] GitHub Actions deploy pipeline (push to main → live)
- [x] Apache `.htaccess` for SPA routing
- [x] Item bank: 80 items seeded live in Firestore (37 vocabulary / 43 structure, 40/40 Form A/B) — confirmed via direct query 2026-07-18
- [x] Trial player: flat 40-item flow with form assignment, shuffle, flag mechanism
- [x] Results screen: overall score, per-band and per-construct breakdown (now including comprehension), form badge
- [x] Firestore writes: results and flags
- [x] RaterSystem `/benchmark` admin: schema-correct item editor (matches live data exactly), results, item analysis with flag/correction tracking — the supported admin surface
- [x] Admin auth bridge: `mintBenchmarkAdminToken` Cloud Function + `request.auth != null` rules on results/flags
- [x] Comprehension construct: schema, scoring, and UI support added 2026-07-18 — **no comprehension items authored yet** (0 of 80 items), needs content
- [x] Listening items: audio upload (RaterSystemNew) + playback (`AudioPlayer.jsx`) wired up 2026-07-18 — no audio items authored yet
- [x] Flag → correct tracking: `active` toggle for immediate exposure control, `correctedAt` + "Mark corrected" + since-correction stat for tracking fresh data after a fix
- [x] Standalone `/admin` page removed 2026-07-18 — RaterSystemNew is the sole admin surface now
- [ ] Adaptive test logic (post-trial)
