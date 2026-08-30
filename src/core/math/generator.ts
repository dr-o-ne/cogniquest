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
      return chainByPlace(random, 3)

    case 5:
      return addWithGrouping(random)

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
 * Level 4: more numbers, and that is the only new thing about it.
 *
 * The child works «20 + 30 + 7» out step by step while holding a running
 * total, which is hard enough on its own. So every step still touches one
 * place at a time — a round ten or a single digit — and nothing is ever
 * carried or borrowed on the way. Arbitrary two-digit chains like
 * «55 − 23 − 29» would pile three new difficulties onto one step of the
 * ladder.
 */
function chainByPlace(random: Random, termCount: number): ArithmeticProblem {
  let tens = randomInt(random, 1, 8)
  let units = randomInt(random, 0, 9)

  const terms: number[] = [tens * 10 + units]
  const ops: MathOp[] = []

  for (let i = 1; i < termCount; i++) {
    // Which place a step touches, and which way it goes, is decided by the room
    // there is — which is exactly what keeps every step free of carrying.
    const moves: { place: 'tens' | 'units'; op: MathOp; steps: number }[] = []
    if (tens < 9) moves.push({ place: 'tens', op: '+', steps: randomInt(random, 1, 9 - tens) })
    if (tens > 0) moves.push({ place: 'tens', op: '-', steps: randomInt(random, 1, tens) })
    if (units < 9) moves.push({ place: 'units', op: '+', steps: randomInt(random, 1, 9 - units) })
    if (units > 0) moves.push({ place: 'units', op: '-', steps: randomInt(random, 1, units) })

    const move = moves[randomInt(random, 0, moves.length - 1)]!
    const delta = move.op === '+' ? move.steps : -move.steps

    if (move.place === 'tens') tens += delta
    else units += delta

    ops.push(move.op)
    terms.push(move.place === 'tens' ? move.steps * 10 : move.steps)
  }

  return problem(terms, ops, 100)
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
 * Level 5: two of the three terms make a round ten, and they are deliberately
 * kept apart — «7 + 8 + 3».
 *
 * Head-on it is three additions across the ten. Spot that 7 and 3 make ten and
 * it collapses into one. The difficulty is in seeing the pair, not in the size
 * of the numbers, which is what makes it the olympiad-flavoured step.
 */
function addWithGrouping(random: Random): ArithmeticProblem {
  const first = randomInt(random, 1, 9)
  const partner = 10 - first

  // The third term is either a digit or a round ten, so totals run 11 to 90.
  // A digit that would make ten with either neighbour is excluded: that would
  // put a second, adjacent pair on the board and hand the trick away.
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => d !== first && d !== partner)
  const other =
    random() < 0.5 ? digits[randomInt(random, 0, digits.length - 1)]! : randomInt(random, 1, 8) * 10
  // The pair straddles the odd term; side by side there would be nothing to spot.
  const terms = random() < 0.5 ? [first, other, partner] : [partner, other, first]

  return problem(terms, ['+', '+'], 100)
}
