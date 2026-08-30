import { createModel, type Model } from 'vosk-browser'
import type { SpeechRecognizer } from '@/core/ports'

/** Loudness below this counts as silence. Tuned in phase 1. */
const SILENCE_RMS = 0.012
/** How much silence after speech we wait through before closing recognition. */
const SILENCE_AFTER_SPEECH_MS = 700
/** If the child said nothing at all — do not hang around forever. */
const NO_SPEECH_TIMEOUT_MS = 6000
/** A backstop against endless mumbling. */
const MAX_LISTEN_MS = 12000

/**
 * Speech recognition through vosk-browser (T3): Kaldi built to WebAssembly.
 * Runs offline, with the model held locally (P5).
 *
 * It implements the SpeechRecognizer port, so the core knows nothing of WASM,
 * microphones or AudioContext (A1).
 */
export class VoskRecognizer implements SpeechRecognizer {
  private model: Model | null = null
  private loading: Promise<void> | null = null
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null

  constructor(private readonly modelUrl: string) {}

  get isReady(): boolean {
    return this.model !== null
  }

  /** Idempotent: parallel calls wait on one and the same load. */
  async load(): Promise<void> {
    if (this.model) return
    this.loading ??= createModel(this.modelUrl).then((model) => {
      this.model = model
    })
    await this.loading
  }

  async listenOnce(grammar: readonly string[], signal: AbortSignal): Promise<string | null> {
    const model = this.model
    if (!model) throw new Error('The model is not loaded yet — call load() first')

    const context = await this.ensureAudio()
    const stream = this.mediaStream
    if (!stream) throw new Error('No access to the microphone')

    // `[unk]` is a Vosk service token: it marks anything said outside the
    // grammar. Without it recognition stretches any sound onto the nearest word
    // on the list, and «did not catch that» (C5) becomes indistinguishable
    // from an answer.
    const grammarJson = JSON.stringify([...grammar, '[unk]'])
    const recognizer = new model.KaldiRecognizer(context.sampleRate, grammarJson)

    const source = context.createMediaStreamSource(stream)
    // ScriptProcessorNode is deprecated, but it works in Chromium and is an
    // order of magnitude simpler than AudioWorklet. A phase 3 debt: move over
    // if audio artefacts show up.
    const processor = context.createScriptProcessor(4096, 1, 1)
    // The node stays dead until it is connected to an output, and the child has
    // no reason to hear themselves.
    const mute = context.createGain()
    mute.gain.value = 0

    return new Promise<string | null>((resolve) => {
      let settled = false
      let finalRequested = false
      let speechStartedAt: number | null = null
      let lastLoudAt = 0

      const timers: ReturnType<typeof setTimeout>[] = []

      const cleanup = () => {
        timers.forEach(clearTimeout)
        processor.onaudioprocess = null
        try {
          source.disconnect()
          processor.disconnect()
          mute.disconnect()
        } catch {
          // already disconnected — no harm done
        }
        recognizer.remove()
        signal.removeEventListener('abort', onAbort)
      }

      const finish = (value: string | null) => {
        if (settled) return
        settled = true
        cleanup()
        resolve(value)
      }

      function onAbort() {
        finish(null)
      }

      signal.addEventListener('abort', onAbort)
      if (signal.aborted) return finish(null)

      recognizer.on('result', (message) => {
        if (message.event !== 'result') return
        const text = message.result.text.trim()
        finish(text.length > 0 ? text : null)
      })

      recognizer.on('error', (message) => {
        if (message.event !== 'error') return
        console.error('Vosk:', message.error)
        finish(null)
      })

      processor.onaudioprocess = (event) => {
        if (settled) return

        try {
          recognizer.acceptWaveform(event.inputBuffer)
        } catch (error) {
          console.error('acceptWaveform:', error)
          return
        }

        const samples = event.inputBuffer.getChannelData(0)
        let sum = 0
        for (let i = 0; i < samples.length; i++) {
          const sample = samples[i]!
          sum += sample * sample
        }
        const rms = Math.sqrt(sum / samples.length)
        const now = performance.now()

        if (rms > SILENCE_RMS) {
          speechStartedAt ??= now
          lastLoudAt = now
          return
        }

        // Speech happened and then stopped — close recognition ourselves, so
        // the child does not have to press anything a second time.
        if (speechStartedAt !== null && !finalRequested && now - lastLoudAt > SILENCE_AFTER_SPEECH_MS) {
          finalRequested = true
          recognizer.retrieveFinalResult()
        }
      }

      source.connect(processor)
      processor.connect(mute)
      mute.connect(context.destination)

      timers.push(
        setTimeout(() => {
          if (speechStartedAt === null) finish(null)
        }, NO_SPEECH_TIMEOUT_MS),
        setTimeout(() => finish(null), MAX_LISTEN_MS),
      )
    })
  }

  /** Releases the microphone and the audio context. The model stays loaded. */
  releaseMicrophone(): void {
    this.mediaStream?.getTracks().forEach((track) => track.stop())
    this.mediaStream = null
    void this.audioContext?.close()
    this.audioContext = null
  }

  dispose(): void {
    this.releaseMicrophone()
    this.model?.terminate()
    this.model = null
  }

  private async ensureAudio(): Promise<AudioContext> {
    if (!this.mediaStream) {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      })
    }

    this.audioContext ??= new AudioContext()
    if (this.audioContext.state === 'suspended') await this.audioContext.resume()
    return this.audioContext
  }
}
