import { useState, useEffect, useRef } from 'react'
import QuestionCard from './QuestionCard'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function scoreResponses(responses) {
  return responses.filter(r => r.correct).length
}

function getIndicativeLevel(p1Score, p2Score, p3Score, phase2Pool) {
  if (p1Score <= 4) {
    return p3Score >= 2 ? 4 : 'below4'
  }
  if (p1Score <= 7) {
    if (p2Score >= 9) return p3Score >= 3 ? 5 : 4
    return p3Score >= 3 ? 5 : 4
  }
  // p1Score 8–10
  if (p2Score >= 9) return p3Score >= 4 ? 6 : 5
  return p3Score >= 3 ? 5 : 4
}

export default function TestPlayer({ items, onComplete }) {
  const [phase, setPhase] = useState(1)
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [responses, setResponses] = useState([])
  const [phaseResponses, setPhaseResponses] = useState({ 1: [], 2: [], 3: [] })
  const [selected, setSelected] = useState(null)
  const [phase2Pool, setPhase2Pool] = useState(null)
  const cardRef = useRef(null)

  useEffect(() => {
    const phase1Items = shuffle(items.filter(i => i.pool === 'phase1')).slice(0, 10)
    setQueue(phase1Items)
  }, [items])

  // Move focus to the question card when the question changes so keyboard and
  // screen reader users land on the new content automatically.
  useEffect(() => {
    cardRef.current?.focus()
  }, [index, phase])

  const current = queue[index]
  const totalInPhase = queue.length
  const progressPct = totalInPhase > 0 ? Math.round((index / totalInPhase) * 100) : 0

  function handleNext() {
    if (!selected) return

    const correct = selected === current.correct
    const response = { itemId: current.id, selected, correct }
    const updatedPhaseResponses = {
      ...phaseResponses,
      [phase]: [...phaseResponses[phase], response],
    }
    const updatedAll = [...responses, response]

    setPhaseResponses(updatedPhaseResponses)
    setResponses(updatedAll)
    setSelected(null)

    const isLastInPhase = index === queue.length - 1

    if (!isLastInPhase) {
      setIndex(index + 1)
      return
    }

    const phaseScore = scoreResponses(updatedPhaseResponses[phase])

    if (phase === 1) {
      let pool, poolKey
      if (phaseScore <= 4)       { pool = 'phase2-low';  poolKey = 'low'  }
      else if (phaseScore <= 7)  { pool = 'phase2-mid';  poolKey = 'mid'  }
      else                       { pool = 'phase2-high'; poolKey = 'high' }
      setPhase2Pool(poolKey)
      const nextItems = shuffle(items.filter(i => i.pool === pool)).slice(0, 12)
      setQueue(nextItems)
      setIndex(0)
      setPhase(2)
    } else if (phase === 2) {
      const p1Score = scoreResponses(updatedPhaseResponses[1])
      let confirmPool
      if (p1Score <= 4)          confirmPool = 'phase3-4'
      else if (phaseScore >= 9)  confirmPool = p1Score >= 8 ? 'phase3-6' : 'phase3-5'
      else                       confirmPool = p1Score >= 8 ? 'phase3-5' : 'phase3-4'
      const nextItems = shuffle(items.filter(i => i.pool === confirmPool)).slice(0, 6)
      setQueue(nextItems)
      setIndex(0)
      setPhase(3)
    } else {
      const p1Score = scoreResponses(updatedPhaseResponses[1])
      const p2Score = scoreResponses(updatedPhaseResponses[2])
      const p3Score = phaseScore
      const indicativeLevel = getIndicativeLevel(p1Score, p2Score, p3Score, phase2Pool)
      onComplete({
        responses: updatedAll,
        scores: { phase1: p1Score, phase2: p2Score, phase3: p3Score },
        indicativeLevel,
      })
    }
  }

  if (!current) {
    return <p className="loading">Loading test…</p>
  }

  return (
    <div className="test-player">
      <div className="test-header">
        <span className="phase-label" aria-live="polite" aria-atomic="true">
          Phase {phase} of 3
        </span>
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Phase ${phase} progress: question ${index + 1} of ${totalInPhase}`}
        >
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="item-counter" aria-hidden="true">{index + 1} / {totalInPhase}</span>
      </div>

      {/* tabIndex={-1} lets useEffect move focus here programmatically */}
      <div ref={cardRef} tabIndex={-1}>
        <QuestionCard item={current} selected={selected} onSelect={setSelected} />
      </div>

      <div className="test-footer">
        <button
          className="btn-next"
          onClick={handleNext}
          disabled={!selected}
          aria-label={
            !selected
              ? 'Select an answer to continue'
              : index === queue.length - 1 && phase === 3
              ? 'Finish test'
              : 'Next question'
          }
        >
          {index === queue.length - 1 && phase === 3 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  )
}
