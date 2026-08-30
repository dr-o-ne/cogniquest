import type { TextToSpeech } from '@/core/ports'
import { t } from '@/locale'

/**
 * The teacher's voice through the Windows system synthesiser (T12).
 *
 * LOCAL voices only: networked ones sound better but need the internet, and
 * the game has to work offline (P5).
 *
 * There may be no local voice for the language at all — then we stay silent
 * and the game carries on. The practice matters more than the narration.
 */
export class WebSpeechTts implements TextToSpeech {
  private voice: SpeechSynthesisVoice | null = null
  private resolved = false

  constructor(
    private readonly lang = t.code,
    private readonly rate = 0.95,
  ) {}

  get isReady(): boolean {
    return this.voice !== null
  }

  /** Voices load asynchronously, so they are waited for separately. */
  async prepare(): Promise<boolean> {
    if (this.resolved) return this.isReady
    if (typeof speechSynthesis === 'undefined') {
      this.resolved = true
      return false
    }

    this.voice = this.pickVoice()
    if (!this.voice) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(done, 1500)
        function done() {
          clearTimeout(timer)
          speechSynthesis.removeEventListener('voiceschanged', done)
          resolve()
        }
        speechSynthesis.addEventListener('voiceschanged', done)
      })
      this.voice = this.pickVoice()
    }

    this.resolved = true
    if (!this.voice) console.warn(`No local "${this.lang}" voice found — the teacher will stay silent`)
    return this.isReady
  }

  async speak(text: string, signal?: AbortSignal): Promise<void> {
    if (!this.voice || signal?.aborted) return

    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = this.voice
      utterance.lang = this.voice!.lang
      utterance.rate = this.rate

      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        signal?.removeEventListener('abort', onAbort)
        resolve()
      }
      function onAbort() {
        speechSynthesis.cancel()
        done()
      }

      utterance.onend = done
      utterance.onerror = done
      signal?.addEventListener('abort', onAbort)

      speechSynthesis.speak(utterance)
    })
  }

  stop(): void {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  }

  private pickVoice(): SpeechSynthesisVoice | null {
    const voices = speechSynthesis.getVoices()
    // localService === true means the voice is synthesised on this machine
    // rather than on a server — the only kind compatible with P5.
    return voices.find((v) => v.lang.toLowerCase().startsWith(this.lang) && v.localService) ?? null
  }
}
