import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selfReportedLevel, setSelfReportedLevel] = useState('')

  // A centre's link looks like /benchmark/?centre=oxford-aviation — tags
  // every result from that link so the centre can see only its own trainees.
  const centreId = searchParams.get('centre') || null

  function handleStart() {
    navigate('/trial', {
      state: {
        candidateName:     name.trim(),
        candidateEmail:    email.trim(),
        selfReportedLevel: selfReportedLevel || 'none',
        centreId,
      },
    })
  }

  return (
    <div className="page home">
      <a href="#main-content" className="skip-link">Skip to content</a>

      <header className="home-header">
        <h1>Aviation English Benchmark</h1>
        <p className="tagline">Indicative ICAO language proficiency screening</p>
      </header>

      <main id="main-content">
        <section className="home-intro" aria-label="About this test">
          <p>
            This free screener aims to give an indicative ICAO language proficiency level (4–6)
            based on multiple choice questions. It takes approximately 10–15 minutes.
          </p>
          <p>
            In this trial version you will work through a set of multiple-choice items — mostly
            in random order, with any listening items grouped together as their own short
            section. Work through them at your own pace, there is no time limit.
          </p>
          <p className="disclaimer-small">
            This is not a formal ICAO assessment — it only tests reading and listening
            comprehension. A formal assessment will include assessment of Pronunciation,
            Spoken Structure, Vocabulary and Fluency, as well as Interactions.
          </p>
        </section>

        <section className="candidate-section" aria-labelledby="before-heading">
          <h2 id="before-heading">Before you begin</h2>
          <p>
            Name and email are optional. If provided, your result can be linked to a future
            ICAO assessment for validity research.
          </p>

          <div className="field-group">
            <label htmlFor="name">Name (optional)</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
            />
          </div>

          <div className="field-group">
            <label htmlFor="email">Email (optional)</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>

          <div className="field-group">
            <label htmlFor="self-level">Your current ICAO level (optional)</label>
            <select
              id="self-level"
              value={selfReportedLevel}
              onChange={e => setSelfReportedLevel(e.target.value)}
            >
              <option value="">— Select if known —</option>
              <option value="4">Level 4 — Operational</option>
              <option value="5">Level 5 — Extended</option>
              <option value="6">Level 6 — Expert</option>
              <option value="unsure">I have a level but I&apos;m not sure which</option>
              <option value="none">I don&apos;t have an ICAO level yet</option>
            </select>
          </div>

          <button className="btn-start" onClick={handleStart}>
            Start Test
          </button>
        </section>
      </main>
    </div>
  )
}
