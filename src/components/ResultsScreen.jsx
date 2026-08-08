const LEVEL_LABELS = {
  'below4': 'Below ICAO Level 4',
  4: 'ICAO Level 4 — Operational',
  5: 'ICAO Level 5 — Extended',
  6: 'ICAO Level 6 — Expert',
}

const LEVEL_DESCRIPTIONS = {
  'below4': 'The candidate\'s reading and listening comprehension is below the operational threshold. Significant language training is recommended before an ICAO assessment.',
  4: 'The candidate demonstrates operational-level comprehension. They can handle straightforward aviation communication but may struggle with non-routine or complex language.',
  5: 'The candidate demonstrates extended competence. They handle complex and non-routine language well with only occasional difficulty.',
  6: 'The candidate demonstrates expert-level comprehension across all item types, including high-inference and complex syntactic items.',
}

export default function ResultsScreen({ result, candidateName }) {
  const { scores, indicativeLevel } = result

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

      <div className="score-breakdown">
        <h2>Score breakdown</h2>
        <table aria-label="Score breakdown by phase">
          <caption className="sr-only">Your scores across all three test phases</caption>
          <thead>
            <tr><th scope="col">Phase</th><th scope="col">Purpose</th><th scope="col">Score</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Phase 1</td>
              <td>Band 4 baseline</td>
              <td>{scores.phase1} / {result.responses.filter(r => r.itemId.startsWith('p1-')).length}</td>
            </tr>
            <tr>
              <td>Phase 2</td>
              <td>Adaptive targeting</td>
              <td>{scores.phase2}</td>
            </tr>
            <tr>
              <td>Phase 3</td>
              <td>Level confirmation</td>
              <td>{scores.phase3}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="disclaimer">
        This benchmark assesses reading and listening comprehension only, and should not be
        used as a substitute for a formal ICAO language proficiency assessment. A formal
        assessment will include assessment of Pronunciation, Spoken Structure, Vocabulary and
        Fluency, as well as Interactions.
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
