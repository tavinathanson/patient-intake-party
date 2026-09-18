import type { Dossier, GateId } from '../types.ts'
import { GATES } from '../gates.ts'
import { PROVIDERS } from '../oracle/lore.ts'
import { hashString } from '../oracle/seed.ts'
import { FieldRow } from './FieldRow.tsx'
import { VitalsTiles } from './VitalsTiles.tsx'
import { GateCard } from './GateCard.tsx'
import { Barcode } from './Barcode.tsx'
import { BiorhythmChart } from './BiorhythmChart.tsx'

interface RecordDocumentProps {
  dossier: Dossier
  corrections: Record<string, string>
  unlocked: readonly GateId[]
  showSources: boolean
  onToggleSources: () => void
  onCorrect: (fieldId: string, value: string) => void
  onUnlock: (gate: GateId) => void
  onSubmit: () => void
  onRestart: () => void
}

const YEAR_MS_RATIO = 365.25

export function RecordDocument(props: RecordDocumentProps) {
  const { dossier, corrections, unlocked, showSources } = props
  const age = Math.floor(dossier.daysAlive / YEAR_MS_RATIO)
  const provider = PROVIDERS[hashString(dossier.recordId) % PROVIDERS.length] ?? 'Alden Pruitt, MD'
  const allUnlocked = unlocked.length >= GATES.length
  const correctedCount = Object.keys(corrections).length

  // Real hostnames when the search found anything, otherwise the shell's
  // imaginary friends. Either way they are printed with total confidence.
  const sources = dossier.search.results.length > 0
    ? dossier.search.results.slice(0, 4).map((result) => {
        try {
          return new URL(result.link).hostname.replace(/^www\./, '')
        } catch {
          return 'open web'
        }
      })
    : ['Ephemeris — 12:00 assumed', 'Pythagorean letter table', 'Biorhythm sine set (23/28/33)', 'Chinese zodiac payer index']

  return (
    <div className="record-page">
      <div className="record-bar">
        <div className="brand">
          <span className="brand-mark">◉</span>
          <span><b>23 AND GUESS</b><i>TELEHEALTH CLINIC</i></span>
        </div>
        <div className="record-bar-actions">
          <span className="corrected-count">{correctedCount} field{correctedCount === 1 ? '' : 's'} corrected by you</span>
          <button type="button" className={`toggle${showSources ? ' on' : ''}`} onClick={props.onToggleSources}>
            {showSources ? '◉ Sources shown' : '◌ Show sources'}
          </button>
          <button type="button" className="outline small" onClick={props.onRestart}>Re-scan</button>
        </div>
      </div>

      <article className="record">
        <header className="record-head">
          <div>
            <span className="verified">⬡ VERIFIED RETRIEVAL — CONFIDENTIAL</span>
            <h1>Patient Intake Record</h1>
            <p className="record-meta">
              {dossier.recordId} · {dossier.mrn} · retrieved {new Date().toUTCString().slice(5, 22)} UTC
            </p>
          </div>
          <Barcode seed={dossier.recordId} />
        </header>

        {dossier.sections.map((section, index) => {
          const spec = section.gate === null ? null : GATES.find((gate) => gate.id === section.gate)
          const sealed = spec !== null && spec !== undefined && !unlocked.includes(spec.id)
          return (
            <section key={section.id} className="record-section">
              <h2><span className="sec-num">§{index + 1}</span> {section.title}</h2>

              {sealed && spec ? (
                <GateCard spec={spec} patientName={dossier.name} onPass={() => props.onUnlock(spec.id)} />
              ) : section.layout === 'tiles' ? (
                <VitalsTiles
                  fields={section.fields}
                  corrections={corrections}
                  showSources={showSources}
                  onCorrect={props.onCorrect}
                />
              ) : (
                <div className="rec-grid">
                  {section.fields.map((field) => (
                    <FieldRow
                      key={field.id}
                      field={field}
                      correctedValue={corrections[field.id]}
                      showSources={showSources}
                      onCorrect={props.onCorrect}
                    />
                  ))}
                </div>
              )}

              {section.id === 'vitals' && (
                <div className="telemetry">
                  <span className="telemetry-label">
                    ancillary telemetry · {dossier.sign} · Life Path {dossier.lifePath} ({dossier.lifePathName}) · year of the {dossier.chineseAnimal}
                  </span>
                  <BiorhythmChart daysAlive={dossier.daysAlive} />
                </div>
              )}
            </section>
          )
        })}

        {allUnlocked && (
          <section className="record-section">
            <h2><span className="sec-num">§6</span> Provider assessment</h2>
            <div className="assessment">
              <div className="assessment-head">
                <div>
                  <b>Dr. {provider}</b>
                  <span>Internal Medicine · NPI {String(hashString(provider) % 9_999_999_999).padStart(10, '0')}</span>
                </div>
                <span className="next-visit">next visit: whenever</span>
              </div>
              <p>
                Patient presents as a {age}-year-old reviewed via remote intake. History corroborated
                across {sources.length} connected systems and one ephemeris. {dossier.sign} placement
                governs {dossier.signRules}, which is consistent with everything we decided earlier.
                Patient reports good adherence and denies chest pain, shortness of breath, or syncope,
                though the patient was never asked. Discussed lifestyle modification; patient agreed to
                &ldquo;probably think about it.&rdquo; No acute distress noted during an encounter that did
                not occur.
              </p>
              <p className="plan">
                <b>Plan:</b> 6-week follow-up · repeat lipid panel · home BP log ×14 days · re-cast chart
                if symptoms persist
              </p>
              <p className="signed">
                Electronically signed {new Date().toISOString().slice(0, 10)} — signature on file (probably)
              </p>
            </div>
          </section>
        )}

        <div className="corroborated">
          <span className="corroborated-label">CORROBORATED ACROSS</span>
          <ul>
            {sources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </div>

        <footer className="record-foot">
          <span>⎘ Sealed annexes: {GATES.length - unlocked.length}</span>
          <span>CONFIDENTIAL — disclosure governed by nothing · Form 23GS-INTAKE (rev. 2026.09)</span>
        </footer>
      </article>

      <button type="button" className="primary wide" disabled={!allUnlocked} onClick={props.onSubmit}>
        {allUnlocked ? 'Submit record to my care team' : `Declassify ${String(GATES.length - unlocked.length)} more section(s) to submit`}
      </button>
    </div>
  )
}
