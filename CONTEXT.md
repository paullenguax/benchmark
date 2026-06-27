# Benchmark Check — Project Context v0.3

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
- Audio/listening items (in development — reading items only)
- User accounts or authentication

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
  "options": ["option A", "option B", "option C", "option D"],
  "correct": 0,
  "feedback": "Explanation shown after answering",
  "active": true,
  "flagged": false,
  "notes": ""
}
```

- `correct` is a **0-based index** into the `options` array
- `form` is `"A"` or `"B"` — fixed at item level, assigned during item bank creation
- `active: false` items are excluded from the trial pool
- `notes` field: use to record revision history (e.g. "Stem reworded 2026-07-01 after 3 flags")

**Editing items:** Edit `benchmark_items_v01.json`, commit (git history is the audit trail), then re-seed via the admin page. The `notes` field surfaces in the Item Analysis tab so revision history is visible alongside flag data.

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
    AudioPlayer.jsx        — audio player stub (phase 2)
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

### Benchmark admin (`lenguax.com/benchmark/admin`)
Password-gated (VITE_ADMIN_PASSWORD). Three tabs:
- **Results** — all trial submissions: candidate, form, self-reported level, score, indicative level, flag count, date
- **Item analysis** — per-item stats: attempts, % correct (red <30%, green >85%), flag count, flag comments. Filterable by form, sortable by ID / difficulty / flags
- **Item bank** — list and edit items in Firestore; "↑ Seed from JSON" button to initialise or re-seed

### RaterSystem → Benchmark page
Same Firestore project, read via a named secondary Firebase app (`benchmarkDb`). Two tabs:
- **Results** — same data as benchmark admin, plus ability to link a result to a person record in RaterSystem for validity correlation
- **Item analysis** — same per-item stats
- **Item bank** — Firestore item list (uses adaptive schema; not relevant for trial)

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

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /benchmark_items/{id} {
      allow read: if true;
      allow write: if true;   // trial period — no auth yet
    }
    match /benchmark_results/{id} {
      allow write: if true;
      allow read: if false;
    }
    match /benchmark_flags/{id} {
      allow write: if true;
      allow read: if false;
    }
  }
}
```

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

## Listening items — phase 2 (not yet built)

Audio items will follow the trial. Planned types:
- Mishearing / phonological confusion (numbers, callsigns)
- Implicit meaning / inference (short exchanges)
- Paraphrase recognition (spoken phrase to written options)
- Non-standard / plain English comprehension (unusual situations)

Audio will be served from Firebase Storage. Listening items use the same schema with `modality: "listening"` and an `audioRef` field.

---

## Current status

- [x] React + Vite scaffold
- [x] Firebase SDK installed, pointing at `lenguax-benchmark-32392`
- [x] GitHub Actions deploy pipeline (push to main → live)
- [x] Apache `.htaccess` for SPA routing
- [x] Item bank: 80 items in `benchmark_items_v01.json` with form A/B assignments
- [x] Trial player: flat 40-item flow with form assignment, shuffle, flag mechanism
- [x] Results screen: overall score, per-band and per-construct breakdown, form badge
- [x] Firestore writes: results and flags
- [x] Admin page: results, item analysis, item bank with seed button
- [x] RaterSystem integration: Benchmark page reads from `lenguax-benchmark-32392`
- [ ] Firestore seeded with items (do via admin → Item bank → Seed from JSON)
- [ ] Adaptive test logic (post-trial)
- [ ] Listening items (post-trial)
