import { useEffect, useRef, useState } from 'react'
import type { GateSpec } from '../types.ts'
import { bpmFromTaps, closeCamera, openCamera, requestPlatformBiometric } from '../biometrics.ts'

interface GateCardProps {
  spec: GateSpec
  patientName: string
  onPass: () => void
}

type Status = 'idle' | 'running' | 'holding' | 'declined'

const HOLD_MS = 1600
const RETINA_MS = 3800
const REQUIRED_TAPS = 6

export function GateCard({ spec, patientName, onPass }: GateCardProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [taps, setTaps] = useState<number[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const holdTimer = useRef<number | null>(null)

  // Attach the camera stream once the <video> is actually on the page.
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream
  }, [stream])

  // If the section unmounts mid-scan, do not leave the camera light on.
  useEffect(() => () => closeCamera(stream), [stream])

  async function runTouch() {
    setStatus('running')
    setMessage('Waiting for the sensor…')
    const outcome = await requestPlatformBiometric(patientName)
    if (outcome === 'passed') {
      setMessage('Dermal signature confirmed. Declassifying section.')
      window.setTimeout(onPass, 700)
      return
    }
    if (outcome === 'unsupported') {
      setStatus('holding')
      setMessage('No sensor on this device. Press and hold the pad instead.')
      return
    }
    setStatus('declined')
    setMessage('Scan declined by the subject.')
  }

  function startHold() {
    holdTimer.current = window.setTimeout(() => {
      setMessage('Print matched.')
      onPass()
    }, HOLD_MS)
  }

  function cancelHold() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  async function runRetina() {
    setStatus('running')
    const live = await openCamera()
    setStream(live)
    setMessage(live ? 'Hold still.' : 'Camera unavailable. Estimating from context.')
    window.setTimeout(() => {
      closeCamera(live)
      setStream(null)
      setMessage('Retinal signature matched to a 91% likelihood.')
      onPass()
    }, live ? RETINA_MS : 2200)
  }

  function registerTap() {
    const next = [...taps, performance.now()]
    setTaps(next)
    if (next.length >= REQUIRED_TAPS) {
      const bpm = bpmFromTaps(next)
      setMessage(bpm === null ? 'Baseline recorded.' : `Resting rate ${String(bpm)} bpm. Baseline recorded.`)
      window.setTimeout(onPass, 900)
    }
  }

  return (
    <div className="seal">
      <div className="seal-stripe">
        <span>SEALED</span>
        <span>{spec.sealNote}</span>
      </div>
      <h4>{spec.title}</h4>
      <p className="seal-blurb">{spec.blurb}</p>
      <p className="seal-unlocks">Declassifies: {spec.unlocksLabel}</p>

      {spec.id === 'touch' && status === 'holding' && (
        <button type="button" className="pad" onPointerDown={startHold} onPointerUp={cancelHold} onPointerLeave={cancelHold}>
          hold here
        </button>
      )}

      {spec.id === 'retina' && status === 'running' && (
        <div className="retina">
          {stream ? <video ref={videoRef} autoPlay playsInline muted /> : <div className="retina-blank" />}
          <div className="retina-scanline" />
          <div className="retina-reticle" />
        </div>
      )}

      {spec.id === 'pulse' && status === 'running' && (
        <button type="button" className="pad pulse-pad" onClick={registerTap}>
          {taps.length === 0 ? 'tap with your pulse' : `${String(taps.length)} / ${String(REQUIRED_TAPS)}`}
        </button>
      )}

      {status === 'idle' && (
        <button
          type="button"
          className="primary"
          onClick={() => {
            if (spec.id === 'touch') void runTouch()
            else if (spec.id === 'retina') void runRetina()
            else setStatus('running')
          }}
        >
          {spec.cta}
        </button>
      )}

      {status === 'declined' && (
        <button type="button" className="primary" onClick={onPass}>
          Declassify without verification
        </button>
      )}

      {message && <p className="seal-message">{message}</p>}
    </div>
  )
}
