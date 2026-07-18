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

  for (const r of responses) {
    const item = itemMap[r.itemId]
    if (!item) continue
    band[item.band].total++
    if (construct[item.construct]) construct[item.construct].total++
    if (r.correct) {
      band[item.band].correct++
      if (construct[item.construct]) construct[item.construct].correct++
      totalCorrect++
    }
  }

  const totalItems = responses.length
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

export default function TrialPlayer({ items, candidateEmail, onComplete }) {
  const [form] = useState(() => Math.random() < 0.5 ? 'A' : 'B')
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [responses, setResponses] = useState([])
  const [flags, setFlags] = useState({})
  const cardRef = useRef(null)

  useEffect(() => {
    const formItems = items.filter(i => i.form === form)
    setQueue(shuffle(formItems.map(normalizeItem)))
  }, [items, form])

  useEffect(() => {
    cardRef.current?.focus()
  }, [index])

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
      onComplete({ responses: updatedResponses, scores, form })
    } else {
      setIndex(index + 1)
    }
  }

  if (!current) return <p className="loading">Loading…</p>

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

      <div key={current.id} ref={cardRef} tabIndex={-1}>
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
