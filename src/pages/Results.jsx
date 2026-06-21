import { useLocation, Navigate } from 'react-router-dom'
import ResultsScreen from '../components/ResultsScreen'

export default function Results() {
  const { state } = useLocation()

  if (!state?.result) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="page results-page">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <main id="main-content">
        <ResultsScreen result={state.result} candidateName={state.candidateName} />
      </main>
    </div>
  )
}
