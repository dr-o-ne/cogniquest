import type { Exercise, MathOp } from '../exercises'
import { randomInt, type Random } from '../random'
import { ArithmeticAnswer } from './ArithmeticAnswer'
import { mathLevel } from './levels'

export interface ArithmeticProblem {
  readonly terms: readonly number[]
  readonly ops: readonly MathOp[]
  readonly answer: number
}

/** Evaluates a chain left to right: 8 − 3 + 2 = 7. */
export function evaluate(terms: readonly number[], ops: readonly MathOp[]): number {
  let total = terms[0] ?? 0
  for (let i = 0; i < ops.length; i++) {
    total = ops[i] === '+' ? total + terms[i + 1]! : total - terms[i + 1]!
  }
  return total
}

/**
 * Problems are built straight to the rule of the level, never «generate and
 * check». That way the generator cannot spin forever and always lands inside
 * the rule (C1).
 *
 * Every second operand is at least one: «7 + 0» teaches nothing.
 */
export function generateProblem(levelId: number, random: Random): ArithmeticProblem {
  const plus = random() < 0.5

  switch (levelId) {
    case 1:
      return plus ? add(random, 0, 9, 10) : subtract(random, 1, 10)

    case 2:
      return chain(random, 3, 10)

    case 3:
      return plus ? addWithCarry(random) : subtractWithBorrow(random)

    case 4:
      return plus ? addRoundTens(random) : subtractRoundTens(random)

    case 5:
      return plus ? add(random, 1, 99, 100) : subtract(random, 2, 100)

    default:
      throw new RangeError(`No generator for level ${levelId}`)
  }
}

export function createArithmeticExercise(levelId: number, random: Random): Exercise {
  const level = mathLevel(levelId)
  const problem = generateProblem(levelId, random)

  return {
    // Identical problems get an identical id — the review queue rests on
    // exactly that (C3).
    id: `math:${describe(problem)}`,
    subject: 'math',
    level: levelId,
    prompt: { kind: 'arithmetic', terms: problem.terms, ops: problem.ops },
    answer: new ArithmeticAnswer(problem.answer, level.answerRange),
  }
}

/** «8-3+2» — for the id and for debugging. */
export function describe(problem: ArithmeticProblem): string {
  return problem.terms.reduce(
    (text, term, i) => (i === 0 ? `${term}` : `${text}${problem.ops[i - 1]}${term}`),
    '',
  )
}

function problem(terms: readonly number[], ops: readonly MathOp[]): ArithmeticProblem {
  return { terms, ops, answer: evaluate(terms, ops) }
}

/**
 * A chain of several operations where EVERY intermediate result stays under
 * the ceiling and never goes negative.
 *
 * The child works «8 − 3 + 2» out step by step, so no single step may leave
 * the bounds of the level.
 */
function chain(random: Random, termCount: number, ceiling: number): ArithmeticProblem {
  // Not at the edge: otherwise the first step is forced in one direction.
  let total = randomInt(random, 1, ceiling - 1)
  const terms: number[] = [total]
  const ops: MathOp[] = []

  for (let i = 1; i < termCount; i++) {
    const canAdd = total < ceiling
    const canSubtract = total > 0
    const op: MathOp = canAdd && canSubtract ? (random() < 0.5 ? '+' : '-') : canAdd ? '+' : '-'

    const operand = op === '+' ? randomInt(random, 1, ceiling - total) : randomInt(random, 1, total)
    total = op === '+' ? total + operand : total - operand

    ops.push(op)
    terms.push(operand)
  }

  return problem(terms, ops)
}

/** a + b, where a ∈ [minLeft, maxLeft], b ≥ 1, sum ≤ ceiling. */
function add(random: Random, minLeft: number, maxLeft: number, ceiling: number): ArithmeticProblem {
  const left = randomInt(random, minLeft, maxLeft)
  const right = randomInt(random, 1, ceiling - left)
  return problem([left, right], ['+'])
}

/** a − b, where b ∈ [1, a]. */
function subtract(random: Random, minLeft: number, maxLeft: number): ArithmeticProblem {
  const left = randomInt(random, minLeft, maxLeft)
  const right = randomInt(random, 1, left)
  return problem([left, right], ['-'])
}

/** Level 3: the sum has to cross the ten — 8 + 5. */
function addWithCarry(random: Random): ArithmeticProblem {
  const left = randomInt(random, 2, 9)
  const right = randomInt(random, 11 - left, 9)
  return problem([left, right], ['+'])
}

/** Level 3: the units fall short, so a ten has to be borrowed — 13 − 6. */
function subtractWithBorrow(random: Random): ArithmeticProblem {
  const right = randomInt(random, 2, 9)
  const answer = randomInt(random, 11 - right, 9)
  return problem([answer + right, right], ['-'])
}

/** Level 4: both numbers are round tens. */
function addRoundTens(random: Random): ArithmeticProblem {
  const leftTens = randomInt(random, 1, 9)
  const rightTens = randomInt(random, 1, 10 - leftTens)
  return problem([leftTens * 10, rightTens * 10], ['+'])
}

function subtractRoundTens(random: Random): ArithmeticProblem {
  const leftTens = randomInt(random, 2, 10)
  const rightTens = randomInt(random, 1, leftTens)
  return problem([leftTens * 10, rightTens * 10], ['-'])
}
