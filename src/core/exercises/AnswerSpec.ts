import type { AnswerAttempt } from './AnswerAttempt'

export type Verdict = 'correct' | 'wrong' | 'unrecognised'

/**
 * How an answer is checked. Implementations live in src/core/math and
 * src/core/reading — one per kind of answer (A2).
 */
export interface AnswerSpec {
  readonly kind: string
  check(attempt: AnswerAttempt): Verdict
}

/**
 * The exercise itself dictates which words recognition should expect (A5).
 * That way VoiceInput knows nothing of arithmetic or of syllables.
 *
 * IMPORTANT: the grammar gets the whole plausible range of answers, not just
 * the correct one. A single-word list makes Vosk «hear» that word in anything,
 * and the child is then always right.
 */
export interface VoiceAnswerable {
  readonly grammar: readonly string[]
}

export function isVoiceAnswerable(spec: AnswerSpec): spec is AnswerSpec & VoiceAnswerable {
  return Array.isArray((spec as { grammar?: unknown }).grammar)
}
