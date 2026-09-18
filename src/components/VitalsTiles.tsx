import { useState } from 'react'
import type { Field } from '../types.ts'

interface VitalTileProps {
  field: Field
  correctedValue: string | undefined
  showSources: boolean
  onCorrect: (fieldId: string, value: string) => void
}

function VitalTile({ field, correctedValue, showSources, onCorrect }: VitalTileProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(correctedValue ?? field.value)

  const isCorrected = correctedValue !== undefined
  const value = correctedValue ?? field.value
  const flagged = field.flag !== undefined && !isCorrected

  return (
    <article className={`vital${flagged ? ' vital-flag' : ''}${isCorrected ? ' vital-confirmed' : ''}`}>
      <span className="vital-label">{field.label}</span>
      {editing ? (
        <form
          className="vital-edit"
          onSubmit={(event) => {
            event.preventDefault()
            onCorrect(field.id, draft.trim() || field.value)
            setEditing(false)
          }}
        >
          <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} aria-label={`Correct ${field.label}`} />
          <button type="submit">✓</button>
        </form>
      ) : (
        <>
          <b>{value}</b>
          {flagged && <span className="vital-note">⚠ {field.flag}</span>}
          {isCorrected && <span className="vital-ok">patient confirmed</span>}
          {showSources && <i className="vital-source">{field.reasoning}</i>}
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
    </article>
  )
}

interface VitalsTilesProps {
  fields: readonly Field[]
  corrections: Record<string, string>
  showSources: boolean
  onCorrect: (fieldId: string, value: string) => void
}

export function VitalsTiles({ fields, corrections, showSources, onCorrect }: VitalsTilesProps) {
  return (
    <div className="vitals">
      {fields.map((field) => (
        <VitalTile
          key={field.id}
          field={field}
          correctedValue={corrections[field.id]}
          showSources={showSources}
          onCorrect={onCorrect}
        />
      ))}
    </div>
  )
}
