import type { Exercise, MathOp } from '../exercises'
import { randomInt, type Random } from '../random'
import { ArithmeticAnswer } from './ArithmeticAnswer'
import { generateProblem } from './generator'

/**
 * Missing number — the «□ + 2 = 5» row of the grid (see docs/EXERCISES.md).
 *
 * A known sum run backwards: the child is shown `terms … = result` with one of
 * the operands hidden and names it. The backwards step is the whole of the new
 * skill, so the arithmetic underneath is not new — a base problem is drawn from
 * the ordinary addition/subtraction generator for the level and one operand is
 * then covered up. Levels 1–5 therefore mean exactly what they mean there:
 * size, across the ten, two digits without carrying, with carrying, and the
 * grouping trick (which is where a base problem has three terms, so the
 * equation does too — `□ + 19 + 3 = 69`).
 *
 * The blank never falls on the result: `□ + 2 = 5` asks the child to think
 * backwards, `2 + 3 = □` is plain addition with an equals sign drawn in, and
 * that row is already played.
 *
 * The answer is a single number, so `ArithmeticAnswer` and its recognition
 * grammar carry over untouched (A5, T16) — this file adds a generator and a
 * prompt shape, nothing more.
 */
export interface Equation {
  /** Every operand, in written order. One of them is the unknown. */
  readonly terms: readonly number[]
  /** The signs between them — one fewer than there are terms. */
  readonly ops: readonly MathOp[]
  /** The right-hand side, always shown. */
  readonly result: number
  /** Index into `terms` of the operand that is hidden. */
  readonly blank: number
  /** The number the child has to name: `terms[blank]`. */
  readonly answer: number
  /**
   * The grammar ceiling, taken straight from the base problem so that a missing
   * number at a given level is heard against the same range as a plain sum at
   * that level (T16).
   */
  readonly heardUpTo: number
}

export function generateEquation(levelId: number, random: Random): Equation {
  const operation: MathOp = random() < 0.5 ? '+' : '-'

  // The base is an ordinary problem for this level — `terms … = answer`. Levels
  // 1–4 give two terms, level 5 gives three, and the equation inherits that.
  const base = generateProblem(levelId, random, operation)
  const blank = randomInt(random, 0, base.terms.length - 1)

  // Level 1 lets a zero operand through on purpose — `7 + □ = 7`, `□ − 9 = 0` —
  // because `± 0` is one of the facts that level teaches. Higher up the
  // arithmetic generators rule zero out themselves.
  return {
    terms: base.terms,
    ops: base.ops,
    result: base.answer,
    blank,
    answer: base.terms[blank]!,
    heardUpTo: base.heardUpTo,
  }
}

/**
 * «□+2=5», «47+□+3=69» — for the id and for debugging.
 *
 * The blank position is part of it: «□+2=5» and «2+□=5» are different tasks to
 * a child, and the review queue (C3) keys on this string, so they must not
 * collapse into one — nor into the plain «3+2=5».
 */
export function describeEquation(equation: Equation): string {
  const body = equation.terms.reduce((text, term, i) => {
    const op = i === 0 ? '' : equation.ops[i - 1]
    const shown = i === equation.blank ? '□' : String(term)
    return `${text}${op}${shown}`
  }, '')

  return `${body}=${equation.result}`
}

export function createEquationExercise(levelId: number, random: Random): Exercise {
  const equation = generateEquation(levelId, random)

  return {
    id: `math:${describeEquation(equation)}`,
    subject: 'math',
    level: levelId,
    prompt: {
      kind: 'equation',
      terms: equation.terms,
      ops: equation.ops,
      result: equation.result,
      blank: equation.blank,
    },
    answer: new ArithmeticAnswer(equation.answer, equation.heardUpTo),
  }
}
