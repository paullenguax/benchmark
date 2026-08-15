import { useLocation, Navigate } from 'react-router-dom'
import TrialResultsScreen from '../components/TrialResultsScreen'

export default function TrialResults() {
  const { state } = useLocation()

  if (!state?.result) return <Navigate to="/" replace />

  return (
    <div className="page results-page">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <main id="main-content">
        <TrialResultsScreen
          result={state.result}
          candidateName={state.candidateName}
          candidateEmail={state.candidateEmail}
          itemsById={state.itemsById ?? {}}
        />
      </main>
    </div>
  )
}
