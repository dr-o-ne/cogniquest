import type { Exercise, MathOp } from '../exercises'
import { randomInt, type Random } from '../random'
import { compare, ComparisonAnswer, type Comparison } from './ComparisonAnswer'
import { evaluate, generateProblem } from './generator'

/**
 * Comparing numbers — the «5 □ 7» row of the grid (see docs/MATH.md).
 *
 * | Level | What is compared | New |
 * |---|---|---|
 * | 1 | two numbers up to twenty | which of two is the larger |
 * | 2 | two two-digit numbers | the tens decide it, not the units |
 * | 3 | two sums within five — «3 + 2 □ 5 − 1» | a side has to be worked out first |
 * | 4 | two sums within ten — «7 + 3 □ 9 − 4» | the sums get bigger |
 * | 5 | two sums that work the ten — «13 − 6 □ 30 + 40» | and bigger again |
 *
 * The wall that used to stop this row at two was the numerals: they end at a
 * hundred (T16), so a three-digit number could be neither said nor heard nor
 * judged. Rungs 3–5 climb past it by comparing expressions instead — an «a ± b»
 * drawn from the arithmetic ladder always lands in range, so the child never
 * has to name a number over a hundred, only work one out and say a word.
 */
export const COMPARISON_LEVELS: readonly number[] = [1, 2, 3, 4, 5]

/**
 * How often the two sides are equal.
 *
 * «Равно» is one of the three words the teacher names in every question, so it
 * has to turn up or the offer is a lie and the child learns to ignore it. One
 * in six rather than one in three: two equal sides are the easiest of the three
 * to spot, and at a third of the row they would carry it.
 */
const EQUAL_CHANCE = 1 / 6

/** One side of a comparison. A bare number is the one-term, zero-op case. */
export interface ComparisonSide {
  readonly terms: readonly number[]
  readonly ops: readonly MathOp[]
}

export interface ComparisonProblem {
  readonly left: ComparisonSide
  readonly right: ComparisonSide
  readonly answer: Comparison
}

const asNumber = (n: number): ComparisonSide => ({ terms: [n], ops: [] })
const worth = (side: ComparisonSide): number => evaluate(side.terms, side.ops)

export function generateComparison(levelId: number, random: Random): ComparisonProblem {
  switch (levelId) {
    case 1:
      return pairWithin(random, 20)

    case 2:
      return twoDigit(random)

    case 3:
      return sums(random, 1)

    case 4:
      return sums(random, 2)

    case 5:
      return sums(random, 3)

    default:
      throw new RangeError(`No comparison generator for level ${levelId}`)
  }
}

export function createComparisonExercise(levelId: number, random: Random): Exercise {
  const problem = generateComparison(levelId, random)

  return {
    // «5?7» and «7?5» are two different tasks with two different answers, so the
    // id keeps the order. The mark is not one of `<`, `=`, `>`: that would print
    // the answer into the id (C3).
    id: `math:${describeSide(problem.left)}?${describeSide(problem.right)}`,
    subject: 'math',
    level: levelId,
    prompt: { kind: 'comparison', left: problem.left, right: problem.right },
    answer: new ComparisonAnswer(problem.answer),
  }
}

/** «5», «3+2», «13-6» — the written form of one side, for the id. */
export function describeSide(side: ComparisonSide): string {
  return side.terms.reduce(
    (text, term, i) => (i === 0 ? `${term}` : `${text}${side.ops[i - 1]}${term}`),
    '',
  )
}

/** Level 1: «3 □ 18». Two numbers up to `ceiling`, nothing to look past. */
function pairWithin(random: Random, ceiling: number): ComparisonProblem {
  const left = randomInt(random, 0, ceiling)
  if (random() < EQUAL_CHANCE) return oriented(random, asNumber(left), asNumber(left))

  // Drawn from the shortened range and stepped over the gap, so the second
  // number is never the first and every other value stays equally likely.
  const drawn = randomInt(random, 0, ceiling - 1)

  return oriented(random, asNumber(left), asNumber(drawn >= left ? drawn + 1 : drawn))
}

/**
 * Level 2: «19 □ 21». Two-digit numbers, and the units never decide it.
 *
 * The mistake this rung exists to catch is comparing digit by digit: 9 is more
 * than 1, so 19 must be more than 21. A problem where the units happen to agree
 * with the answer — «45 □ 47» — is answered right by that wrong method, and
 * teaches the child it works. So the units are made to disagree, or made
 * identical.
 *
 * Both, in equal measure, and that is the point of the second branch. If the
 * units always pointed the other way the child could simply invert the rule —
 * «whichever has the smaller units is the bigger number» — and be right every
 * time without ever looking at the tens. When the units match, that rule says
 * nothing at all.
 */
function twoDigit(random: Random): ComparisonProblem {
  if (random() < EQUAL_CHANCE) {
    const both = randomInt(random, 10, 99)
    return oriented(random, asNumber(both), asNumber(both))
  }

  // The tens differ, so the tens are what settles it.
  const lowTens = randomInt(random, 1, 8)
  const highTens = randomInt(random, lowTens + 1, 9)

  if (random() < 0.5) {
    // «19 □ 21» — the units say the opposite of the truth.
    const bigUnits = randomInt(random, 0, 8)
    const smallUnits = randomInt(random, bigUnits + 1, 9)

    return oriented(random, asNumber(lowTens * 10 + smallUnits), asNumber(highTens * 10 + bigUnits))
  }

  // «23 □ 43» — the units are the same, so only the tens are left to look at.
  const units = randomInt(random, 0, 9)

  return oriented(random, asNumber(lowTens * 10 + units), asNumber(highTens * 10 + units))
}

/**
 * Levels 3–5: «a ± b □ c ± d», both sides drawn from rung `mathLevel` of the
 * arithmetic ladder. The child works each side out and names how they stand.
 *
 * The equal case puts a bare number on one side — «3 + 2 □ 5» — rather than a
 * second sum built to match: hitting a target value would be «generate and
 * check», and «is this sum more than, less than or equal to five» is a fair
 * question in its own right. It also keeps «равно» on every rung, which is the
 * whole reason EQUAL_CHANCE exists.
 */
function sums(random: Random, mathLevel: number): ComparisonProblem {
  const expr = (): ComparisonSide => {
    const problem = generateProblem(mathLevel, random, random() < 0.5 ? '+' : '-')
    return { terms: problem.terms, ops: problem.ops }
  }

  const left = expr()
  if (random() < EQUAL_CHANCE) return oriented(random, left, asNumber(worth(left)))

  return oriented(random, left, expr())
}

/**
 * Puts the pair on the page in either order.
 *
 * Without this every problem would read «smaller □ bigger» and the answer would
 * be «меньше» every time the two sides differed — which is an answer that can
 * be given without looking at them.
 */
function oriented(random: Random, a: ComparisonSide, b: ComparisonSide): ComparisonProblem {
  const swap = random() < 0.5
  const left = swap ? b : a
  const right = swap ? a : b

  return { left, right, answer: compare(worth(left), worth(right)) }
}
