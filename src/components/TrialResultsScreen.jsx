import { useState } from 'react'
import { saveFlag } from '../firebase/results'

const OPTION_LABELS = ['A', 'B', 'C', 'D']

function pct(correct, total) {
  if (total === 0) return '—'
  return Math.round((correct / total) * 100) + '%'
}

function ReviewItem({ response, item, candidateEmail }) {
  const [showFlagForm, setShowFlagForm] = useState(false)
  const [flagInput, setFlagInput] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (!item) return null

  async function handleFlagSubmit(e) {
    e.preventDefault()
    const comment = flagInput.trim()
    if (!comment) return
    try {
      await saveFlag({ itemId: response.itemId, comment, candidateEmail })
      setSubmitted(true)
      setShowFlagForm(false)
    } catch {
      // save failure is non-critical — they just won't see confirmation
    }
  }

  const yourText = item.options[OPTION_LABELS.indexOf(response.selected)]
  const correctText = item.options[OPTION_LABELS.indexOf(item.correct)]

  return (
    <div className="review-item">
      <p className="review-question">{item.question}</p>
      <p className="review-answer review-answer--wrong">
        Your answer: <strong>{response.selected}</strong> — {yourText}
      </p>
      <p className="review-answer review-answer--correct">
        Correct answer: <strong>{item.correct}</strong> — {correctText}
      </p>

      <div className="flag-area">
        {response.flagComment || submitted ? (
          <span className="flag-indicator" aria-label="You flagged this item">
            Flagged{response.flagComment ? `: "${response.flagComment}"` : ''}
          </span>
        ) : showFlagForm ? (
          <form className="flag-form" onSubmit={handleFlagSubmit}>
            <input
              type="text"
              className="flag-input"
              value={flagInput}
              onChange={e => setFlagInput(e.target.value)}
              placeholder="What seems wrong with this question?"
              autoFocus
              maxLength={200}
              aria-label="Flag comment"
            />
            <button type="submit" className="btn-flag-submit" disabled={!flagInput.trim()}>
              Submit
            </button>
            <button
              type="button"
              className="btn-flag-cancel"
              onClick={() => { setShowFlagForm(false); setFlagInput('') }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            className="btn-flag"
            onClick={() => setShowFlagForm(true)}
            aria-label="Flag this question as unfair or incorrect"
          >
            ? Flag as unfair
          </button>
        )}
      </div>
    </div>
  )
}

export default function TrialResultsScreen({ result, candidateName, candidateEmail, itemsById = {} }) {
  const { scores, responses, form } = result
  const { vocabulary, structure, comprehension, totalCorrect, totalItems } = scores

  const flagCount = responses.filter(r => r.flagComment).length
  const overallPct = pct(totalCorrect, totalItems)
  const wrongResponses = responses.filter(r => !r.correct)

  return (
    <div className="results-screen">
      <h1>Your result</h1>

      {candidateName && (
        <p className="candidate-name">Results for: <strong>{candidateName}</strong></p>
      )}

      <div className="score-headline" role="region" aria-label="Your score">
        <span className="score-headline-number">{totalCorrect} / {totalItems} correct</span>
        <span className="score-headline-pct">{overallPct}</span>
      </div>

      {form && <p className="form-badge">Form {form}</p>}

      <div className="score-breakdown">
        <h2>Score by construct</h2>
        <table aria-label="Score breakdown by construct">
          <thead>
            <tr>
              <th scope="col">Construct</th>
              <th scope="col">Score</th>
              <th scope="col">%</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Vocabulary</td>
              <td>{vocabulary.correct} / {vocabulary.total}</td>
              <td>{pct(vocabulary.correct, vocabulary.total)}</td>
            </tr>
            <tr>
              <td>Structure</td>
              <td>{structure.correct} / {structure.total}</td>
              <td>{pct(structure.correct, structure.total)}</td>
            </tr>
            {comprehension && comprehension.total > 0 && (
              <tr>
                <td>Comprehension</td>
                <td>{comprehension.correct} / {comprehension.total}</td>
                <td>{pct(comprehension.correct, comprehension.total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {wrongResponses.length > 0 && (
        <div className="score-breakdown">
          <h2>Questions to review</h2>
          <p className="review-intro">
            These are the questions you got wrong. If anything looks unfair or unclear, flag
            it — it helps us improve the test.
          </p>
          <div className="review-list">
            {wrongResponses.map((r, i) => (
              <ReviewItem key={`${r.itemId}-${i}`} response={r} item={itemsById[r.itemId]} candidateEmail={candidateEmail} />
            ))}
          </div>
        </div>
      )}

      {flagCount > 0 && (
        <p className="flag-note">
          You flagged {flagCount} {flagCount === 1 ? 'item' : 'items'}.
          Thank you — this feedback helps us improve the test.
        </p>
      )}

      <p className="disclaimer">
        This benchmark assesses reading and listening comprehension only, and should not
        be used as a substitute for a formal ICAO language proficiency assessment. A formal
        assessment will include assessment of Pronunciation, Spoken Structure, Vocabulary
        and Fluency, as well as Interactions.
      </p>

      <button
        className="btn-restart"
        onClick={() => window.location.href = import.meta.env.BASE_URL}
      >
        Take the test again
      </button>
    </div>
  )
}
