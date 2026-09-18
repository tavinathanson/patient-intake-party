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
  onCorrect: (fieldId: string, value: string) => void
}

export function FieldRow({ field, correctedValue, onCorrect }: FieldRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(correctedValue ?? field.value)

  const isCorrected = correctedValue !== undefined
  const provenance: Provenance = isCorrected ? 'confirmed' : field.provenance
  const value = correctedValue ?? field.value

  function save() {
    onCorrect(field.id, draft.trim() || field.value)
    setEditing(false)
  }

  return (
    <div className={`field field-${provenance}`}>
      <div className="field-label">{field.label}</div>
      <div className="field-body">
        {editing ? (
          <form
            className="field-edit"
            onSubmit={(event) => {
              event.preventDefault()
              save()
            }}
          >
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label={`Correct ${field.label}`}
            />
            <button type="submit">Save</button>
            <button type="button" className="ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <>
            <div className="field-value">{value}</div>
            <div className="field-reason">{isCorrected ? 'Corrected by the patient.' : field.reasoning}</div>
          </>
        )}
      </div>
      <div className="field-side">
        <span className="chip">{PROVENANCE_LABEL[provenance]}</span>
        {!editing && (
          <button
            type="button"
            className="ghost small"
            onClick={() => {
              setDraft(value)
              setEditing(true)
            }}
          >
            {isCorrected ? 'edit' : 'wrong?'}
          </button>
        )}
      </div>
    </div>
  )
}
