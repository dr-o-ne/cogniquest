import type { Exercise, MathOp } from '../exercises'
import { randomInt, type Random } from '../random'
import { ArithmeticAnswer } from './ArithmeticAnswer'
import { generateProblem } from './generator'

/**
 * Missing number — the «□ + 2 = 5» row of the grid (see docs/MATH.md).
 *
 * A known sum run backwards: the child is shown `terms … = result` with one of
 * the operands hidden and names it. Reading a sum backwards is the whole of the
 * skill, so the ladder is about the size of the arithmetic, nothing cleverer —
 * which is why this row does not have a ladder of its own at all. **It rides
 * the addition one rung for rung:** whatever level N asks as a sum, this row
 * asks with one operand covered up.
 *
 * | Level | The sum behind the blank | Heard |
 * |---|---|---|
 * | 1 | within five                — `□ + 2 = 5`   | 0–10 |
 * | 2 | up to ten, not crossed     — `4 + □ = 9`   | 0–10 |
 * | 3 | across the ten, or whole tens — `□ + 5 = 13`, `30 + □ = 70` | 0–20, 0–100 |
 * | 4 | two-digit, nothing carried — `45 + □ = 68` | 0–100 |
 * | 5 | two-digit, the units overflow — `□ + 28 = 75` | 0–100 |
 *
 * It used to remap the rungs by hand — level 3 reached for the across-the-ten
 * generator, level 4 flipped a coin between two others — which was a second
 * ladder to keep in step with the first, and it fell out of step the moment the
 * first one was re-cut. Riding along cannot drift.
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

export function generateEquation(levelId: number, random: Random): Equation {
  const operation: MathOp = random() < 0.5 ? '+' : '-'
  // The rung itself, sum and all. A level that the ladder does not have throws
  // from in there, which is where the message about it belongs.
  const base = generateProblem(levelId, random, operation)
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
