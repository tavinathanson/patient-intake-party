// Three checkpoints, two of which touch real hardware.
//
// The Touch ID one is not a mock: navigator.credentials.create() with a
// platform authenticator triggers the genuine macOS / Windows Hello system
// prompt. We throw the resulting credential away immediately. The point is the
// ceremony, not the security.

export type GateOutcome = 'passed' | 'unsupported' | 'declined'

export async function platformBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false
  if (!window.isSecureContext) return false
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export async function requestPlatformBiometric(displayName: string): Promise<GateOutcome> {
  if (!(await platformBiometricAvailable())) return 'unsupported'

  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const userId = crypto.getRandomValues(new Uint8Array(16))

  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: '23andGuess' },
        user: { id: userId, name: displayName || 'patient', displayName: displayName || 'patient' },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged',
        },
        timeout: 60_000,
        attestation: 'none',
      },
    })
    // We never send this anywhere. It exists for about one millisecond.
    return credential ? 'passed' : 'declined'
  } catch {
    return 'declined'
  }
}

export async function openCamera(): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null
  try {
    return await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
  } catch {
    return null
  }
}

export function closeCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

// Tap-tempo heart rate. Averages the gaps between taps.
export function bpmFromTaps(timestamps: readonly number[]): number | null {
  if (timestamps.length < 3) return null
  const gaps: number[] = []
  for (let index = 1; index < timestamps.length; index += 1) {
    const current = timestamps[index]
    const previous = timestamps[index - 1]
    if (current !== undefined && previous !== undefined) gaps.push(current - previous)
  }
  if (gaps.length === 0) return null
  const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
  if (mean <= 0) return null
  return Math.round(60_000 / mean)
}
