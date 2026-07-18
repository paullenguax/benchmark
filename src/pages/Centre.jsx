import { useState, useEffect } from 'react'
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut,
} from 'firebase/auth'
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

function LoginGate({ onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSigningIn(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      onSignedIn()
    } catch {
      setError('Incorrect email or password.')
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <div className="page admin-gate">
      <h1>Centre login</h1>
      <form className="gate-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label htmlFor="centre-email">Email</label>
          <input
            id="centre-email" type="email" value={email}
            onChange={e => setEmail(e.target.value)} autoFocus required
          />
        </div>
        <div className="field-group">
          <label htmlFor="centre-password">Password</label>
          <input
            id="centre-password" type="password" value={password}
            onChange={e => setPassword(e.target.value)} required
          />
        </div>
        {error && <p className="admin-error">{error}</p>}
        <button type="submit" className="btn-start" disabled={signingIn}>
          {signingIn ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

function pct(correct, total) {
  if (!total) return '—'
  return Math.round((correct / total) * 100) + '%'
}

function scoreOf(result) {
  const s = result.scores
  if (!s) return '—'
  if (typeof s.totalCorrect === 'number') return `${s.totalCorrect}/${s.totalItems} (${pct(s.totalCorrect, s.totalItems)})`
  return '—'
}

function levelOf(result) {
  return result.scores?.indicativeLevel ?? result.indicativeLevel ?? '—'
}

function CentreDashboard({ user }) {
  const [centre, setCentre] = useState(null)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const centreSnap = await getDoc(doc(db, 'centre_accounts', user.uid))
        if (!centreSnap.exists()) {
          throw new Error('No centre account is set up for this login — contact Lenguax.')
        }
        const centreData = centreSnap.data()
        if (cancelled) return
        setCentre(centreData)

        const q = query(collection(db, 'benchmark_results'), where('centreId', '==', centreData.centreId))
        const snap = await getDocs(q)
        if (cancelled) return
        setResults(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user.uid])

  if (error) return (
    <div className="page admin-page">
      <p className="admin-error">{error}</p>
      <button className="btn-new" onClick={() => signOut(auth)}>Sign out</button>
    </div>
  )

  if (!centre || !results) return <p className="loading">Loading…</p>

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <h1>{centre.centreName || centre.centreId} — trainee results</h1>
        <button className="btn-new" onClick={() => signOut(auth)}>Sign out</button>
      </div>

      {results.length === 0 ? (
        <p className="admin-note">No trainees have taken the benchmark yet.</p>
      ) : (
        <table className="items-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Self-reported</th>
              <th>Score</th>
              <th>Level</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <tr key={r.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{r.candidateName || '—'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.candidateEmail || '—'}</div>
                </td>
                <td>{r.selfReportedLevel || '—'}</td>
                <td><code>{scoreOf(r)}</code></td>
                <td>{levelOf(r)}</td>
                <td>{r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function Centre() {
  const [user, setUser] = useState(undefined) // undefined = still checking, null = signed out

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, u => setUser(u))
  }, [])

  if (!auth) {
    return (
      <div className="page admin-page">
        <p className="admin-error">Centre login is unavailable right now — please try again later.</p>
      </div>
    )
  }

  if (user === undefined) return <p className="loading">Loading…</p>
  if (!user) return <LoginGate onSignedIn={() => {}} />
  return <CentreDashboard user={user} />
}
