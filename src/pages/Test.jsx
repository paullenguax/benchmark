import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import TestPlayer from '../components/TestPlayer'
import { fetchItems } from '../firebase/items'
import { saveResult } from '../firebase/results'

export default function Test() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const candidateName  = state?.candidateName  ?? ''
  const candidateEmail = state?.candidateEmail ?? ''

  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchItems()
      .then(setItems)
      .catch(err => setError(err.message))
  }, [])

  async function handleComplete(result) {
    const fullResult = { ...result, candidateName, candidateEmail }
    await saveResult(fullResult)
    navigate('/results', { state: { result, candidateName } })
  }

  if (error) {
    return (
      <div className="page">
        <main id="main-content">
          <p className="error" role="alert">Failed to load test items: {error}</p>
        </main>
      </div>
    )
  }

  if (!items) {
    return (
      <div className="page">
        <main id="main-content">
          <p className="loading" aria-live="polite">Loading…</p>
        </main>
      </div>
    )
  }

  return (
    <div className="page test-page">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <main id="main-content">
        <TestPlayer items={items} onComplete={handleComplete} />
      </main>
    </div>
  )
}
