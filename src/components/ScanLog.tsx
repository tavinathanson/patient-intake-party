import { useEffect, useState } from 'react'

interface ScanLogProps {
  lines: readonly string[]
  onComplete: () => void
}

const LINE_DELAY_MS = 380
const FINAL_PAUSE_MS = 900

export function ScanLog({ lines, onComplete }: ScanLogProps) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (shown >= lines.length) {
      const done = window.setTimeout(onComplete, FINAL_PAUSE_MS)
      return () => window.clearTimeout(done)
    }
    // Slightly irregular timing reads as work being done rather than a loop.
    const jitter = shown % 3 === 0 ? 240 : 0
    const next = window.setTimeout(() => setShown((count) => count + 1), LINE_DELAY_MS + jitter)
    return () => window.clearTimeout(next)
  }, [shown, lines.length, onComplete])

  return (
    <ol className="scanlog">
      {lines.slice(0, shown).map((line, index) => (
        <li key={line + String(index)}>{line}</li>
      ))}
      {shown < lines.length && <li className="scanlog-cursor">▋</li>}
    </ol>
  )
}
