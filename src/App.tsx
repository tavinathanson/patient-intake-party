import { useCallback, useMemo, useRef, useState } from 'react'
import type { Dossier, GateId } from './types.ts'
import { buildDossier } from './oracle/index.ts'
import { runSearch } from './search-client.ts'
import { GATES } from './gates.ts'
import { KNOWN_PATIENTS, findKnownPatient } from './patients.ts'
import { ScanLog } from './components/ScanLog.tsx'
import { BiorhythmChart } from './components/BiorhythmChart.tsx'
import { FieldRow } from './components/FieldRow.tsx'
import { GateCard } from './components/GateCard.tsx'
import { Receipt, TRUSTED_FIELD_IDS } from './components/Receipt.tsx'

type Phase = 'ask' | 'scanning' | 'report' | 'receipt'

export default function App() {
  const [phase, setPhase] = useState<Phase>('ask')
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [unlocked, setUnlocked] = useState<GateId[]>([])
  const [corrections, setCorrections] = useState<Record<string, string>>({})
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(0)

  const knownPatient = useMemo(() => findKnownPatient(name, dob), [name, dob])

  const allFields = useMemo(
    () => dossier?.sections.flatMap((section) => section.fields) ?? [],
    [dossier],
  )

  // Two numbers, deliberately in tension: how sure we are you are you, versus
  // how much of this page a human has actually looked at.
  const identityConfidence = Math.min(100, 40 + unlocked.length * 20)
  const trusted: readonly string[] = TRUSTED_FIELD_IDS
  const confirmedCount = allFields.filter(
    (field) => corrections[field.id] !== undefined || trusted.includes(field.id),
  ).length
  const clinicalConfidence = allFields.length === 0
    ? 0
    : Math.round((confirmedCount / allFields.length) * 100)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !dob) return
    startedAt.current = performance.now()
    setPhase('scanning')
    const search = await runSearch(name.trim())
    setDossier(buildDossier(name.trim(), dob, search))
  }

  const finishScan = useCallback(() => {
    setElapsed((performance.now() - startedAt.current) / 1000)
    setPhase('report')
  }, [])

  function correctField(fieldId: string, value: string) {
    setCorrections((current) => ({ ...current, [fieldId]: value }))
  }

  function restart() {
    setPhase('ask')
    setName('')
    setDob('')
    setDossier(null)
    setUnlocked([])
    setCorrections({})
  }

  return (
    <div className="page">
      <header className="masthead">
        <span className="wordmark">23andGuess</span>
        <span className="tagline">intake in four seconds</span>
      </header>

      {phase === 'ask' && (
        <section className="ask">
          <h1>Intake takes twenty minutes.</h1>
          <p className="lede">We can do it in four. We only need your name and your birthday.</p>
          <form onSubmit={handleSubmit}>
            <label>
              Full name
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Plum Kohlrabi" />
            </label>
            <label>
              Date of birth
              <input type="date" value={dob} onChange={(event) => setDob(event.target.value)} />
            </label>
            <button type="submit" className="primary" disabled={!name.trim() || !dob}>
              Find me
            </button>
          </form>
          <div className="samples">
            <span>Or use a patient from this repo:</span>
            {KNOWN_PATIENTS.map((patient) => (
              <button
                key={patient.name}
                type="button"
                className="ghost small"
                onClick={() => {
                  setName(patient.name)
                  setDob(patient.dob)
                }}
              >
                {patient.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {phase === 'scanning' && (
        <section className="scanning">
          {dossier ? (
            <ScanLog lines={dossier.trace} onComplete={finishScan} />
          ) : (
            <ol className="scanlog">
              <li>Querying open web for &ldquo;{name}&rdquo;…</li>
              <li className="scanlog-cursor">▋</li>
            </ol>
          )}
        </section>
      )}

      {phase === 'report' && dossier && (
        <section className="report">
          <div className="stats">
            <div>
              <b>{elapsed.toFixed(1)}s</b>
              <span>elapsed</span>
            </div>
            <div>
              <b>100%</b>
              <span>form complete</span>
            </div>
            <div>
              <b>{identityConfidence}%</b>
              <span>identity verified</span>
            </div>
            <div className="stat-warn">
              <b>{clinicalConfidence}%</b>
              <span>clinically confirmed</span>
            </div>
          </div>

          <div className="chart-card">
            <p>
              {dossier.sign}, Life Path {dossier.lifePath} ({dossier.lifePathName}), year of the{' '}
              {dossier.chineseAnimal}. Day {dossier.daysAlive.toLocaleString()} of life.
            </p>
            <BiorhythmChart daysAlive={dossier.daysAlive} />
          </div>

          <p className="nudge">Tap anything we got wrong. You have corrected {Object.keys(corrections).length} of {allFields.length}.</p>

          {dossier.sections.map((section) => {
            const gateSpec = section.gate === null ? null : GATES.find((gate) => gate.id === section.gate)
            const isLocked = gateSpec !== null && gateSpec !== undefined && !unlocked.includes(gateSpec.id)
            return (
              <div key={section.id} className="section">
                <h2>{section.title}</h2>
                {isLocked && gateSpec ? (
                  <GateCard
                    spec={gateSpec}
                    patientName={name}
                    onPass={() => setUnlocked((current) => (current.includes(gateSpec.id) ? current : [...current, gateSpec.id]))}
                  />
                ) : (
                  section.fields.map((field) => (
                    <FieldRow
                      key={field.id}
                      field={field}
                      correctedValue={corrections[field.id]}
                      onCorrect={correctField}
                    />
                  ))
                )}
              </div>
            )
          })}

          <button
            type="button"
            className="primary wide"
            disabled={unlocked.length < GATES.length}
            onClick={() => setPhase('receipt')}
          >
            {unlocked.length < GATES.length ? 'Complete verification to submit' : 'Send to my care team'}
          </button>
        </section>
      )}

      {phase === 'receipt' && dossier && (
        <Receipt dossier={dossier} corrections={corrections} knownPatient={knownPatient} onRestart={restart} />
      )}

      <footer className="disclaimer">
        A joke, built at a hackathon. Every clinical detail on this page is fabricated by astrology
        and a random number generator. It is not medical advice and it is not a real intake form.
        Nothing you type is stored or sent anywhere except one web search on the name.
      </footer>
    </div>
  )
}
