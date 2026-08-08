const LEVEL_LABELS = {
  'below4': 'Below ICAO Level 4',
  '4': 'ICAO Level 4 — Operational',
  '5': 'ICAO Level 5 — Extended',
  '6': 'ICAO Level 6 — Expert',
}

const LEVEL_DESCRIPTIONS = {
  'below4': 'Reading comprehension is below the operational threshold. Significant language training is recommended before an ICAO assessment.',
  '4': 'Operational-level comprehension. Handles straightforward aviation texts but may struggle with complex or non-routine language.',
  '5': 'Extended competence. Handles complex and non-routine language well with only occasional difficulty.',
  '6': 'Expert-level comprehension across all item types, including high-inference and syntactically complex items.',
}

function pct(correct, total) {
  if (total === 0) return '—'
  return Math.round((correct / total) * 100) + '%'
}

export default function TrialResultsScreen({ result, candidateName }) {
  const { scores, responses, form } = result
  const {
    band4, band5, band6,
    vocabulary, structure, comprehension,
    totalCorrect, totalItems,
    indicativeLevel,
  } = scores

  const flagCount = responses.filter(r => r.flagComment).length
  const overallPct = pct(totalCorrect, totalItems)

  return (
    <div className="results-screen">
      <h1>Your result</h1>

      {candidateName && (
        <p className="candidate-name">Results for: <strong>{candidateName}</strong></p>
      )}

      <div
        className={`level-badge level-${indicativeLevel}`}
        role="region"
        aria-label="Indicative level"
      >
        <span className="level-label">{LEVEL_LABELS[indicativeLevel]}</span>
        <span className="level-note">Indicative result — not a formal ICAO assessment</span>
      </div>

      <p className="level-description">{LEVEL_DESCRIPTIONS[indicativeLevel]}</p>

      {form && <p className="form-badge">Form {form}</p>}

      <p className="score-summary">
        Overall: <strong>{totalCorrect} / {totalItems}</strong> ({overallPct})
      </p>

      <div className="score-breakdown">
        <h2>Score by band</h2>
        <table aria-label="Score breakdown by ICAO band">
          <thead>
            <tr>
              <th scope="col">Band</th>
              <th scope="col">Score</th>
              <th scope="col">%</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Band 4 — B1 operational</td>
              <td>{band4.correct} / {band4.total}</td>
              <td>{pct(band4.correct, band4.total)}</td>
            </tr>
            <tr>
              <td>Band 5 — B2 extended</td>
              <td>{band5.correct} / {band5.total}</td>
              <td>{pct(band5.correct, band5.total)}</td>
            </tr>
            <tr>
              <td>Band 6 — C1 expert</td>
              <td>{band6.correct} / {band6.total}</td>
              <td>{pct(band6.correct, band6.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

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
