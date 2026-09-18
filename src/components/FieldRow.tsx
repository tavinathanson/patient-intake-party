import { useState } from 'react'
import type { Field, Provenance } from '../types.ts'

const PROVENANCE_LABEL: Record<Provenance, string> = {
  record: 'public record',
  astrological: 'astrology',
  numerological: 'numerology',
  vibes: 'vibes',
  confirmed: 'you confirmed',
}

interface FieldRowProps {
  field: Field
  correctedValue: string | undefined
  showSources: boolean
  onCorrect: (fieldId: string, value: string) => void
}

export function FieldRow({ field, correctedValue, showSources, onCorrect }: FieldRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(correctedValue ?? field.value)

  const isCorrected = correctedValue !== undefined
  const provenance: Provenance = isCorrected ? 'confirmed' : field.provenance
  const value = correctedValue ?? field.value
  // A corrected field always shows its badge, even with sources hidden —
  // otherwise the patient's one contribution vanishes into the document.
  const exposed = showSources || isCorrected

  return (
    <div className={`rec-field prov-${provenance}${exposed ? ' exposed' : ''}`}>
      <div className="rec-label">{field.label}</div>

      {editing ? (
        <form
          className="rec-edit"
          onSubmit={(event) => {
            event.preventDefault()
            onCorrect(field.id, draft.trim() || field.value)
            setEditing(false)
          }}
        >
          <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} aria-label={`Correct ${field.label}`} />
          <button type="submit">Save</button>
          <button type="button" className="ghost" onClick={() => setEditing(false)}>Cancel</button>
        </form>
      ) : (
        <>
          <div className="rec-value">
            {field.codes && !isCorrected ? (
              <ul className="code-list">
                {field.codes.map((item) => (
                  <li key={item.code}>
                    <span>{item.label}</span>
                    <code>{item.code}</code>
                  </li>
                ))}
              </ul>
            ) : (
              value
            )}
          </div>
          {exposed && (
            <div className="rec-source">
              <span className="prov-chip">{PROVENANCE_LABEL[provenance]}</span>
              <i>{isCorrected ? 'Corrected by the patient.' : field.reasoning}</i>
            </div>
          )}
          <button
            type="button"
            className="rec-wrong"
            onClick={() => {
              setDraft(value)
              setEditing(true)
            }}
          >
            {isCorrected ? 'edit' : 'wrong?'}
          </button>
        </>
      )}
    </div>
  )
}
