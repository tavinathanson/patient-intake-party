import { hashString, makeRandom } from '../oracle/seed.ts'

// Decorative. A barcode is the fastest way to make a web page look like it came
// out of a hospital printer.
export function Barcode({ seed }: { seed: string }) {
  const random = makeRandom(hashString(seed))
  const bars: { x: number; width: number }[] = []
  let x = 0
  while (x < 168) {
    const width = random() > 0.72 ? 3 : 1
    bars.push({ x, width })
    x += width + (random() > 0.5 ? 2 : 1)
  }
  return (
    <div className="barcode">
      <svg viewBox="0 0 172 40" role="presentation">
        {bars.map((bar) => (
          <rect key={bar.x} x={bar.x} y="0" width={bar.width} height="40" fill="currentColor" />
        ))}
      </svg>
      <span>{seed.replace(/[^A-Z0-9]/gi, '')}</span>
    </div>
  )
}
