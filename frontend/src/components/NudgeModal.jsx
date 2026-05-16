import { useEffect, useRef, useState } from 'react'
import { parseEnglishNumber } from '../utils/parseEnglishNumber'

export default function NudgeModal({ onContinue, onKill }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const parsed = input.trim() ? parseEnglishNumber(input) : null
  const valid = parsed !== null && parsed >= 1 && parsed <= 100

  let hint = null
  if (input.trim()) {
    hint = valid
      ? { ok: true, text: `→ ${parsed} video${parsed === 1 ? '' : 's'}` }
      : { ok: false, text: 'not a valid number from one to one hundred' }
  }

  const handleContinue = () => {
    if (valid) onContinue(parsed)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && valid) handleContinue()
  }

  return (
    <div className="nudge-backdrop">
      <div className="nudge-card">
        <p className="nudge-heading">
          Oi bruv, you've been watching for a while. Do you want to keep watching?
        </p>
        <p className="nudge-subheading">
          How many more videos before I check in again?
        </p>
        <input
          ref={inputRef}
          className="nudge-input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='e.g. "fifteen"'
          autoComplete="off"
          spellCheck={false}
        />
        {hint && (
          <p className={`nudge-hint nudge-hint--${hint.ok ? 'ok' : 'err'}`}>
            {hint.text}
          </p>
        )}
        <div className="nudge-actions">
          <button
            className="nudge-btn"
            onClick={handleContinue}
            disabled={!valid}
          >
            Continue watching
          </button>
          <button
            className="nudge-btn nudge-btn--kill"
            onClick={onKill}
          >
            Kill the app
          </button>
        </div>
      </div>
    </div>
  )
}
