/**
 * Sounds are synthesised on the spot, no files.
 *
 * Three short signals are not worth an asset pipeline: an oscillator sounds
 * clean, weighs nothing and never has to load. Real sounds arrive with the
 * theme (A6).
 */

let context: AudioContext | null = null

function audio(): AudioContext {
  context ??= new AudioContext()
  if (context.state === 'suspended') void context.resume()
  return context
}

interface Tone {
  freq: number
  start: number
  duration: number
  gain?: number
  type?: OscillatorType
}

function play(tones: readonly Tone[]): void {
  try {
    const ctx = audio()
    const now = ctx.currentTime

    for (const tone of tones) {
      const oscillator = ctx.createOscillator()
      const envelope = ctx.createGain()
      const peak = tone.gain ?? 0.16

      oscillator.type = tone.type ?? 'sine'
      oscillator.frequency.value = tone.freq

      // Without soft edges a note comes out as a click.
      envelope.gain.setValueAtTime(0.0001, now + tone.start)
      envelope.gain.exponentialRampToValueAtTime(peak, now + tone.start + 0.015)
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.duration)

      oscillator.connect(envelope)
      envelope.connect(ctx.destination)
      oscillator.start(now + tone.start)
      oscillator.stop(now + tone.start + tone.duration + 0.02)
    }
  } catch (cause) {
    console.warn('Sound did not play:', cause)
  }
}

/** A rising triad — «got it». */
export function playCorrect(): void {
  play([
    { freq: 523.25, start: 0, duration: 0.12 },
    { freq: 659.25, start: 0.09, duration: 0.12 },
    { freq: 783.99, start: 0.18, duration: 0.26 },
  ])
}

/**
 * A soft falling second. Deliberately not a «fail» buzz: a mistake costs
 * nothing but time (P10), and the sound should not feel like punishment.
 */
export function playWrong(): void {
  play([
    { freq: 392.0, start: 0, duration: 0.16, gain: 0.12 },
    { freq: 349.23, start: 0.12, duration: 0.22, gain: 0.12 },
  ])
}

/** A short neutral puff: the equipment missed it, the child is blameless (C5). */
export function playUnheard(): void {
  play([{ freq: 300, start: 0, duration: 0.14, gain: 0.07, type: 'triangle' }])
}

/** The fanfare at the end of a session. */
export function playFinish(): void {
  play([
    { freq: 523.25, start: 0, duration: 0.14 },
    { freq: 659.25, start: 0.12, duration: 0.14 },
    { freq: 783.99, start: 0.24, duration: 0.14 },
    { freq: 1046.5, start: 0.36, duration: 0.4 },
  ])
}
