import { useState, useEffect, useMemo } from 'react'
import { fetchAllItems, saveItem, updateItem, seedItemsFromJson } from '../firebase/items'
import { fetchTrialResults, fetchFlags } from '../firebase/results'
import rawItems from '../data/benchmark_items_v01.json'

const BANDS = [4, 5, 6]
const CONSTRUCTS = ['vocabulary', 'structure']
const MODALITIES = ['reading', 'listening']
const OPTION_LABELS = ['A', 'B', 'C', 'D']

const BLANK_ITEM = {
  band: 4, construct: 'vocabulary', modality: 'reading',
  active: true, stem: '', options: ['', '', '', ''], correct: 0, feedback: '', notes: '',
}

// ── Password gate ────────────────────────────────────────────

function PasswordGate({ onUnlock }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (value === import.meta.env.VITE_ADMIN_PASSWORD) {
      onUnlock()
    } else {
      setError(true)
      setValue('')
    }
  }

  return (
    <div className="page admin-gate">
      <h1>Admin</h1>
      <form className="gate-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label htmlFor="pw">Password</label>
          <input
            id="pw"
            type="password"
            value={value}
            onChange={e => { setValue(e.target.value); setError(false) }}
            autoFocus
          />
        </div>
        {error && <p className="admin-error">Incorrect password.</p>}
        <button type="submit" className="btn-start">Enter</button>
      </form>
    </div>
  )
}

// ── Results tab ──────────────────────────────────────────────

