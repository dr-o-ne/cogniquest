import type { AnswerSpec } from './AnswerSpec'

export type Subject = 'math' | 'reading'

export type MathOp = '+' | '-'

/** What to show and/or say to the child. */
export type ExercisePrompt =
  /**
   * A chain: «2 + 3» or «8 − 3 + 2». There is always one operation fewer than
   * there are numbers. An ordinary two-number problem is a special case of
   * this, which is why nothing anywhere branches for it.
   */
  | {
      readonly kind: 'arithmetic'
      readonly terms: readonly number[]
      readonly ops: readonly MathOp[]
      /**
       * One bracketed run of terms, evaluated before the rest — `20 − (5 + 3)`
       * is `from: 1, to: 2`. Absent means a plain left-to-right chain.
       *
       * One span is enough for what a second-year is asked to do, and a single
       * optional field keeps every existing prompt valid as it stands.
       */
      readonly bracket?: { readonly from: number; readonly to: number }
    }
  /**
   * An equation with one operand missing — «□ + 2 = 5», or «47 + □ + 3 = 69»
   * at the level where a base sum has three terms. The child names the hidden
   * number. `terms`/`ops` are the left-hand side exactly as for `arithmetic`;
   * `result` is the right-hand side; `blank` is the index in `terms` of the
   * operand that is not shown. The blank is never the result — that would just
   * be addition with an equals sign.
   */
  | {
      readonly kind: 'equation'
      readonly terms: readonly number[]
      readonly ops: readonly MathOp[]
      readonly result: number
      readonly blank: number
    }
  /**
   * «5 □ 7» — two numbers with the sign missing between them. The child names
   * the sign, so this is the first prompt whose answer is not a number.
   */
  | { readonly kind: 'comparison'; readonly left: number; readonly right: number }
  /** «МА-ШИ-НА» in large type, one colour per syllable */
  | { readonly kind: 'syllables'; readonly syllables: readonly string[] }
  /** The teacher says it out loud; nothing appears on screen */
  | { readonly kind: 'spoken'; readonly text: string }

/**
 * One exercise type for both subjects (A2).
 *
 * Because of it the session engine, progress, mistake review and the whole of
 * gamification are written once and work for math and for reading alike.
 */
export interface Exercise {
  readonly id: string
  readonly subject: Subject
  readonly level: number
  readonly prompt: ExercisePrompt
  readonly answer: AnswerSpec
}
