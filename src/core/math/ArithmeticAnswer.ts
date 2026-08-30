import type { AnswerAttempt, AnswerSpec, Verdict, VoiceAnswerable } from '../exercises'
import { numberGrammar, parseNumber } from './numerals'

/**
 * Checking a numeric answer. Answerable by voice too (A5): the exercise hands
 * out its own grammar, so the recognition adapter knows nothing of arithmetic.
 */
export class ArithmeticAnswer implements AnswerSpec, VoiceAnswerable {
  readonly kind = 'number'
  readonly grammar: readonly string[]

  constructor(
    readonly value: number,
    range: { readonly min: number; readonly max: number },
  ) {
    // The whole range of the level, not just the correct answer (T16):
    // otherwise Vosk «hears» the one word on the list in any sound at all.
    this.grammar = numberGrammar(range.min, range.max)
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
