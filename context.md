# Benchmark Test — Project Context

## What we are building

A self-administered, browser-based **reading and listening comprehension screener** for aviation English candidates. It reports an indicative ICAO language proficiency level (Below 4 / 4 / 5 / 6).

This is essentially a standard English proficiency test at B1–C1 band (ICAO 4–6), dressed in aviation-themed stimulus material for face validity. It does **not** assess speaking, writing, pronunciation or fluency — honest scope is reading and listening comprehension only.

**Intended use:** A free sweetener offered to aviation training centres to help them quickly assess whether a candidate needs extensive training or just a final polish before their ICAO test.

---

## Assessment design

- **MCQ throughout** — no judgment rating, fully machine-scorable
- **Two modalities:** reading and listening, roughly equally weighted
- **Three item types:**
  - Reading MCQ (short written aviation texts — ATIS, reports, briefings)
  - Listening MCQ (single speaker audio — announcements, monologues)
  - Listening MCQ (dialogue audio — ATC exchanges, crew briefings)
- **Difficulty controlled by language variables** (vocabulary frequency, clause complexity, inference depth, speech rate) — not aviation knowledge complexity
- **Plain English / non-routine language** focus, not standard phraseology
- **Distractors** constructed on linguistic grounds — phonological confusion, pragmatic misreading, near-paraphrase — so aviation knowledge cannot be used to eliminate them

---

## Test structure (adaptive)

| Phase | Items | Pool | Purpose |
|---|---|---|---|
| Phase 1 | 10 | Random selection from Band 4 items | Baseline, ensures variety for repeat takers |
| Phase 2 | 10–15 | Adaptive — selected based on Phase 1 score | Targets the right difficulty band |
| Phase 3 | 5–8 | Confirmation items from indicated band | Confirms placement before result |

**Phase 2 routing logic:**

| Phase 1 score | Phase 2 pool |
|---|---|
| 0–4 / 10 | Stay in Band 4, flag likely below operational |
| 5–7 / 10 | Band 4–5 boundary items |
| 8–10 / 10 | Band 5–6 items |

**Total:** ~25–30 items per candidate. Shorter than a fixed-form test, better targeted.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Database | Firebase Firestore (item bank + results) |
| Audio storage | Firebase Storage |
| Hosting | lenguax.com/benchmark/ (SiteGround) |
| Deployment | GitHub Actions → FTP to SiteGround |
| Dev environment | VS Code / Cursor on Linux Mint |

**No backend server.** Firebase handles all data and storage. The React app is built to static files and deployed via FTP.

---

## Firestore data model

### Collection: `items`

```
/{itemId}
  section: "A" | "B" | "C"
  band: 4 | 5 | 6
  construct: "vocabulary" | "structure" | "comprehension"
  modality: "reading" | "listening"
  stimulus: "text string or null"
  audioRef: "Firebase Storage path or null"
  question: "string"
  options: ["A", "B", "C", "D"]
  correct: "A"
  feedback: "string"
  active: true | false
```

### Collection: `results`

```
/{resultId}
  timestamp
  candidateName: "optional string"
  candidateEmail: "optional string"
  responses: [{itemId, selected, correct}]
  scores: {phase1, phase2, phase3}
  indicativeLevel: "below4" | 4 | 5 | 6
```

The `active` flag allows items to be retired without deletion — important for later validity analysis.

Candidate name/email are optional fields included so that benchmark results can later be linked to known ICAO scores for validity analysis (checking that item success rates correlate with ICAO level).

---

## Suggested React app structure

```
src/
  components/
    TestPlayer.jsx
    QuestionCard.jsx
    AudioPlayer.jsx
    ResultsScreen.jsx
  pages/
    Home.jsx
    Test.jsx
    Results.jsx
  firebase/
    config.js
    items.js
    results.js
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

## Current status

- [x] Local git repo initialised
- [x] Linked to GitHub
- [x] Vite + React scaffold created
- [x] Firebase SDK installed (`npm install firebase`)
- [x] GitHub Actions workflow created and tested
- [x] Deploying successfully to lenguax.com/benchmark/
- [ ] Firebase project not yet created
- [ ] App structure not yet scaffolded
- [ ] No real items yet

---

## Immediate next task

Scaffold the React app structure (pages, components, firebase config) with placeholder content so the app navigates between Home → Test → Results before wiring up Firebase.

Firebase project still needs to be created at console.firebase.google.com — Firestore and Storage need to be enabled.