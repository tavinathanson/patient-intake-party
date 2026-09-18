interface BiorhythmChartProps {
  daysAlive: number
}

const CYCLES = [
  { label: 'physical', period: 23, colour: 'var(--astro)' },
  { label: 'emotional', period: 28, colour: 'var(--numero)' },
  { label: 'intellectual', period: 33, colour: 'var(--record)' },
] as const

const WIDTH = 520
const HEIGHT = 110
const SPAN_DAYS = 30 // half-window either side of today

function pathFor(daysAlive: number, period: number): string {
  const points: string[] = []
  for (let offset = -SPAN_DAYS; offset <= SPAN_DAYS; offset += 1) {
    const value = Math.sin((2 * Math.PI * (daysAlive + offset)) / period)
    const x = ((offset + SPAN_DAYS) / (SPAN_DAYS * 2)) * WIDTH
    const y = HEIGHT / 2 - value * (HEIGHT / 2 - 6)
    points.push(`${offset === -SPAN_DAYS ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return points.join(' ')
}

// Three sine waves off a single date. Completely meaningless, genuinely pretty,
// and it makes the rest of the page look like it was calculated.
export function BiorhythmChart({ daysAlive }: BiorhythmChartProps) {
  return (
    <figure className="biorhythm">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Biorhythm chart, sixty day window">
        <line x1="0" y1={HEIGHT / 2} x2={WIDTH} y2={HEIGHT / 2} className="biorhythm-axis" />
        <line x1={WIDTH / 2} y1="0" x2={WIDTH / 2} y2={HEIGHT} className="biorhythm-today" />
        {CYCLES.map((cycle) => (
          <path key={cycle.label} d={pathFor(daysAlive, cycle.period)} stroke={cycle.colour} fill="none" strokeWidth="1.6" />
        ))}
      </svg>
      <figcaption>
        {CYCLES.map((cycle) => (
          <span key={cycle.label}>
            <i style={{ background: cycle.colour }} />
            {cycle.label} · {cycle.period}d
          </span>
        ))}
        <span className="biorhythm-now">today</span>
      </figcaption>
    </figure>
  )
}
