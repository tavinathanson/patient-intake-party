import { useEffect, useState } from 'react'
import type { TraceLine } from '../types.ts'

interface TerminalProps {
  lines: readonly TraceLine[]
  onComplete: () => void
}

const PLAIN_LINE_MS = 260
const BAR_LINE_MS = 820
const FINAL_PAUSE_MS = 1100

// A probe line owns its own percentage so the number climbs independently of
// the parent's reveal timer. Once the next line appears the bar is resolved and
// the tag replaces the percentage.
function ProbeRow({ line, resolved }: { line: TraceLine; resolved: boolean }) {
  const [percent, setPercent] = useState(0)

  useEffect(() => {
    if (resolved) {
      setPercent(100)
      return
    }
    const tick = window.setInterval(() => {
      setPercent((current) => (current >= 94 ? 94 : current + Math.ceil(Math.random() * 9)))
    }, 70)
    return () => window.clearInterval(tick)
  }, [resolved])

  return (
    <li className="term-line term-probe">
      <div className="term-probe-head">
        <span className="term-arrow">&gt;</span>
        <span>{line.text}</span>
        <span className={resolved ? 'term-tag' : 'term-percent'}>{resolved ? line.tag : `${percent}%`}</span>
      </div>
      <div className="term-bar">
        <i style={{ width: `${percent}%` }} />
      </div>
    </li>
  )
}

export function Terminal({ lines, onComplete }: TerminalProps) {
  const [shown, setShown] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [packets, setPackets] = useState(0)

  useEffect(() => {
    const tick = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    const flow = window.setInterval(() => setPackets((value) => value + Math.floor(Math.random() * 9000) + 3000), 90)
    return () => {
      window.clearInterval(tick)
      window.clearInterval(flow)
    }
  }, [])

  useEffect(() => {
    if (shown >= lines.length) {
      const done = window.setTimeout(onComplete, FINAL_PAUSE_MS)
      return () => window.clearTimeout(done)
    }
    const current = lines[shown]
    const delay = current?.bar ? BAR_LINE_MS : PLAIN_LINE_MS
    const next = window.setTimeout(() => setShown((count) => count + 1), delay)
    return () => window.clearTimeout(next)
  }, [shown, lines, onComplete])

  return (
    <div className="terminal-wrap">
      <div className="terminal">
        <header className="term-chrome">
          <span className="term-dots">
            <i /><i /><i />
          </span>
          <span className="term-title">MEDTRACE SECURE SHELL — tor circuit: 7 hops</span>
          <span className="term-meta">
            <span>EXIT: REYKJAVIK-03</span>
            <span className="term-clock">T+{seconds}s</span>
          </span>
        </header>

        <ol className="term-body">
          {lines.slice(0, shown).map((line, index) => {
            const key = `${line.text}-${String(index)}`
            if (line.bar) return <ProbeRow key={key} line={line} resolved={index < shown - 1} />
            return (
              <li key={key} className={`term-line term-${line.kind}`}>
                {line.kind === 'prompt' && <span className="term-prompt">➜ ~ </span>}
                <span>{line.text}</span>
                {line.tag && <span className="term-tag"> {line.tag}</span>}
              </li>
            )
          })}
          {shown < lines.length && <li className="term-caret">▋</li>}
        </ol>

        <footer className="term-status">
          <span className="term-spinner" />
          <span>interrogating health information exchanges…</span>
          <span className="term-packets">packets {String(packets).padStart(9, '0')}</span>
        </footer>
      </div>
      <p className="term-warning">Do not close this window. Your records are… almost yours again.</p>
    </div>
  )
}
