import AudioPlayer from './AudioPlayer'

const OPTION_LABELS = ['A', 'B', 'C', 'D']

export default function QuestionCard({ item, selected, onSelect }) {
  return (
    <div className="question-card">
      {item.stimulus && (
        <div className="stimulus" aria-label="Reading passage">
          <p>{item.stimulus}</p>
        </div>
      )}

      {item.modality === 'listening' && (
        <AudioPlayer audioRef={item.audioRef} />
      )}

      {/*
        fieldset + legend groups the question with its options so screen readers
        announce the question text when focus moves to any option button.
      */}
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
    </div>
  )
}
