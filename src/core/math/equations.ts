import type { Exercise, MathOp } from '../exercises'
import { randomInt, type Random } from '../random'
import { ArithmeticAnswer } from './ArithmeticAnswer'

/**
 * Missing number — the «□ + 2 = 5» row of the grid (see docs/MATH.md).
 *
 * A known sum shown backwards: `a op b = c` with one operand covered up, and
 * the child names it. Reading a sum backwards is the whole of the skill, so the
 * arithmetic behind the blank is kept small and stays its own concern.
 *
 * | Level | The sum behind the blank | Heard | Example |
 * |---|---|---|---|
 * | 2 | within five | 0–10 | `□+2=5`, `5−□=3` |
 * | 3 | within ten  | 0–10 | `4+□=9`, `9−□=3` |
 *
 * **Two rungs, and neither is level 1.** Level 1 is where a child is still
 * meeting `2 + 3` forwards; turning it round is a level-2 move. Levels 4 and 5
 * are two-digit, and this row waits on the evidence from these two before it
 * takes them on.
 *
 * **Its own splitter, not the addition ladder's.** It used to ride addition
 * rung for rung — `generateProblem(level, …)` with an operand hidden — which
 * tied its rungs to a ladder re-cut for something else. «Within five» and
 * «within ten» say more plainly on their own than «level 2 of addition» does.
 *
 * The blank falls on either operand, never on the result: `2 + 3 = □` is plain
 * addition with an equals sign drawn in, and that row is already played. `□+2=5`
 * and `2+□=5` are different tasks, and the review queue (C3) keeps them apart.
 * Every operand is at least one — no `7 + □ = 7`.
 *
 * The answer is a single number, so `ArithmeticAnswer` and its recognition
 * grammar carry over untouched (A5, T16).
 */
export const MISSING_LEVELS: readonly number[] = [2, 3]

/** How big the numbers get, by rung. */
const CEILING: Record<number, number> = { 2: 5, 3: 10 }

export interface Equation {
  /** Both operands, in written order. One of them is the unknown. */
  readonly terms: readonly number[]
  /** The sign between them. */
  readonly ops: readonly MathOp[]
  /** The right-hand side, always shown. */
  readonly result: number
  /** Index into `terms` of the operand that is hidden — 0 or 1. */
  readonly blank: number
  /** The number the child has to name: `terms[blank]`. */
  readonly answer: number
  /**
   * The grammar ceiling — the range the child is heard against (T16). Ten on
   * both rungs: answers reach five and then ten, and a list shorter than that
   * is one Vosk hears its single word in anything.
   */
  readonly heardUpTo: number
}

export function generateEquation(levelId: number, random: Random): Equation {
  const ceiling = CEILING[levelId]
  if (ceiling === undefined) throw new RangeError(`No missing-number rung for level ${levelId}`)

  const op: MathOp = random() < 0.5 ? '+' : '-'
  let a: number
  let b: number
  if (op === '+') {
    a = randomInt(random, 1, ceiling - 1)
    b = randomInt(random, 1, ceiling - a)
  } else {
    a = randomInt(random, 2, ceiling)
    b = randomInt(random, 1, a - 1)
  }

  const terms = [a, b] as const
  const blank = random() < 0.5 ? 0 : 1

  return {
    terms,
    ops: [op],
    result: op === '+' ? a + b : a - b,
    blank,
    answer: terms[blank],
    heardUpTo: 10,
  }
}

/**
 * «□+2=5», «5-□=2» — for the id and for debugging.
 *
 * The blank position is part of it: «□+2=5» and «2+□=5» are different tasks to
 * a child, and the review queue (C3) keys on this string, so they must not
 * collapse into one — nor into the plain «3+2=5».
 */
export function describeEquation(equation: Equation): string {
  const body = equation.terms.reduce((text, term, i) => {
    const sign = i === 0 ? '' : equation.ops[i - 1]
    const shown = i === equation.blank ? '□' : String(term)
    return `${text}${sign}${shown}`
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
