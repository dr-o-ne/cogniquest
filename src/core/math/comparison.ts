import type { Exercise } from '../exercises'
import { randomInt, type Random } from '../random'
import { compare, ComparisonAnswer, type Comparison } from './ComparisonAnswer'

/**
 * Comparing numbers — the «5 □ 7» row of the grid (see docs/MATH.md).
 *
 * | Level | What is asked | New |
 * |---|---|---|
 * | 1 | two numbers within ten | which of two is the larger |
 * | 2 | two-digit numbers | the tens decide it, not the units |
 *
 * **Two rungs and no more, on purpose.** The row's difficulty is how far the
 * child has to look into a number, and there are only two answers to that
 * inside this game: at one digit there is nothing to look past, at two there
 * is. The third would be three-digit numbers, and the number words stop at a
 * hundred (T16) — «сто двадцать» cannot be said, heard or judged. So the wall
 * is not only pedagogical, and levels 3–5 of this row are marked «not asked»
 * rather than «not written yet».
 *
 * Comparing whole expressions — «5 + 3 □ 4 + 4» — would climb further, but it
 * is a different question and belongs to a row of its own if it is ever wanted.
 */
export const COMPARISON_LEVELS: readonly number[] = [1, 2]

/**
 * How often the two numbers are the same.
 *
 * «Равно» is one of the three words the teacher names in every question, so it
 * has to turn up or the offer is a lie and the child learns to ignore it. One
 * in six rather than one in three: two equal numbers are the easiest of the
 * three to spot, and at a third of the row they would carry it.
 */
const EQUAL_CHANCE = 1 / 6

export interface ComparisonProblem {
  readonly left: number
  readonly right: number
  readonly answer: Comparison
}

export function generateComparison(levelId: number, random: Random): ComparisonProblem {
  switch (levelId) {
    case 1:
      return withinTen(random)

    case 2:
      return twoDigit(random)

    default:
      throw new RangeError(`No comparison generator for level ${levelId}`)
  }
}

export function createComparisonExercise(levelId: number, random: Random): Exercise {
  const problem = generateComparison(levelId, random)

  return {
    // «5?7» and «7?5» are two different tasks with two different answers, so
    // the id keeps the order. The mark is not one of `<`, `=`, `>`: that would
    // print the answer into the id (C3).
    id: `math:${problem.left}?${problem.right}`,
    subject: 'math',
    level: levelId,
    prompt: { kind: 'comparison', left: problem.left, right: problem.right },
    answer: new ComparisonAnswer(problem.answer),
  }
}

/** Level 1: «3 □ 8». Both numbers within ten, nothing to look past. */
function withinTen(random: Random): ComparisonProblem {
  const left = randomInt(random, 0, 10)
  if (random() < EQUAL_CHANCE) return oriented(random, left, left)

  // Drawn from the shortened range and stepped over the gap, so the second
  // number is never the first and every other value stays equally likely.
  const drawn = randomInt(random, 0, 9)

  return oriented(random, left, drawn >= left ? drawn + 1 : drawn)
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
    return oriented(random, both, both)
  }

  // The tens differ, so the tens are what settles it.
  const lowTens = randomInt(random, 1, 8)
  const highTens = randomInt(random, lowTens + 1, 9)

  if (random() < 0.5) {
    // «19 □ 21» — the units say the opposite of the truth.
    const bigUnits = randomInt(random, 0, 8)
    const smallUnits = randomInt(random, bigUnits + 1, 9)

    return oriented(random, lowTens * 10 + smallUnits, highTens * 10 + bigUnits)
  }

  // «23 □ 43» — the units are the same, so only the tens are left to look at.
  const units = randomInt(random, 0, 9)

  return oriented(random, lowTens * 10 + units, highTens * 10 + units)
}

/**
 * Puts the pair on the page in either order.
 *
 * Without this every problem would read «smaller □ bigger» and the answer
 * would be «меньше» every time the numbers differed — which is rule four
 * again: an answer that can be given without looking at the numbers.
 */
function oriented(random: Random, a: number, b: number): ComparisonProblem {
  const swap = random() < 0.5
  const left = swap ? b : a
  const right = swap ? a : b

  return { left, right, answer: compare(left, right) }
}
