import { useState, useEffect } from 'react'
import { fetchAllItems, saveItem, updateItem } from '../firebase/items'

const POOLS = ['phase1', 'phase2-low', 'phase2-mid', 'phase2-high', 'phase3-4', 'phase3-5', 'phase3-6']
const SECTIONS = ['A', 'B', 'C']
const BANDS = [4, 5, 6]
const CONSTRUCTS = ['vocabulary', 'structure', 'comprehension']
const MODALITIES = ['reading', 'listening']
const OPTION_LABELS = ['A', 'B', 'C', 'D']

const BLANK_ITEM = {
  section: 'A',
  band: 4,
  construct: 'vocabulary',
  modality: 'reading',
  pool: 'phase1',
  active: true,
  stimulus: '',
  audioRef: '',
  question: '',
  options: ['', '', '', ''],
  correct: 'A',
  feedback: '',
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
      <p className="admin-note">
        This gate uses a local env-var password. Replace with Firebase Auth once Firebase is configured.
      </p>
    </div>
  )
}

// ── Item form ────────────────────────────────────────────────

function ItemForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial
      ? { ...initial, options: [...initial.options], stimulus: initial.stimulus ?? '', audioRef: initial.audioRef ?? '' }
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
    const item = {
      ...form,
      band: Number(form.band),
      stimulus: form.stimulus.trim() || null,
      audioRef: form.audioRef.trim() || null,
    }
    if (initial?.id) {
      await updateItem(initial.id, item)
    } else {
      await saveItem(item)
    }
    setSaving(false)
    onSave()
  }

  const isListening = form.modality === 'listening'

  return (
    <form className="item-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="field-group">
          <label>Pool</label>
          <select value={form.pool} onChange={e => set('pool', e.target.value)}>
            {POOLS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label>Section</label>
          <select value={form.section} onChange={e => set('section', e.target.value)}>
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label>Band</label>
          <select value={form.band} onChange={e => set('band', e.target.value)}>
            {BANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="field-group">
          <label>Modality</label>
          <select value={form.modality} onChange={e => set('modality', e.target.value)}>
            {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label>Construct</label>
          <select value={form.construct} onChange={e => set('construct', e.target.value)}>
            {CONSTRUCTS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field-group field-group--inline">
          <label>
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />
            Active
          </label>
        </div>
      </div>

      {!isListening && (
        <div className="field-group">
          <label>Stimulus text (optional for reading)</label>
          <textarea
            rows={4}
            value={form.stimulus}
            onChange={e => set('stimulus', e.target.value)}
            placeholder="Passage, report, NOTAM, etc."
          />
        </div>
      )}

      {isListening && (
        <div className="field-group">
          <label>Audio file path (Firebase Storage)</label>
          <input
            type="text"
            value={form.audioRef}
            onChange={e => set('audioRef', e.target.value)}
            placeholder="audio/filename.mp3"
          />
        </div>
      )}

      <div className="field-group">
        <label>Question</label>
        <textarea
          rows={2}
          value={form.question}
          onChange={e => set('question', e.target.value)}
          placeholder="What does the text say about…?"
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
          {OPTION_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="field-group">
        <label>Feedback / explanation</label>
        <textarea
          rows={2}
          value={form.feedback}
          onChange={e => set('feedback', e.target.value)}
          placeholder="Why the correct answer is correct."
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

// ── Item list ────────────────────────────────────────────────

function ItemList({ items, onEdit, onToggleActive }) {
  const [filterPool, setFilterPool] = useState('all')

  const visible = filterPool === 'all' ? items : items.filter(i => i.pool === filterPool)

  return (
    <div className="item-list">
      <div className="list-toolbar">
        <select value={filterPool} onChange={e => setFilterPool(e.target.value)}>
          <option value="all">All pools ({items.length})</option>
          {POOLS.map(p => (
            <option key={p} value={p}>{p} ({items.filter(i => i.pool === p).length})</option>
          ))}
        </select>
      </div>

      <table className="items-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Pool</th>
            <th>Band</th>
            <th>Modality</th>
            <th>Construct</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visible.map(item => (
            <tr key={item.id} className={item.active ? '' : 'row-inactive'}>
              <td><code>{item.id}</code></td>
              <td>{item.pool}</td>
              <td>{item.band}</td>
              <td>{item.modality}</td>
              <td>{item.construct}</td>
              <td>
                <button
                  className={`btn-toggle ${item.active ? 'active' : 'inactive'}`}
                  onClick={() => onToggleActive(item)}
                  aria-pressed={item.active}
                  aria-label={item.active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                >
                  {item.active ? 'Active' : 'Inactive'}
                </button>
              </td>
              <td>
                <button className="btn-edit" onClick={() => onEdit(item)}>Edit</button>
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
  const [items, setItems] = useState([])
  const [view, setView] = useState('list') // 'list' | 'new' | 'edit'
  const [editTarget, setEditTarget] = useState(null)

  useEffect(() => {
    if (unlocked) fetchAllItems().then(setItems)
  }, [unlocked])

  function refresh() {
    fetchAllItems().then(setItems)
    setView('list')
    setEditTarget(null)
  }

  async function handleToggleActive(item) {
    await updateItem(item.id, { active: !item.active })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, active: !i.active } : i))
  }

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <h1>Item bank</h1>
        {view === 'list' && (
          <button className="btn-new" onClick={() => setView('new')}>+ New item</button>
        )}
      </div>

      {view === 'list' && (
        <ItemList
          items={items}
          onEdit={item => { setEditTarget(item); setView('edit') }}
          onToggleActive={handleToggleActive}
        />
      )}

      {view === 'new' && (
        <>
          <h2>New item</h2>
          <ItemForm onSave={refresh} onCancel={() => setView('list')} />
        </>
      )}

      {view === 'edit' && editTarget && (
        <>
          <h2>Edit — <code>{editTarget.id}</code></h2>
          <ItemForm initial={editTarget} onSave={refresh} onCancel={() => setView('list')} />
        </>
      )}
    </div>
  )
}
