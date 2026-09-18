import { useCallback, useMemo, useRef, useState } from 'react'
import type { Dossier, GateId } from './types.ts'
import { buildDossier } from './oracle/index.ts'
import { runSearch } from './search-client.ts'
import { findKnownPatient } from './patients.ts'
import { Landing } from './components/Landing.tsx'
import { Terminal } from './components/Terminal.tsx'
import { RecordDocument } from './components/RecordDocument.tsx'
import { Receipt } from './components/Receipt.tsx'

type Phase = 'landing' | 'scanning' | 'record' | 'receipt'

export default function App() {
  const [phase, setPhase] = useState<Phase>('landing')
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [unlocked, setUnlocked] = useState<GateId[]>([])
  const [corrections, setCorrections] = useState<Record<string, string>>({})
  const [showSources, setShowSources] = useState(false)
  const startedAt = useRef(0)

  const knownPatient = useMemo(() => findKnownPatient(name, dob), [name, dob])

  async function locateRecord() {
    if (!name.trim() || !dob) return
    startedAt.current = performance.now()
    setPhase('scanning')
    const search = await runSearch(name.trim())
    setDossier(buildDossier(name.trim(), dob, search))
  }

  const finishScan = useCallback(() => setPhase('record'), [])

  function correctField(fieldId: string, value: string) {
    setCorrections((current) => ({ ...current, [fieldId]: value }))
  }

  function restart() {
    setPhase('landing')
    setName('')
    setDob('')
    setDossier(null)
    setUnlocked([])
    setCorrections({})
    setShowSources(false)
  }

  return (
    <div className="app">
      {phase === 'landing' && (
        <Landing
          name={name}
          dob={dob}
          onNameChange={setName}
          onDobChange={setDob}
          onSubmit={() => void locateRecord()}
        />
      )}

      {phase === 'scanning' && (
        <div className="scan-stage">
          {dossier ? (
            <Terminal lines={dossier.trace} onComplete={finishScan} />
          ) : (
            <div className="terminal-wrap">
              <div className="terminal">
                <ol className="term-body">
                  <li className="term-line term-prompt-line">
                    <span className="term-prompt">➜ ~ </span>
                    <span>medtrace --locate --deep-scan &quot;{name}&quot;</span>
                  </li>
                  <li className="term-caret">▋</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'record' && dossier && (
        <RecordDocument
          dossier={dossier}
          corrections={corrections}
          unlocked={unlocked}
          showSources={showSources}
          onToggleSources={() => setShowSources((value) => !value)}
          onCorrect={correctField}
          onUnlock={(gate) => setUnlocked((current) => (current.includes(gate) ? current : [...current, gate]))}
          onSubmit={() => setPhase('receipt')}
          onRestart={restart}
        />
      )}

      {phase === 'receipt' && dossier && (
        <Receipt dossier={dossier} corrections={corrections} knownPatient={knownPatient} onRestart={restart} />
      )}

      <footer className="disclaimer">
        23 AND GUESS Telehealth Clinic is a parody built at a hackathon. It is not a real healthcare
        provider, it cannot access any medical record, and every clinical finding on this page is
        fabricated from astrology, numerology and a random number generator. Not medical advice.
        Nothing you type is stored; the only thing that leaves your browser is a single web search
        on the name you enter.
      </footer>
    </div>
  )
}
