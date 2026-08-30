import type { AnswerAttempt, AnswerSpec, Verdict, VoiceAnswerable } from '../exercises'
import { MIN_NUMBER, numberGrammar, parseNumber } from './numerals'

/**
 * Checking a numeric answer. Answerable by voice too (A5): the exercise hands
 * out its own grammar, so the recognition adapter knows nothing of arithmetic.
 */
export class ArithmeticAnswer implements AnswerSpec, VoiceAnswerable {
  readonly kind = 'number'
  readonly grammar: readonly string[]

  /**
   * @param heardUpTo the highest number the child might say here. There is no
   * matching lower bound and there must not be one: the grammar always starts
   * at zero, because a child can always name something smaller than the right
   * answer, and hearing them be wrong is the entire point of T16. A grammar
   * narrowed towards the correct answer makes Vosk hear that answer in any
   * sound at all, and the child is then right no matter what they said.
   */
  constructor(
    readonly value: number,
    heardUpTo: number,
  ) {
    this.grammar = numberGrammar(MIN_NUMBER, heardUpTo)
  }

  check(attempt: AnswerAttempt): Verdict {
    switch (attempt.kind) {
      case 'number':
        return attempt.value === this.value ? 'correct' : 'wrong'

      case 'text': {
        // Voice arrives as text. Unreadable means we did not catch it, NOT that
        // the child was wrong (C5). The difference matters: nobody is punished.
        const parsed = parseNumber(attempt.value)
        if (parsed === null) return 'unrecognised'
        return parsed === this.value ? 'correct' : 'wrong'
      }

      case 'unrecognised':
        return 'unrecognised'

      default:
        // A picked option or a syllable sequence is not our business.
        return 'unrecognised'
    }
  }
}
