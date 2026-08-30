import type { AnswerAttempt, AnswerSpec, Verdict, VoiceAnswerable } from '../exercises'
import { assertNever } from '../exhaustive'
import { t } from '@/locale'

/**
 * How the left number of «5 □ 7» stands to the right one.
 *
 * Named rather than kept as the sign itself: the child answers with a word,
 * the screen shows a sign, and neither of the two is the thing being checked.
 */
export type Comparison = 'less' | 'equal' | 'greater'

/** In the order they are offered on screen — smallest to largest. */
export const COMPARISONS: readonly Comparison[] = ['less', 'equal', 'greater']

export function compare(left: number, right: number): Comparison {
  if (left < right) return 'less'
  if (left > right) return 'greater'
  return 'equal'
}

/** The word the child says, and the word the teacher says back. */
export function comparisonWord(value: Comparison): string {
  switch (value) {
    case 'less':
      return t.comparison.less
    case 'equal':
      return t.comparison.equal
    case 'greater':
      return t.comparison.greater
    default:
      return assertNever(value, 'comparison')
  }
}

/** The sign that goes in the box. Not language — the same in every pack. */
export function comparisonSign(value: Comparison): string {
  switch (value) {
    case 'less':
      return '<'
    case 'equal':
      return '='
    case 'greater':
      return '>'
    default:
      return assertNever(value, 'comparison')
  }
}

/**
 * «больше» → `greater`. Null when it cannot be read as one of the three.
 *
 * Two of them at once — «больше меньше» — is null as well rather than the first
 * of the pair. Recognition can stitch two grammar words onto one sound, and
 * guessing which was meant would score the child on our guess.
 */
export function parseComparison(text: string): Comparison | null {
  const words = new Set(t.normalise(text).split(' '))
  const found = COMPARISONS.filter((value) => words.has(comparisonWord(value)))

  return found.length === 1 ? found[0]! : null
}

/**
 * Checking the answer to a comparison — the first answer in the game that is
 * not a number.
 *
 * The grammar is all three words, always, and not only because the correct one
 * has to be in it: a child who cannot be heard being wrong is a child who is
 * always right (T16). Three phrases is a very short list even so — short lists
 * make Vosk stretch any sound onto the nearest word — so this is the one kind
 * of task to watch on the rig before trusting it.
 */
export class ComparisonAnswer implements AnswerSpec, VoiceAnswerable {
  readonly kind = 'comparison'
  readonly grammar: readonly string[] = COMPARISONS.map(comparisonWord)

  constructor(readonly value: Comparison) {}

  check(attempt: AnswerAttempt): Verdict {
    switch (attempt.kind) {
      // The fallback pad (T5): three buttons rather than a keypad, so the
      // answer arrives already decided.
      case 'choice':
        return attempt.value === this.value ? 'correct' : 'wrong'

      case 'text': {
        // Voice arrives as text. Unreadable means we did not catch it, NOT that
        // the child was wrong (C5). The difference matters: nobody is punished.
        const parsed = parseComparison(attempt.value)
        if (parsed === null) return 'unrecognised'
        return parsed === this.value ? 'correct' : 'wrong'
      }

      case 'unrecognised':
        return 'unrecognised'

      default:
        // A number or a syllable sequence is not our business.
        return 'unrecognised'
    }
  }
}
