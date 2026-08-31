import type { Exercise, MathOp } from '../exercises'
import { randomInt, type Random } from '../random'
import { ArithmeticAnswer } from './ArithmeticAnswer'
import { buildProblem, generateProblem, type ArithmeticProblem } from './generator'

/**
 * Missing number — the «□ + 2 = 5» row of the grid (see docs/EXERCISES.md).
 *
 * A known sum run backwards: the child is shown `terms … = result` with one of
 * the operands hidden and names it. Reading a sum backwards is the whole of the
 * skill, so the ladder is about the size of the arithmetic, nothing cleverer:
 *
 * | Level | The sum behind the blank | Heard |
 * |---|---|---|
 * | 1 | within five            — `□ + 2 = 5`      | 0–10 |
 * | 2 | within ten             — `4 + □ = 9`      | 0–10 |
 * | 3 | across the ten         — `□ + 5 = 13`     | 0–20 |
 * | 4 | two-digit, carry or no — `45 + □ = 68`, `□ + 27 = 61` | 0–100 |
 * | 5 | three terms, a pair makes a round one — `47 + □ + 3 = 69` | 0–100 |
 *
 * Levels 1 and 2 are their own small generators. Level 3 is the ordinary
 * across-the-ten problem, level 4 flips a coin between two-digit-without-carry
 * and two-digit-with-carry so both are met, and level 5 is the grouping problem
 * unchanged — three terms, so the equation has three too.
 *
 * The blank never falls on the result: `□ + 2 = 5` asks the child to think
 * backwards, `2 + 3 = □` is plain addition with an equals sign drawn in, and
 * that row is already played.
 *
 * Every operand is at least one — no `7 + □ = 7`. The answer is a single
 * number, so `ArithmeticAnswer` and its recognition grammar carry over
 * untouched (A5, T16).
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
  /** The grammar ceiling — the range the child is heard against (T16). */
  readonly heardUpTo: number
}

/** Level 1 and 2: `a + b` or `a − b` with everything at or below `ceiling`. */
function withinReach(random: Random, op: MathOp, ceiling: number): ArithmeticProblem {
  if (op === '+') {
    const a = randomInt(random, 1, ceiling - 1)
    const b = randomInt(random, 1, ceiling - a)
    return buildProblem([a, b], ['+'], ceiling)
  }

  const a = randomInt(random, 2, ceiling)
  const b = randomInt(random, 1, a - 1)
  return buildProblem([a, b], ['-'], ceiling)
}

/** The sum a level hides a term of. */
function baseProblem(levelId: number, random: Random, op: MathOp): ArithmeticProblem {
  switch (levelId) {
    // Answers only reach five, but the grammar is the same 0–10 as level 2 —
    // a short list makes Vosk hear its one word everywhere (T16).
    case 1:
      return { ...withinReach(random, op, 5), heardUpTo: 10 }

    case 2:
      return withinReach(random, op, 10)

    // Across the ten — the ordinary level-2 arithmetic, which never makes a
    // zero operand.
    case 3:
      return generateProblem(2, random, op)

    // Two-digit, half the time with a carry and half without, so the child
    // meets both behind the blank.
    case 4:
      return generateProblem(random() < 0.5 ? 3 : 4, random, op)

    // The grouping problem, unchanged: three terms, and the equation keeps all
    // three.
    case 5:
      return generateProblem(5, random, op)

    default:
      throw new RangeError(`No missing-number generator for level ${levelId}`)
  }
}

export function generateEquation(levelId: number, random: Random): Equation {
  const operation: MathOp = random() < 0.5 ? '+' : '-'
  const base = baseProblem(levelId, random, operation)
  const blank = randomInt(random, 0, base.terms.length - 1)

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
