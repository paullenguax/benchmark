import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import TrialPlayer from '../components/TrialPlayer'
import { fetchItems } from '../firebase/items'
import { fetchSectionsConfig } from '../firebase/sections'
import { saveTrialResult } from '../firebase/results'

export default function Trial() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const candidateName     = state?.candidateName     ?? ''
  const candidateEmail    = state?.candidateEmail    ?? ''
  const selfReportedLevel = state?.selfReportedLevel ?? ''
  const centreId          = state?.centreId          ?? null

  const [items, setItems] = useState(null)
  const [sectionsConfig, setSectionsConfig] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([fetchItems(), fetchSectionsConfig()])
      .then(([fetchedItems, fetchedSectionsConfig]) => {
        setItems(fetchedItems)
        setSectionsConfig(fetchedSectionsConfig)
      })
      .catch(err => setError(err.message))
  }, [])

  async function handleComplete({ itemMap, ...result }) {
    const fullResult = {
      ...result,
      mode: 'trial',
      candidateName,
      candidateEmail,
      selfReportedLevel,
      centreId,
    }
    try {
      await saveTrialResult(fullResult)
    } catch {
      // save failure is non-critical — still show results
    }
    navigate('/trial-results', { state: { result: fullResult, candidateName, candidateEmail, itemsById: itemMap } })
  }

  if (error) return (
    <div className="page">
      <main id="main-content">
        <p className="error" role="alert">Failed to load test items: {error}</p>
      </main>
    </div>
  )

  if (!items || !sectionsConfig) return (
    <div className="page">
      <main id="main-content">
        <p className="loading" aria-live="polite">Loading…</p>
      </main>
    </div>
  )

  return (
    <div className="page test-page">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <main id="main-content">
        <TrialPlayer
          items={items}
          sectionsConfig={sectionsConfig}
          candidateEmail={candidateEmail}
          onComplete={handleComplete}
        />
      </main>
    </div>
  )
}
