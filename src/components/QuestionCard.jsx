import { useState } from 'react'
import AudioPlayer from './AudioPlayer'

const OPTION_LABELS = ['A', 'B', 'C', 'D']

export default function QuestionCard({ item, selected, onSelect, onFlag, existingFlag }) {
  const [showFlagForm, setShowFlagForm] = useState(false)
  const [flagInput, setFlagInput] = useState('')

  function handleFlagSubmit(e) {
    e.preventDefault()
    const comment = flagInput.trim()
    if (!comment) return
    onFlag(comment)
    setFlagInput('')
    setShowFlagForm(false)
  }

  return (
    <div className="question-card">
      {item.stimulus && (
        <div className="stimulus" aria-label="Reading passage">
          <p>{item.stimulus}</p>
        </div>
      )}

      {item.modality === 'listening' && (
        <AudioPlayer audioRef={item.audioRef} maxPlays={item.maxPlays} />
      )}

      <fieldset className="question-fieldset">
        <legend className="question">{item.question}</legend>
        <ul className="options">
          {item.options.map((text, i) => {
            const label = OPTION_LABELS[i]
            return (
              <li key={label}>
                <button
                  className={`option-btn${selected === label ? ' selected' : ''}`}
                  onClick={() => onSelect(label)}
                  aria-pressed={selected === label}
                >
                  <span className="option-label" aria-hidden="true">{label}</span>
                  <span className="option-text">{text}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </fieldset>

      {onFlag && (
        <div className="flag-area">
          {existingFlag ? (
            <span className="flag-indicator" aria-label="You flagged this item">
              Flagged: &ldquo;{existingFlag}&rdquo;
            </span>
          ) : showFlagForm ? (
            <form className="flag-form" onSubmit={handleFlagSubmit}>
              <input
                type="text"
                className="flag-input"
                value={flagInput}
                onChange={e => setFlagInput(e.target.value)}
                placeholder="What seems wrong with this question?"
                autoFocus
                maxLength={200}
                aria-label="Flag comment"
              />
              <button type="submit" className="btn-flag-submit" disabled={!flagInput.trim()}>
                Submit
              </button>
              <button
                type="button"
                className="btn-flag-cancel"
                onClick={() => { setShowFlagForm(false); setFlagInput('') }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              className="btn-flag"
              onClick={() => setShowFlagForm(true)}
              aria-label="Flag this question as problematic"
            >
              ? Flag question
            </button>
          )}
        </div>
      )}
    </div>
  )
}
