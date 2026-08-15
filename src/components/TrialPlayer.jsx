import { useState, useEffect, useRef } from 'react'
import QuestionCard from './QuestionCard'
import { saveFlag } from '../firebase/results'

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Weighted random sample (without replacement) of pilot items, favouring
// items with fewer responses so far (pilotAttempts, maintained server-side
// by incrementPilotItemAttempts) so the pool converges on even sample sizes
// faster than plain random draws would. At most one item per pairKey is
// picked per sitting, so related minimal pairs don't cluster together.
function samplePilotItems(pilotItems, n) {
  const pool = [...pilotItems]
  const picked = []
  const usedPairKeys = new Set()

  while (picked.length < n && pool.length > 0) {
    const eligible = pool.filter(i => !i.pairKey || !usedPairKeys.has(i.pairKey))
    const candidates = eligible.length > 0 ? eligible : pool

    const weights = candidates.map(i => 1 / ((i.pilotAttempts ?? 0) + 1))
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let r = Math.random() * totalWeight
    let idx = candidates.length - 1
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i]
      if (r <= 0) { idx = i; break }
    }

    const chosen = candidates[idx]
    picked.push(chosen)
    if (chosen.pairKey) usedPairKeys.add(chosen.pairKey)
    pool.splice(pool.findIndex(i => i.id === chosen.id), 1)
  }

  return picked
}

function matchesFilter(item, filter) {
  if (filter.modality !== 'any' && item.modality !== filter.modality) return false
  if (filter.construct !== 'any' && item.construct !== filter.construct) return false
  if (filter.band !== 'any' && item.band !== filter.band) return false
  return true
}

// Every section is form-split and scored — pulls all matching items from the
// candidate's assigned form. Pilot items are sampled once from the whole
// unscored pool (independent of section boundaries) and woven into
// whichever section's filter they happen to match first, same as a Form-A/B
// item would be — invisible to the candidate, excluded from scoring.
function buildSectionBlocks(items, form, sections, pilotSampleCount) {
  const sortedSections = [...sections].sort((a, b) => a.order - b.order)
  const scoredItems = items.filter(i => i.form === form && !i.pilot).map(normalizeItem)
  const pilotPool = items.filter(i => i.pilot).map(normalizeItem)
  const sampledPilot = samplePilotItems(pilotPool, pilotSampleCount)

  const buckets = sortedSections.map(() => [])
  function place(item) {
    const idx = sortedSections.findIndex(s => matchesFilter(item, s.filter))
    if (idx !== -1) buckets[idx].push(item)
  }
  scoredItems.forEach(place)
  sampledPilot.forEach(place)

  return sortedSections
    .map((section, i) => ({ section, items: shuffle(buckets[i]) }))
    .filter(b => b.items.length > 0)
}

// Map new item schema (stem / 0-based correct index) to what QuestionCard expects
function normalizeItem(item) {
  return {
    ...item,
    question: item.stem,
    correct: OPTION_LETTERS[item.correct],
  }
}

function computeScores(responses, itemMap) {
  const band = {
    4: { correct: 0, total: 0 },
    5: { correct: 0, total: 0 },
    6: { correct: 0, total: 0 },
  }
  const construct = {
    vocabulary: { correct: 0, total: 0 },
    structure:  { correct: 0, total: 0 },
    comprehension: { correct: 0, total: 0 },
  }
  let totalCorrect = 0
  let totalItems = 0

  for (const r of responses) {
    const item = itemMap[r.itemId]
    if (!item || item.pilot) continue
    totalItems++
    band[item.band].total++
    if (construct[item.construct]) construct[item.construct].total++
    if (r.correct) {
      band[item.band].correct++
      if (construct[item.construct]) construct[item.construct].correct++
      totalCorrect++
    }
  }

  const pct = totalItems > 0 ? totalCorrect / totalItems : 0
  const indicativeLevel =
    pct < 0.4 ? 'below4' :
    pct < 0.6 ? '4' :
    pct < 0.8 ? '5' : '6'

  return {
    band4: band[4],
    band5: band[5],
    band6: band[6],
    vocabulary: construct.vocabulary,
    structure:  construct.structure,
    comprehension: construct.comprehension,
    totalCorrect,
    totalItems,
    indicativeLevel,
  }
}

