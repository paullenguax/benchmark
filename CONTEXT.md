# Benchmark Test — Project Context v0.2

## What we are building

A self-administered, browser-based **reading and listening comprehension screener** for aviation English candidates. It reports an indicative ICAO language proficiency level (Below 4 / 4 / 5 / 6).

This is essentially a standard English proficiency test at B1–C1 band (ICAO 4–6), dressed in aviation-themed stimulus material for face validity. It does **not** assess speaking, writing, pronunciation or fluency — honest scope is reading and listening comprehension only.

**Intended use:** A free sweetener offered to aviation training centres to help them quickly assess whether a candidate needs extensive training or just a final polish before their ICAO test.

---

## Current build phase: Trial version (v0.1)

The immediate goal is a **trial delivery tool** — not the final adaptive test. We need to get the item bank in front of real candidates quickly to collect response data and validate item difficulty before building adaptive logic.

**The trial version should:**
- Present all 80 reading items in a fixed, randomised-once-per-session order
- Collect candidate name, email, and self-reported ICAO level at the start
- Store every item response (item ID, option selected, correct/incorrect) to Firestore
- Show a per-item flag button ("?" icon) that lets candidates leave a short comment on any question
- Store flag comments against item IDs in Firestore
- Display a results screen at the end with indicative band and per-construct breakdown
- Look professional enough to share with training centre contacts

**What the trial version does NOT need:**
- Adaptive logic (comes later, after item difficulty is validated)
- Audio/listening items (these are in development — reading items only for now)
- User accounts or authentication
- An admin UI (Firebase console is fine for now)

---

## Assessment design

- **MCQ throughout** — no judgment rating, fully machine-scorable
- **Two modalities (eventually):** reading and listening, roughly equally weighted. Trial is reading only.
- **Difficulty controlled by language variables** (vocabulary frequency, clause complexity, inference depth) — not aviation knowledge complexity
- **Plain English focus**, not standard phraseology
- **Distractors** constructed on linguistic grounds — wrong collocation, wrong aspect, wrong register — so aviation knowledge cannot be used to eliminate them

---

## Final test structure (adaptive — post-trial)

| Phase | Items | Pool | Purpose |
|---|---|---|---|
| Phase 1 | 10 | Random selection from Band 4 items | Baseline |
| Phase 2 | 10–15 | Adaptive — based on Phase 1 score | Targets right difficulty band |
| Phase 3 | 5–8 | Confirmation items from indicated band | Confirms placement |

**Phase 2 routing logic:**

| Phase 1 score | Phase 2 pool |
|---|---|
| 0–4 / 10 | Stay in Band 4, flag likely below operational |
| 5–7 / 10 | Band 4–5 boundary items |
| 8–10 / 10 | Band 5–6 items |

This adaptive logic is NOT built in the trial version. Build it after item difficulty is validated from trial data.

---

## Item bank

**File:** `benchmark_items_v01.json` — place in `src/data/` in the React project.

**80 reading items total:**
- Band 4: 29 items (B1 — operational minimum)
- Band 5: 34 items (B2 — extended proficiency)
- Band 6: 17 items (C1 — expert proficiency)
- Construct split: 37 vocabulary, 43 structure

**Item schema:**
```json
{
  "id": "new_001",
  "source": "new",
  "band": 4,
  "construct": "vocabulary",
  "modality": "reading",
  "stem": "Select the most appropriate word...",
  "options": ["option A", "option B", "option C", "option D"],
  "correct": 0,
  "feedback": "Explanation shown after answering",
  "active": true,
  "flagged": false,
  "notes": ""
}
```

- `correct` is a **0-based index** into the `options` array
- `active: false` items should be excluded from the item pool
- `flagged` is set server-side when a candidate submits a flag comment — do not rely on this client-side field

---

## Firestore data model

### Collection: `items`
Mirrors the JSON schema above. Seed from `benchmark_items_v01.json` on first deploy.
The `active` flag allows items to be retired without deletion — important for later validity analysis.

### Collection: `results`
One document per test submission:
```
/{resultId}
  timestamp: serverTimestamp()
  candidateName: string
  candidateEmail: string
  selfReportedLevel: "4" | "5" | "6" | "unsure" | "none"
  responses: [
    { itemId: string, selected: number, correct: boolean, flagComment: string | null }
  ]
  scores: {
    band4: { correct: number, total: number },
    band5: { correct: number, total: number },
    band6: { correct: number, total: number },
    vocabulary: { correct: number, total: number },
    structure: { correct: number, total: number }
  }
  indicativeLevel: "below4" | "4" | "5" | "6"
  totalCorrect: number
  totalItems: number
```

### Collection: `flags`
One document per flag submission (in addition to storing flagComment in the result):
```
/{flagId}
  timestamp: serverTimestamp()
  itemId: string
  comment: string
  candidateEmail: string | null
```
Keeping flags in their own collection makes it easy to query "all flags for item X" without scanning results.

---

## Indicative level scoring (trial version)

Simple banded scoring — refine after trial data collected:

| Score | Indicative level |
|---|---|
| < 40% overall | Below 4 |
| 40–59% overall | Level 4 |
| 60–79% overall | Level 5 |
| 80%+ overall | Level 6 |

