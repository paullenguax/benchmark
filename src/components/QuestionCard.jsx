import { useState, useRef } from 'react'
import AudioPlayer from './AudioPlayer'

const OPTION_LABELS = ['A', 'B', 'C', 'D']

export default function QuestionCard({ item, selected, onSelect, onFlag, existingFlag }) {
  const [showFlagForm, setShowFlagForm] = useState(false)
  const [flagInput, setFlagInput] = useState('')
  const optionRefs = useRef([])

  function handleFlagSubmit(e) {
    e.preventDefault()
    const comment = flagInput.trim()
    if (!comment) return
    onFlag(comment)
    setFlagInput('')
    setShowFlagForm(false)
  }

  // Arrow keys move focus *and* selection between options, same as a native
  // radio group — wraps at either end. Enter/Space still select via the
  // button's own native activation, no extra handling needed for that.
  function handleOptionKeyDown(e, i) {
    let next = null
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % item.options.length
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + item.options.length) % item.options.length
    if (next === null) return
    e.preventDefault()
    onSelect(OPTION_LABELS[next])
    optionRefs.current[next]?.focus()
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
        <ul className="options" role="radiogroup" aria-label="Answer options">
          {item.options.map((text, i) => {
            const label = OPTION_LABELS[i]
            const isSelected = selected === label
            return (
              <li key={label}>
                <button
                  ref={el => { optionRefs.current[i] = el }}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected || (!selected && i === 0) ? 0 : -1}
                  className={`option-btn${isSelected ? ' selected' : ''}`}
                  onClick={() => onSelect(label)}
                  onKeyDown={e => handleOptionKeyDown(e, i)}
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