export default function TrialPlayer({ items, sectionsConfig, candidateEmail, onComplete }) {
  const [form] = useState(() => Math.random() < 0.5 ? 'A' : 'B')
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [responses, setResponses] = useState([])
  const [flags, setFlags] = useState({})
  // Section boundaries the queue crosses: [{ index, section }], sorted by
  // index — index is the queue position where that section's first item
  // sits, so an intro screen shows right before it (if section.showIntro).
  const [sectionBoundaries, setSectionBoundaries] = useState([])
  const [pendingIntro, setPendingIntro] = useState(null)
  const cardRef = useRef(null)

  useEffect(() => {
    const blocks = buildSectionBlocks(items, form, sectionsConfig.sections, sectionsConfig.pilotSampleCount)
    const flatQueue = blocks.flatMap(b => b.items)

    let cursor = 0
    const boundaries = []
    for (const b of blocks) {
      if (b.section.showIntro) boundaries.push({ index: cursor, section: b.section })
      cursor += b.items.length
    }

    setQueue(flatQueue)
    setSectionBoundaries(boundaries)
    setPendingIntro(boundaries[0]?.index === 0 ? boundaries[0].section : null)
  }, [items, form, sectionsConfig])

  useEffect(() => {
    if (!pendingIntro) cardRef.current?.focus()
  }, [index, pendingIntro])

  const current = queue[index]
  const total = queue.length
  const progressPct = total > 0 ? Math.round((index / total) * 100) : 0

  async function handleFlag(comment) {
    if (!current) return
    setFlags(prev => ({ ...prev, [current.id]: comment }))
    try {
      await saveFlag({ itemId: current.id, comment, candidateEmail })
    } catch {
      // flag save failure is non-critical — result still includes it
    }
  }

  function handleNext() {
    if (!selected) return

    const isCorrect = selected === current.correct
    const response = {
      itemId:      current.id,
      band:        current.band,
      construct:   current.construct,
      selected,
      correct:     isCorrect,
      flagComment: flags[current.id] ?? null,
    }
    const updatedResponses = [...responses, response]
    setResponses(updatedResponses)
    setSelected(null)

    if (index === queue.length - 1) {
      const itemMap = Object.fromEntries(queue.map(i => [i.id, i]))
      const scores = computeScores(updatedResponses, itemMap)
      // itemMap carries question/option text for the results page's
      // wrong-answer review — kept separate from the saved result so it
      // never gets persisted to Firestore (it's just a duplicate of what's
      // already in benchmark_items).
      onComplete({ responses: updatedResponses, scores, form, itemMap })
    } else {
      const nextIndex = index + 1
      // A new section starts here, with more items still to come — flag the
      // hand-off with its intro instead of dropping straight into it.
      const boundary = sectionBoundaries.find(b => b.index === nextIndex)
      if (boundary) setPendingIntro(boundary.section)
      setIndex(nextIndex)
    }
  }

  if (!current) return <p className="loading">Loading…</p>

  if (pendingIntro) {
    return (
      <div className="test-player">
        <section className="home-intro" aria-labelledby="section-intro-heading">
          <h2 id="section-intro-heading">{pendingIntro.title}</h2>
          <p>{pendingIntro.introBody}</p>
        </section>
        <button className="btn-start" onClick={() => setPendingIntro(null)}>
          {index === 0 ? 'Begin' : 'Continue'}
        </button>
      </div>
    )
  }

  return (
    <div className="test-player">
      <div className="test-header">
        <span className="phase-label" aria-live="polite">
          Trial — Form {form}
        </span>
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: question ${index + 1} of ${total}`}
        >
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="item-counter" aria-hidden="true">{index + 1} / {total}</span>
      </div>

      <div
        key={current.id}
        ref={cardRef}
        tabIndex={-1}
        onKeyDown={e => {
          // Enter on an already-selected option advances to the next
          // question — scoped to option buttons specifically so it doesn't
          // hijack Enter on the Flag button or its comment form.
          if (e.key !== 'Enter' || !selected || !e.target.classList?.contains('option-btn')) return
          e.preventDefault()
          handleNext()
        }}
      >
        <QuestionCard
          item={current}
          selected={selected}
          onSelect={setSelected}
          onFlag={handleFlag}
          existingFlag={flags[current.id]}
        />
      </div>

      <div className="test-footer">
        <button
          className="btn-next"
          onClick={handleNext}
          disabled={!selected}
          aria-label={
            !selected
              ? 'Select an answer to continue'
              : index === queue.length - 1
              ? 'Finish test'
              : 'Next question'
          }
        >
          {index === queue.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  )
}