Also compute and store per-band scores separately — these will be the basis for the validity analysis.

---

## Trialling plan

The trial version is shared with:
1. Candidates who have already done a Lenguax speaking test (known ICAO level — most valuable for validation)
2. Training centre contacts who send it to their students
3. Target spread: Level 4, 5 and 6 candidates

**Minimum useful sample:** 15–20 to spot broken items. 40–50 to start seeing difficulty patterns.

**Validation analysis (post-trial):**
For each item: proportion correct overall, and proportion correct split by self-reported ICAO level.
- Items where Level 4 and Level 6 candidates score identically → doing no discriminative work → review
- Items where Level 6 candidates score lower than Level 4 → probably ambiguous → check flag comments

**The flag mechanism:**
A small "?" icon on each question opens a one-line input: "What's wrong with this question?"
This is stored against the item ID. After 20–30 responses, repeatedly flagged items are obvious candidates for revision.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Database | Firebase Firestore (item bank + results + flags) |
| Audio storage | Firebase Storage (listening items — phase 2) |
| Hosting | lenguax.com/benchmark/ (SiteGround) |
| Deployment | GitHub Actions → FTP to SiteGround |
| Dev environment | VS Code / Cursor on Linux Mint |

**No backend server.** Firebase handles all data and storage. The React app builds to static files deployed via FTP.

---

## React app structure

```
src/
  components/
    QuestionCard.jsx       — renders stem, options, flag button
    FlagModal.jsx          — comment input triggered by flag button
    ProgressBar.jsx        — shows progress through test
    ResultsScreen.jsx      — end screen with score breakdown
  pages/
    Home.jsx               — intro, candidate name/email/level form
    Test.jsx               — main test player, manages item sequence and responses
    Results.jsx            — post-submission results display
  firebase/
    config.js              — Firebase initialisation
    items.js               — fetchItems() from Firestore
    results.js             — submitResult(), submitFlag()
  data/
    benchmark_items_v01.json   — item bank (seed source)
  utils/
    scoring.js             — score calculation and band assignment
    shuffle.js             — Fisher-Yates shuffle for item randomisation
  App.jsx
  main.jsx
```

---

## Deployment pipeline

- Repo: `github.com/paullenguax/benchmark`
- Local: `/home/paul/Programs/benchmark/`
- GitHub Action: `.github/workflows/deploy.yml`
- Deploys to: `lenguax.com/public_html/benchmark/`
- Trigger: push to `main` branch
- FTP credentials stored as GitHub repo secrets: `FTP_HOST`, `FTP_USERNAME`, `FTP_PASSWORD`
- Vite base path set to `/benchmark/` in `vite.config.js`

Pipeline is fully working — a push to main builds and deploys automatically.

---

## Firebase setup (still to do)

Firebase project not yet created. Steps needed:
1. Create project at console.firebase.google.com
2. Enable Firestore (start in test mode for trial)
3. Enable Storage (for audio — phase 2)
4. Get web app config (apiKey, authDomain, projectId etc.)
5. Add config values as Vite env vars (VITE_FIREBASE_*) in `.env.local`
6. Add same env vars as GitHub Actions secrets for the build step
7. Seed Firestore with `benchmark_items_v01.json`

Firebase config goes in `src/firebase/config.js`:
```js
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
```

---

## Current status

- [x] Local git repo initialised at `/home/paul/Programs/benchmark/`
- [x] Linked to GitHub at `github.com/paullenguax/benchmark`
- [x] Vite + React scaffold created
- [x] Firebase SDK installed (`npm install firebase`)
- [x] GitHub Actions workflow created and working
- [x] Deploying successfully to `lenguax.com/benchmark/`
- [x] Item bank created: `benchmark_items_v01.json` (80 items)
- [ ] Firebase project not yet created
- [ ] Firestore not yet seeded
- [ ] React app not yet scaffolded beyond default Vite template
- [ ] No test logic built yet

---

## Immediate next task

Build the trial version of the test app:

1. Set up Firebase project and add config to `.env.local`
2. Scaffold the React component structure above
3. Build `Home.jsx` — candidate registration form (name, email, self-reported level)
4. Build `Test.jsx` — fetch items from JSON, shuffle, present one at a time, collect responses, handle flag comments
5. Build `ResultsScreen.jsx` — score by band and construct, indicative level, thank-you message
6. Wire up Firestore writes on submission
7. Push and verify deployment

**For the trial version, load items from the local JSON file (`src/data/benchmark_items_v01.json`) rather than Firestore** — simpler to build, avoids Firestore read costs during trialling, and the item bank will not change during the trial period. Firestore is only needed for writing results and flags.

---

## Listening items — phase 2 (not yet built)

Audio items will follow the trial. Planned types:
- Mishearing / phonological confusion (numbers, callsigns)
- Implicit meaning / inference (short exchanges)
- Paraphrase recognition (spoken phrase to written options)
- Non-standard / plain English comprehension (unusual situations)

Audio will be studio-recorded (two speakers, one native, one non-native) and served from Firebase Storage. Listening items will use the same schema with `modality: "listening"` and an `audioRef` field pointing to the Storage path.
