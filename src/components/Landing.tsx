import { useState } from 'react'
import { TICKER_EVENTS } from '../oracle/lore.ts'
import { requestPlatformBiometric } from '../biometrics.ts'
import { KNOWN_PATIENTS } from '../patients.ts'

interface LandingProps {
  name: string
  dob: string
  onNameChange: (value: string) => void
  onDobChange: (value: string) => void
  onSubmit: () => void
}

const NAV = ['Services', 'Providers', 'Security', 'Careers'] as const

const STEPS = [
  {
    number: '01',
    title: 'Type your name',
    body: 'And your birthday. That is the whole intake. Our systems take it from there — and by "our systems" we mean the sky.',
  },
  {
    number: '02',
    title: 'We interrogate the exchanges',
    body: 'Epic, Cerner, your pharmacy, your insurer, the ephemeris. Six regional nodes are probed in under twenty seconds.',
  },
  {
    number: '03',
    title: 'Your file appears',
    body: 'Diagnoses, vitals, insurance, the sealed annexes. Everything a real intake form would have asked you to remember.',
  },
] as const

// Seven nodes, six of them cooperating. The one that is down is always the one
// that is down.
function HeroConsole() {
  const nodes = [
    { x: 30, y: 40 }, { x: 96, y: 22 }, { x: 160, y: 52 }, { x: 214, y: 30 },
    { x: 68, y: 104 }, { x: 140, y: 118 }, { x: 206, y: 94 },
  ]
  return (
    <div className="hero-console">
      <span className="console-chip console-chip-top">ENCRYPTION: AES-256-GCM</span>
      <svg viewBox="0 0 244 150" role="img" aria-label="Network of connected health-system nodes">
        <defs>
          <pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V16" fill="none" stroke="rgba(61,220,132,0.10)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="244" height="150" fill="url(#grid)" />
        {nodes.slice(0, -1).map((node, index) => {
          const next = nodes[index + 1]
          return next ? (
            <line key={`${String(node.x)}-link`} x1={node.x} y1={node.y} x2={next.x} y2={next.y}
              stroke="rgba(61,220,132,0.28)" strokeWidth="1" />
          ) : null
        })}
        {nodes.map((node, index) => (
          <circle key={`${String(node.x)}-${String(node.y)}`} cx={node.x} cy={node.y} r={index === 3 ? 4 : 3.2}
            className={index === 3 ? 'node-down' : 'node-up'} />
        ))}
        <line className="console-sweep" x1="0" y1="0" x2="244" y2="0" />
      </svg>
      <span className="console-chip console-chip-bottom">EHR LINK: ACTIVE · 6/7 NODES</span>
    </div>
  )
}

export function Landing({ name, dob, onNameChange, onDobChange, onSubmit }: LandingProps) {
  const [biometricNote, setBiometricNote] = useState('')

  // The "skip the form" button. It runs a genuine platform-authenticator
  // prompt, then admits it has no idea who you are.
  async function tryBiometric() {
    setBiometricNote('Querying dermal signature registry…')
    const outcome = await requestPlatformBiometric(name || 'unidentified patient')
    setBiometricNote(
      outcome === 'passed'
        ? 'Fingerprint matched against 0 of 17,204,881 records. Please type your name like everyone else.'
        : outcome === 'unsupported'
          ? 'No sensor on this device. Our network is vast but it is not that vast.'
          : 'Scan declined. We have logged that you are hiding something.',
    )
  }

  return (
    <div className="landing">
      <nav className="nav">
        <div className="brand">
          <span className="brand-mark">◉</span>
          <span>
            <b>23 AND GUESS</b>
            <i>TELEHEALTH CLINIC</i>
          </span>
        </div>
        <ul>
          {NAV.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <button type="button" className="portal">Patient Portal</button>
      </nav>

      <div className="ticker">
        <div className="ticker-track">
          {[...TICKER_EVENTS, ...TICKER_EVENTS].map((event, index) => (
            <span key={`${event}-${String(index)}`}>
              • {event} · {String((index % 9) * 4 + 2)}s ago
            </span>
          ))}
        </div>
      </div>

      <section className="hero">
        <div className="hero-copy">
          <span className="pill">⬡ HIPAA-COMPLIANT RECORD RETRIEVAL</span>
          <h1>
            Your complete medical history.
            <em>Already filed.</em>
          </h1>
          <p className="lede">
            No clipboards. No waiting room. Just your name and your birthday — and our proprietary
            network of connected health systems quietly does the rest.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              onSubmit()
            }}
          >
            <div className="hero-inputs">
              <input
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="Enter your full legal name"
                aria-label="Full legal name"
              />
              <input
                type="date"
                value={dob}
                onChange={(event) => onDobChange(event.target.value)}
                aria-label="Date of birth"
              />
              <button type="submit" className="primary" disabled={!name.trim() || !dob}>
                Locate my record
              </button>
            </div>
          </form>

          <div className="or">OR</div>
          <button type="button" className="outline" onClick={() => void tryBiometric()}>
            ⊙ Find me by biometric
          </button>
          {biometricNote && <p className="biometric-note">{biometricNote}</p>}

          <ul className="badges">
            <li>⬡ HIPAA compliant</li>
            <li>▤ SOC 2 Type II</li>
            <li>⊞ 256-bit encryption</li>
            <li>◈ 17,204,881 charts inferred</li>
          </ul>

          <p className="consent">
            By retrieving your record you consent to our Terms, our Privacy Policy, and several
            things that aren&rsquo;t written down anywhere.
          </p>

          <div className="samples">
            <span>Registered patients on file:</span>
            {KNOWN_PATIENTS.map((patient) => (
              <button
                key={patient.name}
                type="button"
                className="sample"
                onClick={() => {
                  onNameChange(patient.name)
                  onDobChange(patient.dob)
                }}
              >
                {patient.name}
              </button>
            ))}
          </div>
        </div>

        <HeroConsole />
      </section>

      <section className="steps">
        {STEPS.map((step) => (
          <article key={step.number}>
            <header>
              <span className="step-icon">◱</span>
              <span className="step-number">{step.number}</span>
            </header>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
