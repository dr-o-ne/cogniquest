import { isVoiceAnswerable, type AnswerAttempt, type AnswerSpec } from '@/core/exercises'
import type { AnswerInput, SpeechRecognizer } from '@/core/ports'

/**
 * Answering by voice (P9) — the primary way to answer.
 *
 * It takes the grammar from the exercise itself (A5), so it knows nothing of
 * arithmetic or of syllables: reading will work through it unchanged.
 */
export class VoiceAnswerInput implements AnswerInput {
  readonly id = 'voice'

  constructor(private readonly recognizer: SpeechRecognizer) {}

  canHandle(spec: AnswerSpec): boolean {
    return isVoiceAnswerable(spec)
  }

  async read(spec: AnswerSpec, signal: AbortSignal): Promise<AnswerAttempt> {
    if (!isVoiceAnswerable(spec)) {
      throw new Error(`An answer of kind "${spec.kind}" cannot be given by voice`)
    }

    const heard = await this.recognizer.listenOnce(spec.grammar, signal)

    // Silence, or a word outside the grammar: not caught, not a mistake (C5).
    return heard === null ? { kind: 'unrecognised' } : { kind: 'text', value: heard }
  }
}
