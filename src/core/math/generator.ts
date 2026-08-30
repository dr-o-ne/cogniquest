import type { Exercise, MathOp } from '../exercises'
import { randomInt, type Random } from '../random'
import { ArithmeticAnswer } from './ArithmeticAnswer'

export interface ArithmeticProblem {
  readonly terms: readonly number[]
  readonly ops: readonly MathOp[]
  readonly answer: number
  /**
   * Everything the child might plausibly say here, correct or not. The
   * recognition grammar is built from the whole of it (T16), and it travels
   * with the problem rather than being looked up by level number — a level
   * means «how hard», and only the generator knows what its answers can be.
   */
  readonly range: { readonly min: number; readonly max: number }
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
 *
 * The ladder adds exactly one new difficulty per step: size (1 to 2), place
 * value (2 to 3), how many terms (3 to 4), and finally a trick rather than a
 * size (4 to 5).
 */
export function generateProblem(levelId: number, random: Random): ArithmeticProblem {
  const plus = random() < 0.5

  switch (levelId) {
    case 1:
      return plus ? add(random, 0, 9, 10) : subtract(random, 1, 10)

    case 2:
      return plus ? addWithCarry(random) : subtractWithBorrow(random)

    case 3:
      return plus ? addByPlace(random) : subtractByPlace(random)

    case 4:
      return plus ? addAcrossPlace(random) : subtractAcrossPlace(random)

    case 5:
      return plus ? addWithGrouping(random) : subtractWithGrouping(random)

    default:
      throw new RangeError(`No generator for level ${levelId}`)
  }
}

export function createArithmeticExercise(levelId: number, random: Random): Exercise {
  const problem = generateProblem(levelId, random)

  return {
    // Identical problems get an identical id — the review queue rests on
    // exactly that (C3).
    id: `math:${describe(problem)}`,
    subject: 'math',
    level: levelId,
    prompt: { kind: 'arithmetic', terms: problem.terms, ops: problem.ops },
    answer: new ArithmeticAnswer(problem.answer, problem.range),
  }
}

/** «8-3+2» — for the id and for debugging. */
export function describe(problem: ArithmeticProblem): string {
  return problem.terms.reduce(
    (text, term, i) => (i === 0 ? `${term}` : `${text}${problem.ops[i - 1]}${term}`),
    '',
  )
}

/**
 * @param ceiling the highest answer this kind of problem can produce. Wrong
 * answers within reach of it are just as much part of the grammar as the right
 * one — a list of one word would be heard everywhere (T16).
 */
function problem(
  terms: readonly number[],
  ops: readonly MathOp[],
  ceiling: number,
): ArithmeticProblem {
  return { terms, ops, answer: evaluate(terms, ops), range: { min: 0, max: ceiling } }
}

/**
 * Level 4: two-digit numbers where the units overflow — «47 + 28».
 *
 * The central skill of the second year, and the one the ladder is built
 * towards: the units make more than ten, so a ten is carried into the column
 * beside it. Level 3 rules this out on purpose; here it is compulsory.
 */
function addAcrossPlace(random: Random): ArithmeticProblem {
  // Units are picked to overflow, tens to leave room for the ten that arrives.
  const leftUnits = randomInt(random, 1, 9)
  const rightUnits = randomInt(random, 10 - leftUnits, 9)
  const leftTens = randomInt(random, 1, 8)
  const rightTens = randomInt(random, 0, 8 - leftTens)

  return problem([leftTens * 10 + leftUnits, rightTens * 10 + rightUnits], ['+'], 100)
}

/**
 * Level 4 the other way — «63 − 27».
 *
 * The units above are too few, so a ten has to be broken open. The minuend
 * always has at least two tens, which keeps this clear of level 2, where the
 * same borrowing happens under twenty.
 */
function subtractAcrossPlace(random: Random): ArithmeticProblem {
  const leftUnits = randomInt(random, 0, 8)
  const rightUnits = randomInt(random, leftUnits + 1, 9)
  const leftTens = randomInt(random, 2, 9)
  // One ten goes to the units, so the subtrahend must leave at least that.
  const rightTens = randomInt(random, 0, leftTens - 1)

  return problem([leftTens * 10 + leftUnits, rightTens * 10 + rightUnits], ['-'], 100)
}

/** Level 1: a + b, where a ∈ [minLeft, maxLeft], b ≥ 1, sum ≤ ceiling. */
function add(random: Random, minLeft: number, maxLeft: number, ceiling: number): ArithmeticProblem {
  const left = randomInt(random, minLeft, maxLeft)
  const right = randomInt(random, 1, ceiling - left)
  return problem([left, right], ['+'], ceiling)
}

/** Level 1: a − b, where b ∈ [1, a]. */
function subtract(random: Random, minLeft: number, maxLeft: number): ArithmeticProblem {
  const left = randomInt(random, minLeft, maxLeft)
  const right = randomInt(random, 1, left)
  return problem([left, right], ['-'], maxLeft)
}

/** Level 2: the sum has to cross the ten — 8 + 5. */
function addWithCarry(random: Random): ArithmeticProblem {
  const left = randomInt(random, 2, 9)
  const right = randomInt(random, 11 - left, 9)
  return problem([left, right], ['+'], 20)
}

/** Level 2: the units fall short, so a ten has to be borrowed — 13 − 6. */
function subtractWithBorrow(random: Random): ArithmeticProblem {
  const right = randomInt(random, 2, 9)
  const answer = randomInt(random, 11 - right, 9)
  return problem([answer + right, right], ['-'], 20)
}

/**
 * Level 3: up to a hundred, digit by digit, with nothing carried over.
 *
 * Units are given room for each other and so are tens — that is precisely what
 * «no carrying» means. Round tens (`30 + 40`) are the case where both units
 * happen to be zero, which is why they are no longer a level of their own.
 */
function addByPlace(random: Random): ArithmeticProblem {
  const leftUnits = randomInt(random, 0, 8)
  const rightUnits = randomInt(random, 0, 9 - leftUnits)
  const leftTens = randomInt(random, 1, 8)
  // The second operand must not come out as zero, so with no units it needs tens.
  const rightTens = randomInt(random, rightUnits === 0 ? 1 : 0, 9 - leftTens)

  return problem([leftTens * 10 + leftUnits, rightTens * 10 + rightUnits], ['+'], 100)
}

/** Level 3: the mirror image — every digit of the subtrahend fits under its own. */
function subtractByPlace(random: Random): ArithmeticProblem {
  const leftTens = randomInt(random, 1, 9)
  const leftUnits = randomInt(random, 0, 9)
  // Same rule as above, read from the other end: no zero subtrahend.
  const rightTens = randomInt(random, leftUnits === 0 ? 1 : 0, leftTens)
  const rightUnits =
    rightTens === 0 ? randomInt(random, 1, leftUnits) : randomInt(random, 0, leftUnits)

  return problem([leftTens * 10 + leftUnits, rightTens * 10 + rightUnits], ['-'], 100)
}

/**
 * Level 5: three numbers, two of them with units that complete each other to
 * ten, and those two are kept apart — «47 + 19 + 3».
 *
 * Head-on this is level 4 twice over: three two-digit numbers with a carry at
 * every step. Notice that 47 and 3 make 50 and it turns into one easy sum.
 *
 * The size of the numbers is the point, not an accident. An earlier version
 * built this rung out of digits — «7 + 8 + 3» — and it came out easier than
 * level 4, because a trick that shortens an easy sum saves nothing. A rung
 * where insight is the difficulty still has to sit above the one below it.
 */
function addWithGrouping(random: Random): ArithmeticProblem {
  const leftUnits = randomInt(random, 1, 9)
  const rightUnits = 10 - leftUnits

  // At least one of the pair carries tens: a trick that shortens «7 + 8 + 3»
  // saves nothing, because the long way round was easy anyway.
  const tensTogether = randomInt(random, 1, 8)
  const leftTens = randomInt(random, 0, tensTogether)
  const left = leftTens * 10 + leftUnits
  const right = (tensTogether - leftTens) * 10 + rightUnits

  // The term in between must not complete a ten with either of the pair —
  // a second pair on the board would hand the trick away.
  const pair = left + right
  const candidates: number[] = []
  for (let n = 1; n <= 100 - pair; n++) {
    const digit = n % 10
    if (digit !== leftUnits && digit !== rightUnits) candidates.push(n)
  }
  const other = candidates[randomInt(random, 0, candidates.length - 1)]!

  // The pair straddles the odd term; side by side there would be nothing to spot.
  const terms = random() < 0.5 ? [left, other, right] : [right, other, left]

  return problem(terms, ['+', '+'], 100)
}

/**
 * Level 5 read backwards: two subtractions that are really one.
 *
 * «83 − 27 − 3» can be taken one step at a time, both times across the place,
 * or the 27 and the 3 can be seen to make 30 and taken in a single move. Here
 * the pair stands together on purpose — combining two subtractions is the
 * whole insight, and there is nothing to gain by hiding them from each other.
 */
function subtractWithGrouping(random: Random): ArithmeticProblem {
  const firstUnits = randomInt(random, 1, 9)
  const secondUnits = 10 - firstUnits

  const tensTogether = randomInt(random, 0, 8)
  const firstTens = randomInt(random, 0, tensTogether)
  const first = firstTens * 10 + firstUnits
  const second = (tensTogether - firstTens) * 10 + secondUnits

  const taken = first + second
  const total = randomInt(random, taken, 99)

  return problem([total, first, second], ['-', '-'], 100)
}