function ResultsTab() {
  const [results, setResults] = useState(null)
  const [filterForm, setFilterForm] = useState('all')

  useEffect(() => {
    fetchTrialResults().then(setResults).catch(() => setResults([]))
  }, [])

  const visible = useMemo(() => {
    if (!results) return []
    return filterForm === 'all' ? results : results.filter(r => r.form === filterForm)
  }, [results, filterForm])

  if (!results) return <p className="loading">Loading results…</p>

  return (
    <div>
      <div className="list-toolbar" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <select value={filterForm} onChange={e => setFilterForm(e.target.value)}>
          <option value="all">All forms ({results.length})</option>
          <option value="A">Form A ({results.filter(r => r.form === 'A').length})</option>
          <option value="B">Form B ({results.filter(r => r.form === 'B').length})</option>
        </select>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{visible.length} result{visible.length !== 1 ? 's' : ''}</span>
      </div>

      {visible.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>No results yet.</p>
      ) : (
        <table className="items-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Form</th>
              <th>Self-reported</th>
              <th>Score</th>
              <th>Level</th>
              <th>Flags</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(r => {
              const flagCount = (r.responses ?? []).filter(resp => resp.flagComment).length
              const ts = r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000).toLocaleDateString() : '—'
              const score = r.scores ? `${r.scores.totalCorrect}/${r.scores.totalItems}` : '—'
              return (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.candidateName || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.candidateEmail || '—'}</div>
                  </td>
                  <td><code>{r.form ?? '—'}</code></td>
                  <td>{r.selfReportedLevel || '—'}</td>
                  <td><code>{score}</code></td>
                  <td>{r.scores?.indicativeLevel ?? r.indicativeLevel ?? '—'}</td>
                  <td>{flagCount > 0 ? <span style={{ color: '#b45309', fontWeight: 600 }}>{flagCount}</span> : '—'}</td>
                  <td>{ts}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Item analysis tab ────────────────────────────────────────

function ItemAnalysisTab() {
  const [results, setResults] = useState(null)
  const [flags, setFlags] = useState(null)
  const [filterForm, setFilterForm] = useState('all')
  const [sortBy, setSortBy] = useState('id')

  useEffect(() => {
    Promise.all([fetchTrialResults(), fetchFlags()])
      .then(([r, f]) => { setResults(r); setFlags(f) })
      .catch(() => { setResults([]); setFlags([]) })
  }, [])

  const analysis = useMemo(() => {
    if (!results || !flags) return []
    const items = rawItems.items

    const filteredResults = filterForm === 'all'
      ? results
      : results.filter(r => r.form === filterForm)

    const stats = {}
    for (const item of items) {
      stats[item.id] = {
        id: item.id, band: item.band, construct: item.construct, form: item.form,
        attempts: 0, correct: 0, flagCount: 0, flagComments: [],
      }
    }

    for (const result of filteredResults) {
      for (const resp of (result.responses ?? [])) {
        if (!stats[resp.itemId]) continue
        stats[resp.itemId].attempts++
        if (resp.correct) stats[resp.itemId].correct++
        if (resp.flagComment) {
          stats[resp.itemId].flagCount++
          stats[resp.itemId].flagComments.push(resp.flagComment)
        }
      }
    }

    // Also collect flags from the flags collection
    for (const flag of flags) {
      if (stats[flag.itemId]) {
        // Avoid double-counting if already in responses
        if (!stats[flag.itemId].flagComments.includes(flag.comment)) {
          stats[flag.itemId].flagComments.push(flag.comment)
        }
      }
    }

    return Object.values(stats)
  }, [results, flags, filterForm])

  const sorted = useMemo(() => {
    if (!analysis.length) return []
    return [...analysis].sort((a, b) => {
      if (sortBy === 'difficulty') {
        const pA = a.attempts > 0 ? a.correct / a.attempts : 1
        const pB = b.attempts > 0 ? b.correct / b.attempts : 1
        return pA - pB
      }
      if (sortBy === 'flags') return b.flagCount - a.flagCount
      return a.id.localeCompare(b.id)
    })
  }, [analysis, sortBy])

  if (!results || !flags) return <p className="loading">Loading…</p>

  return (
    <div>
      <div className="list-toolbar" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={filterForm} onChange={e => setFilterForm(e.target.value)}>
          <option value="all">Both forms</option>
          <option value="A">Form A only</option>
          <option value="B">Form B only</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="id">Sort by item ID</option>
          <option value="difficulty">Sort by difficulty (hardest first)</option>
          <option value="flags">Sort by flag count</option>
        </select>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {results.length} result{results.length !== 1 ? 's' : ''} loaded
        </span>
      </div>

      <table className="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Form</th>
            <th>Band</th>
            <th>Construct</th>
            <th>N</th>
            <th>Correct</th>
            <th>% correct</th>
            <th>Flags</th>
            <th>Flag comments</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(item => {
            const pct = item.attempts > 0 ? Math.round(item.correct / item.attempts * 100) : null
            const pctStyle = pct === null ? {} :
              pct < 30 ? { color: '#dc2626', fontWeight: 600 } :
              pct > 85 ? { color: '#16a34a', fontWeight: 600 } : {}
            return (
              <tr key={item.id} style={item.attempts === 0 ? { opacity: 0.4 } : {}}>
                <td><code>{item.id}</code></td>
                <td>{item.form}</td>
                <td>{item.band}</td>
                <td>{item.construct}</td>
                <td>{item.attempts}</td>
                <td>{item.correct}</td>
                <td style={pctStyle}>{pct !== null ? pct + '%' : '—'}</td>
                <td>
                  {item.flagCount > 0
                    ? <span style={{ color: '#b45309', fontWeight: 600 }}>{item.flagCount}</span>
                    : '—'}
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '240px' }}>
                  {item.flagComments.length > 0
                    ? item.flagComments.join(' / ')
                    : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Item form ────────────────────────────────────────────────

function ItemForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial
      ? { ...initial, options: [...initial.options] }
      : { ...BLANK_ITEM, options: [...BLANK_ITEM.options] }
  )
  const [saving, setSaving] = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function setOption(index, value) {
    const options = [...form.options]
    options[index] = value
    setForm(f => ({ ...f, options }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const item = { ...form, band: Number(form.band), correct: Number(form.correct) }
    if (initial?.id) {
      await updateItem(initial.id, item)
    } else {
      await saveItem(item)
    }
    setSaving(false)
    onSave()
  }

  return (
    <form className="item-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="field-group">
          <label>Band</label>
          <select value={form.band} onChange={e => set('band', e.target.value)}>
            {BANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label>Construct</label>
          <select value={form.construct} onChange={e => set('construct', e.target.value)}>
            {CONSTRUCTS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label>Modality</label>
          <select value={form.modality} onChange={e => set('modality', e.target.value)}>
            {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="field-group field-group--inline">
          <label>
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />
            Active
          </label>
        </div>
      </div>

      <div className="field-group">
        <label>Question stem</label>
        <textarea
          rows={3}
          value={form.stem}
          onChange={e => set('stem', e.target.value)}
          placeholder="Select the most appropriate word…"
          required
        />
      </div>

      <div className="options-grid">
        {OPTION_LABELS.map((label, i) => (
          <div className="field-group" key={label}>
            <label>Option {label}</label>
            <input
              type="text"
              value={form.options[i]}
              onChange={e => setOption(i, e.target.value)}
              required
            />
          </div>
        ))}
      </div>

      <div className="field-group">
        <label>Correct answer</label>
        <select value={form.correct} onChange={e => set('correct', e.target.value)}>
          {OPTION_LABELS.map((label, i) => (
            <option key={label} value={i}>{label}</option>
          ))}
        </select>
      </div>

      <div className="field-group">
        <label>Feedback / explanation</label>
        <textarea
          rows={2}
          value={form.feedback}
          onChange={e => set('feedback', e.target.value)}
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-save" disabled={saving}>
          {saving ? 'Saving…' : initial?.id ? 'Update item' : 'Create item'}
        </button>
      </div>
    </form>
  )
}

// ── Item bank tab ────────────────────────────────────────────

function ItemBankTab() {
  const [items, setItems] = useState(null)
  const [filterBand, setFilterBand] = useState('all')
  const [filterForm, setFilterForm] = useState('all')
  const [view, setView] = useState('list')
  const [editTarget, setEditTarget] = useState(null)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    fetchAllItems().then(setItems)
  }, [])

  async function handleSeed() {
    if (!confirm(`Write all ${rawItems.items.length} items from JSON into Firestore? Existing items with the same IDs will be overwritten.`)) return
    setSeeding(true)
    try {
      await seedItemsFromJson()
      const fresh = await fetchAllItems()
      setItems(fresh)
    } finally {
      setSeeding(false)
    }
  }

  function refresh() {
    fetchAllItems().then(setItems)
    setView('list')
    setEditTarget(null)
  }

  async function handleToggleActive(item) {
    await updateItem(item.id, { active: !item.active })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, active: !i.active } : i))
  }

  if (!items) return <p className="loading">Loading items…</p>

  const visible = items.filter(i =>
    (filterBand === 'all' || String(i.band) === filterBand) &&
    (filterForm === 'all' || i.form === filterForm)
  )

  if (view === 'new') return (
    <>
      <h2>New item</h2>
      <ItemForm onSave={refresh} onCancel={() => setView('list')} />
    </>
  )

  if (view === 'edit' && editTarget) return (
    <>
      <h2>Edit — <code>{editTarget.id}</code></h2>
      <ItemForm initial={editTarget} onSave={refresh} onCancel={() => setView('list')} />
    </>
  )

  return (
    <div>
      <div className="list-toolbar" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select value={filterBand} onChange={e => setFilterBand(e.target.value)}>
            <option value="all">All bands ({items.length})</option>
            {BANDS.map(b => <option key={b} value={b}>Band {b} ({items.filter(i => i.band === b).length})</option>)}
          </select>
          <select value={filterForm} onChange={e => setFilterForm(e.target.value)}>
            <option value="all">Both forms</option>
            <option value="A">Form A ({items.filter(i => i.form === 'A').length})</option>
            <option value="B">Form B ({items.filter(i => i.form === 'B').length})</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn-new"
            onClick={handleSeed}
            disabled={seeding}
            style={{ background: 'var(--text-muted)', fontSize: '0.8rem' }}
          >
            {seeding ? 'Seeding…' : '↑ Seed from JSON'}
          </button>
          <button className="btn-new" onClick={() => setView('new')}>+ New item</button>
        </div>
      </div>

      <table className="items-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Form</th>
            <th>Band</th>
            <th>Construct</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visible.map(item => (
            <tr key={item.id} className={item.active ? '' : 'row-inactive'}>
              <td><code>{item.id}</code></td>
              <td>{item.form ?? '—'}</td>
              <td>{item.band}</td>
              <td>{item.construct}</td>
              <td>
                <button
                  className={`btn-toggle ${item.active ? 'active' : 'inactive'}`}
                  onClick={() => handleToggleActive(item)}
                  aria-pressed={item.active}
                >
                  {item.active ? 'Active' : 'Inactive'}
                </button>
              </td>
              <td>
                <button className="btn-edit" onClick={() => { setEditTarget(item); setView('edit') }}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Admin root ───────────────────────────────────────────────

export default function Admin() {
  const [unlocked, setUnlocked] = useState(false)
  const [tab, setTab] = useState('results')

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <h1>Benchmark admin</h1>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        {[['results', 'Results'], ['analysis', 'Item analysis'], ['items', 'Item bank']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.875rem',
              fontWeight: tab === key ? 600 : 400,
              border: 'none',
              borderRadius: '6px 6px 0 0',
              background: tab === key ? 'var(--brand)' : 'transparent',
              color: tab === key ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'results'  && <ResultsTab />}
      {tab === 'analysis' && <ItemAnalysisTab />}
      {tab === 'items'    && <ItemBankTab />}
    </div>
  )
}
